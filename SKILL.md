---
name: ppt-diagram-craft
description: Generate polished 16-9 diagram figures for slides from a YAML spec, covering system interaction, layered architecture, flow and matrix layouts, and export SVG, PNG and PPTX. Use when the user asks for a 配图 示意图 架构图 or 流程图 for a deck, or hands over a hand-drawn sketch to reproduce. Do not use for bar line pie data charts or web pages.
---

# PPT Diagram Craft

把业务描述或手绘图，转成一张风格统一的 16:9 配图，并同时产出 SVG / PNG / PPTX。

## 何时用

- 用户要「做一张配图 / 示意图 / 架构图 / 流程图 / 闭环图」放进 PPT
- 用户丢来一张手绘草图、截图、别人的图，要复刻成干净版本
- 需要多张图保持同一套配色与版式

## 何时不用

- 数据统计图（柱状 / 折线 / 饼图）→ 用 chart-visualization
- 网页、报告页面、交互原型 → 用 html-report / prototype craft
- 纯粹插图、海报视觉 → 用 canvas-design

## 流程（必须按顺序）

### 1. 判定图型

| 用户描述的特征 | layout |
|---|---|
| 两个及以上系统 / 模块之间的数据流向、接口、双向闭环 | `system-interaction` |
| 「分层」「自上而下」「平台架构」 | `layered-architecture` |
| 「第一步、然后、最后」线性步骤 | `flow` |
| 「现状 vs 目标」「按维度对比」 | `matrix` |

判断不了就问一句，不要猜。

### 2. 抽出结构

从输入里只抽这五类信息，不要加戏：

- **节点**：id、名称、一句补充说明
- **关系**：谁指向谁、是否双向、说明文字
- **分组**：一对多展开（fanout）还是框住已有节点（container）
- **约束**：用户明确说的「A 不直连 C」这类规则，写进 `constraints`
- **强调**：标题、副标题、页脚注释

手绘图复刻时，逐个元素映射：云/圆角框 → node，箭头 → link，底部一排小圆 → fanout 的 items。

### 3. 写 spec

复制 `examples/` 下最接近的一份改，不要从零写。字段含义见 `references/spec-schema.md`。

只写业务语义，**不要写坐标**。坐标只在需要像素级精修时才放进 `layout_overrides`。

### 4. 渲染

```bash
node scripts/render.js <spec.yaml> --out <输出目录> [--formats svg,png,pptx]
```

默认三种格式全出。首次运行会自动把依赖装到技能目录（需联网）。

### 5. 看图（不可跳过）

**必须打开渲染出的 PNG 逐项检查**，不要凭代码推断：

- [ ] 文字有没有压线、压卡片、出画布
- [ ] 箭头方向是否与业务一致（尤其双向、回传）
- [ ] 两个相邻元素是否粘连（闭环两条弧、分支曲线根部）
- [ ] 有没有该出现却缺失的图形（云没画出来、标签被盖住）
- [ ] 底部注释是否折行错位

发现问题就改 spec 或模板后重渲染，直到图能看。**没看过图的交付等于没做。**

### 6. 交付

给出三件套路径并说明取舍：PPTX 里图形是图片层、文字是原生文本框（可改字改字号）；要改图形颜色就改 spec 的 `theme` / `accent` 重渲染。

## 硬约束

- 画布固定 16:9（13.333 × 7.5 英寸），不要自行改成 4:3
- 字号只用 `P.T` 里的阶梯：27 / 20 / 12 / 11 / 10.5 / 9（主标题放不下会自动降档）
- 颜色只用主题里的 accent（blue / teal / amber / violet / slate），写错会报错并列出可选值
- 每个布局有规模上限（system-interaction ≤ 3 节点、flow ≤ 6 步、layered ≤ 7 层、matrix ≤ 8 列），超了会明确报错，不要绕过
- `constraints` 里声明不直连的两方，如果 links 里出现了连线，渲染会直接报错——这是刻意设计的，不要绕过
- 字体按系统自动回退（微软雅黑 / 苹方 / Noto）；要覆盖用 `meta.font`

## 换风格

- **整套换**：改 `meta.theme`，8 套可选（corporate-blue / consulting-navy / gov-red / tech-dark / minimal-ink / ant-blue / finance-green / warm-sand），不要改模板里的颜色
- **局部对齐品牌色**：`meta.palette: { primary: "#C0392B", secondary: "#C9A227" }`
- 用户只说「高级一点」「科技感一点」时，**先要参照物或色值**（一句「参照 XX 官网 / 主色 #xxxxxx」即可），不要凭形容词猜配色

## 降级链

`pptx → png → svg`。sharp 装不上时只出 SVG，此时告知用户：在 PPT 里「插入图片」选 SVG，右键「转换为形状」后同样可编辑。

## 参考

- `references/design-tokens.md` — 栅格、字号、配色、线宽、圆角、投影
- `references/spec-schema.md` — spec 全部字段
- `references/diagram-types.md` — 四种布局的数据结构与选用规则
- `examples/` — 四种布局各一份可直接运行的样例
