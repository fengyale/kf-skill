# Reference — Agent 规则文件重构详解

主入口见 [SKILL.md](SKILL.md)。本文件承载 5 步方法论的完整展开、诊断模板、命令脚本与新项目骨架。

---

## Step 1 侦察（Locate & Inventory）

在动任何文件之前先把**规则载体全景图**列清楚。

### 侦查命令

```powershell
# 列出所有规则文件与 Junction 状态
$roots = @(
  "$env:USERPROFILE\.qoder-cn\rules",
  "$env:USERPROFILE\.claude\rules",
  "<project-root>\.qoder",
  "<project-root>\.trae",
  "<project-root>\.cursor",
  "<project-root>\AGENTS.md",
  "<project-root>\CLAUDE.md"
)
Get-ChildItem -Force -Recurse -Include "*.md","*.mdc" $roots -ErrorAction SilentlyContinue |
  Select-Object FullName, Length, LastWriteTime

# 关键：识别 Junction，避免误拆同一份物理文件
Get-Item "<project-root>\.qoder\rules","<project-root>\.trae\rules" |
  Select-Object FullName, LinkType, Target | Format-List
```

### 记录清单（每一项都要标注）

- 物理路径 + 字节数
- frontmatter 类型：`alwaysApply` / `trigger` / `description`
- **谁在加载它**（Qoder → `.qoder/rules`；Trae → `.trae/rules`；Cursor → `.cursor/rules`；Claude Code → `~/.claude/rules` + `CLAUDE.md`；Codex / 通用工具 → 根 `AGENTS.md`）
- **是否为 Junction**（`LinkType` 字段）

### 常见发现模式

| 现象 | 结论 |
|------|------|
| `.qoder/rules` 与 `.trae/rules` 都是同一目录 | Junction 镜像，改一处即两处生效，**不要拆两份** |
| `AGENTS.md` 与 `.qoder/rules/xxx.md` 内容重叠 | 两份都是 always_on 会被双注入，需按 L2 / L3 分层 |
| `~/.qoder-cn/rules/USER_RULES.md` 与项目内 `AGENTS.md` 同条目 | L1 全局保留，L3 项目删除并留一行"见全局"指针 |

---

## Step 2 诊断（Mapping & Tension Analysis）

### 覆盖矩阵模板

对每份文件的**顶层节 + 具体条目**逐行映射，产出下表示例：

| 条目 | USER_RULES | AGENTS.md | project_rules | 编码规范.md | 判定 |
|------|:---:|:---:|:---:|:---:|------|
| First→YAGNI→KISS 原则 | ✓ 详 | ✓ 简 | — | — | 重复 → 保留全局，删项目 |
| Maven `-q` 建议 | ✓ | ✓ | — | — | 重复 → 保留全局，删项目 |
| Spring Boot 版本号 | — | — | ✓ 快照 | — | 唯一 → 加真源指针（Step 4） |
| Properties 不做默认值 | — | ✓ | — | ✓ | 与 compose 层默认值冲突 → 加边界（Step 4） |
| Grafana 看板 uid 禁改 | — | — | ✓ always_on | — | 低频 → 挪 model_decision（Step 3） |

从矩阵直接得出**「删哪些 / 留哪些 / 拆哪些 / 加边界」**四组动作清单。

### 平行路径陷阱（复用 USER_RULES 五.分析方法论）

从每份文件的**顶层节 → 每一条 bullet** 逐条追踪到"去处"，禁止用「关键字搜到了 = 覆盖完整」的存在性搜索下结论。**必须做请求路径追踪**：一个条目从它在旧文件里的位置，追到新文件里的对应位置。

---

## Step 3 分层重组（Restructure by Trigger）

### 四层责任边界

| 层级 | 位置 | 触发 | 承载内容 |
|------|------|------|----------|
| **L1 全局通用** | `~/.qoder-cn/rules/USER_RULES.md`（或对应 IDE 全局） | always_on | 跨项目开发原则、命令通用规范、审查 / 联网 / 分析方法论、知识沉淀 |
| **L2 项目架构** | `<project>/.qoder/rules/project_rules.md` | always_on | 技术栈、调用路径、缓存 / 安全 / 监控等**高频核心** |
| **L2 项目细则** | `<project>/.qoder/rules/<subsystem>-details.md` | model_decision | 低频落地细则（看板 / 容器 / 评估 / 特殊子系统） |
| **L3 项目操作** | `<project>/AGENTS.md` | 显式加载 | 项目 + 本机专属：命名 / 分包、常用命令、部署脚本、代理与工具路径 |
| **L4 深度规范** | `<project>/docs/*.md` | 按需 Read | 分层判据、编码细节、历史决策 |

