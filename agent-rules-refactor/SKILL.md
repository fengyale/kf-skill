---
name: agent-rules-refactor
description: Use when a project's Agent rule files (global USER_RULES, project AGENTS.md, .trae/.cursor/.qoder rules directories, CLAUDE.md, docs/编码规范) have grown redundant, over-injected, internally conflicting, or drift-prone. Symptoms — "规则太多每次注入很占上下文", "同一份内容 .trae 和 .qoder 各存一份", "always_on 里塞了低频细则", "版本快照和真源漂移", "两条规则口径矛盾没写边界". Also for greenfield rule-system setup. Not for one-off rule edits.
---

# Agent 规则文件重构

## Overview

多层次 Agent 规则文件出现重复、臃肿、加载机制不统一或内容漂移时，按 5 步方法论一次收敛到「单一真源 + 按需触发 + 边界清晰」的架构。核心原则：**每条规则有且只有一个物理去处；低频细则靠 `trigger: model_decision`，不常驻 always_on**。

## When to Use

- 项目同时存在 `AGENTS.md` + 全局 `USER_RULES.md` + `.trae/rules/` + `.qoder/rules/` + `docs/*.md`，条目互相重复
- always_on 文件膨胀（经验值 > 10 KB 或 > 200 行），做日常 CRUD 时被塞进大量无关细则
- 版本快照、模型名、本机路径等易漂移内容缺"核对日期"或"本机专属"提示
- 同一话题两处口径不一致且无适用边界（如"Properties 不做默认值"vs"env 变量带默认值"）
- 新项目从零搭建规则体系

**不适用**：单条规则小改（直接编辑）；纯代码规范调整（走项目编码规范）。

## 5 步 Quick Reference

| 步 | 动作 | 关键工具 / 判据 |
|----|------|-----------------|
| 1 侦察 | 枚举所有规则文件 + Junction + 加载方 | `Get-Item ... \| Select LinkType, Target` |
| 2 诊断 | 逐条 bullet 建"覆盖矩阵"，找重复 / 张力 | 见 [reference.md](reference.md) §Step 2 |
| 3 分层 | L1 全局 / L2 always_on 架构 / L2 model_decision 细则 / L3 项目操作 / L4 深度规范 | frontmatter 双写 `alwaysApply + trigger` |
| 4 边界 | 给漂移风险与冲突条目加真源锚点 / 适用边界 / 本机专属警示 | 4 个模板见 reference.md §Step 4 |
| 5 核对 | 反向 grep 每条关键锚点，确保唯一去处 | PowerShell 脚本见 reference.md §Step 5 |

**动手前务必先读** [reference.md](reference.md)：详解、常见坑表、输出模板、新项目骨架都在里面。

## Red Flags — STOP

- 没做 Step 1 就动笔 → 会把 Junction 镜像误拆成两份，出现"指针指向自己"死循环
- model_decision 只写 `trigger:` 不写 `alwaysApply:` → Trae / Cursor 团队丢规则
- description 太模糊或写成"做什么"（而非"何时用"）→ 永不触发加载 / Claude 只看描述不读 body
- 拆条目时只搬主句、丢掉旁边的例子 / 坑说明 → 语义丢失
- Step 5 未跑就交付 → 大概率有漏项，用户第一遍用就会投诉

## Common Mistakes

| 错法 | 对策 |
|------|------|
| 把 always_on 只当"精简版"，还留 200 行 | 只有"每次编码都用得上"才留，其余一律 model_decision |
| 删旧文件后不验证 Junction 完整性 | Step 5 后 `Get-Item ... LinkType` 复查 |
| `.gitignore` 意外排除 `.qoder/` | 交付前 `git check-ignore -v` 逐条确认 |
| 引用其他 Skill 用 `@path` 强加载 | 用文字 `**REQUIRED:** skill-name` 引用 |