### 拆分原则（always_on → model_decision）

- 只有当**修改对应子系统**时才用得上 → model_decision
- 每次编码都需要遵守的公约（命名 / 日志格式 / 缓存规范） → 留 always_on
- **一年用不到 3 次的一律 model_decision**

### description 写法（触发靠它）

必须写清「什么动作 / 什么文件被改时触发」，用具体动词 + 文件路径 + 场景清单：

```yaml
# ✅ Good
description: 修改 Dockerfile、docker-compose.yml、部署编排、多环境 Profile、
             容器内存限制，或排查镜像构建/容器 OOM 问题时必须加载。
             含镜像构建、编排、容器内存成对配置、多环境配置全量细则。

# ❌ Bad — 太抽象，永远不会被选中
description: 容器化部署相关规则
```

### frontmatter 双兼容（跨 IDE）

```yaml
---
alwaysApply: false      # Trae 认这个
trigger: model_decision # Qoder 认这个
description: ...
---
```

always_on 同理，`alwaysApply: true` + `trigger: always_on`。**同时写两套字段**，未识别的一方会忽略，识别的一方正常工作。

---

## Step 4 边界修正（Fix Tensions）

对 Step 2 找出的每一条"张力"或"漂移风险"，套以下 4 个模板之一：

### 模板 A — 真源锚点（版本 / 模型 / 配置快照）

> 版本快照核对日期 YYYY-MM-DD。真源为 `pom.xml` / `application.yml` / `docker-compose.yml`；本节不作为逐次核对依据，涉及兼容性时回查真源。

### 模板 B — 适用边界（口径冲突）

> **规则本体**：xxx  
> 边界：本条仅约束 A 场景；B / C 场景属于「xxx」，不在此列，允许 / 推荐 zzz

**实例**：`Properties 类不做默认值兜底` + `compose 环境变量带默认值` 冲突时：

> **可调参数一律放 `application.yml`，`@ConfigurationProperties` 类不做默认值兜底**  
> 边界：仅约束 Spring `@ConfigurationProperties`；yml 内部 profile 表达式默认值（`${SPRING_PROFILES_ACTIVE:local}`）与 `.env` 变量默认值（`${APP_MEM_LIMIT:-1g}`）属于「环境兜底」，允许并推荐

### 模板 C — 本机专属警示

> 以下路径、端口、进程名仅在当前 Windows 开发机有效。他人接手或换机器时先按「侦查命令」确认再使用，不要盲目照抄。

### 模板 D — 工具行为提示

> 同文件二次 Edit 前 Write 全文件  
> 边界：仅适用于已完整 Read 且体量 < 400 行的文件；大文件继续用 SearchReplace 精准定位

---

## Step 5 覆盖核对（Verify no omissions）

**关键交付标准：用户最怕"改着改着某条规则丢了"。**

### 反向 grep 脚本

```powershell
# 从旧版文件提取所有"关键锚点短语"（每条规则的核心标识词）
$anchors = @(
  'or vector\(0\)','uid 禁止修改','mem_reservation','mem_limit',
  'avgSkipNaN','benchmarkGroup','MaxRAMPercentage','extra_hosts',
  'spring-aspects','aspectjweaver','QUOTE_NON_NUMERIC_NUMBERS'
  # ... 每条原规则至少一个锚点
)

# 对每个锚点在新版规则目录做 grep，确认有且只有一个去处
$anchors | ForEach-Object {
  $hits = Get-ChildItem "<new-rules-dir>" -Recurse -File |
          Select-String -Pattern $_
  "[$_] -> " + (($hits | ForEach-Object {
      Split-Path $_.Path -Leaf } | Sort-Object -Unique) -join ', ')
}
```

**任何锚点显示 `-> `（空）都必须回去补上或明确说明为何删除。**

### 交付前二次核对

- `.gitignore` / `.dockerignore` 是否意外排除了新规则目录：`git check-ignore -v <file>`
- Junction 是否被 Write 操作打断：`Get-Item ... | Select LinkType` 复查
- always_on 主文件头部的"必读文档路由表"是否指向了新的子文件
- 旧的 `always_on` 大文件里的每一条顶级节，在新架构里必须有明确去处（保留 / 拆分 / 移到他处），禁止静默消失

---

## 常见坑表（完整版）

| 坑 | 表现 | 对策 |
|----|------|------|
| **误拆 Junction** | 以为 `.qoder` 和 `.trae` 是两份，各写各的 → 覆盖成"瘦指针指向自己"的死循环 | Step 1 必先 `Get-Item ... LinkType` 确认 |
| **model_decision 只有 Qoder 认** | Trae / Cursor 打开时把 `trigger:` 文件当普通 md 忽略 → 团队其他人丢规则 | frontmatter 双写：`alwaysApply: false` + `trigger: model_decision` |
| **description 太模糊** | 写成"重要规则""细节说明" → 模型判断不出何时触发，永远不加载 | 用具体动词 + 文件路径 + 场景清单 |
| **description 混入 workflow 摘要** | Claude 只看 description 就以为懂了，跳过 body | description 只写「何时用」，不写「做什么 / 产出什么」 |
| **删条目时把注释性说明也删了** | 一条规则原本靠旁边的例子 / 坑说明才讲得清，只搬主句 → 语义丢失 | 每次搬条目把上下文（示例、坑说明）整块带走 |
| **旧目录留了残留文件** | 从 `.trae/rules/xxx.md` 拆走后没删，Junction 下看似同步，其实是被覆盖 | Step 5 核对完做一次 `ls`，确认无孤儿文件 |
| **always_on 减不下来** | 舍不得拆低频内容，只是把重复条目删了 | 按"什么时候用得上"分类，一年用不到 3 次的一律 model_decision |
| **Write 全量重写大文件** | 用 Write 覆盖 > 400 行文件，导致未读到的部分丢失 | 大文件坚持 SearchReplace；Write 只用于新文件 / 已完整读过的小文件 |

---

## 输出模板（交付给用户的总结报告结构）

```
## 变更总结

### ① 全局 vs 项目去重
- 全局 X 文件：结构调整 / 保留完整 / 修正条目 Y
- 项目 Y 文件：行数 A → B，删除与全局重复的 N 条

### ② always_on 瘦身
- 主文件字节 A → B
- 拆出 K 个 model_decision 子文件到 <目录>

### ③ 加载源统一
- 侦察结论（Junction / 各工具实际读取路径）
- 采用的双兼容 frontmatter 方案

### ④ 版本快照锚点
- 加了真源指向的文件与位置

### ⑤ 张力条目边界
- 逐条列出加了边界的规则及边界内容

### 交付前自查
- ✅ 无漏项（附锚点映射表）
- ✅ .gitignore / Junction 未破坏
- ✅ 是否触发代码审查（纯 md 变更不触发）
```

---

## 新项目快速启动清单

若目标项目**当前只有一份 `AGENTS.md`**（尚未膨胀），用以下最小骨架预防劣化：

```
<project>/
├── AGENTS.md                    # 项目 + 本机专属，显式加载
├── .qoder/rules/
│   ├── project_rules.md         # 架构 always_on
│   ├── dashboard-maintenance.md # model_decision
│   └── <subsystem>-details.md   # 每类低频细则一个
└── docs/
    └── <深度规范>.md            # 按需 Read
```

### 建 Trae 兼容 Junction

```powershell
# 永远先建 Junction 再写文件，避免两边各写一份产生分裂
New-Item -ItemType Junction `
  -Path "<project>\.trae\rules" `
  -Target "..\.qoder\rules"
```

对 `.cursor` / `.claude` 同理，各建一个 Junction 指向 `.qoder/rules`。真源永远只有一份。

---

## 复盘要点

一次成功的规则重构应当让下一次同类任务**只跑 Step 1 → Step 5 一遍成型**，不需要来回修补。若发现某一步反复返工，把返工原因写进本文件的"常见坑表"，持续迭代。

**Skill 自身维护规则**（对齐 `USER_RULES.md` 六.知识沉淀）：同一坑第 3 次出现 → 补进常见坑表；新的分层模式（如引入 Glob trigger）验证后补进 Step 3。
