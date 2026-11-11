# spec 字段说明

一份 spec 是 YAML（或 JSON）对象。顶层字段：

| 字段 | 必填 | 说明 |
|---|---|---|
| `spec` | 否 | 版本号，当前固定 `1`，用于以后兼容 |
| `meta` | 是 | 图型、标题、主题等页面级设置 |
| `nodes` | 视图型 | 系统 / 模块节点（system-interaction） |
| `links` | 否 | 节点或层之间的关系 |
| `groups` | 否 | 分组与一对多展开 |
| `layers` | 视图型 | 分层结构（layered-architecture） |
| `steps` | 视图型 | 线性步骤（flow） |
| `matrix` | 视图型 | 矩阵数据（matrix） |
| `constraints` | 否 | 业务约束，用于防止画错 |
| `notes` | 否 | 页脚注释 |
| `layout_overrides` | 否 | 像素级精修，只在你需要时才写 |

## meta

| 字段 | 默认 | 说明 |
|---|---|---|
| `layout` | 必填 | `system-interaction` / `layered-architecture` / `flow` / `matrix` |
| `title` | — | 主标题，27 pt；放不下会自动降到 24/21/18，始终单行不折行；不填则不画页眉 |
| `eyebrow` | — | 标题上方的小标签，如 `系统对接 · 数据流转` |
| `subtitle` | — | 副标题一行 |
| `theme` | `corporate-blue` | 8 套主题，见 design-tokens.md；换风格只改这一行 |
| `palette` | — | 局部改色覆盖，如 `{ primary: "#C0392B", bg: "#FFFFFF" }` |
| `accent` | `blue` | 页眉装饰条颜色 |
| `autoNumberLinks` | `false` | 链路说明自动加 ①②③ |
| `autoNumberSteps` | `false` | flow 步骤自动加序号角标 |
| `loopChip` | — | 闭环中心的胶囊文字，如 `数据闭环` |
| `nodesY` | 自动 | system-interaction 节点行的顶部 y |
| `stepsY` | 自动 | flow 步骤行的顶部 y |
| `rowTrack` | `true` | layered 是否绘制整行底板 |
| `font` | 按平台 | 覆盖 PPT 字体名 |

## nodes

```yaml
nodes:
  - { id: his, label: 新益华 HIS, desc: 业务数据源系统, shape: cloud, accent: blue }
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | 是 | 唯一标识，links 用它引用 |
| `label` | 是 | 主文字 |
| `desc` | 否 | 副文字，灰色小一号 |
| `shape` | 否 | `cloud`（默认）或 `card`（圆角矩形） |
| `accent` | 否 | 默认 `blue` |

## links

```yaml
links:
  - { from: his, to: qc, label: 推送医嘱、费用, accent: blue }
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `from` / `to` | 是 | 节点 id（layered 里是 layer id） |
| `label` | 否 | 链路说明；开了 autoNumberLinks 会自动加序号 |
| `accent` | 否 | 默认：左→右 blue，右→左 teal |
| `weight` | 否 | `primary` / `secondary`，当前仅用于语义标注 |

**两个节点之间同时存在 A→B 和 B→A 时，自动渲染为椭圆闭环**，不需要额外字段。

## groups

```yaml
groups:
  - id: clinics
    mode: fanout
    anchor: his
    bidirectional: true
    items: [卫生院 1, 卫生院 2, 卫生院 3, ……]
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | 是 | 分组标识，可被 constraints 引用 |
| `mode` | 是 | `fanout`（一对多展开）。`container` 规划中，暂不支持 |
| `anchor` | fanout 必填 | 从哪个节点展开 |
| `items` | fanout 必填 | 子项文字数组，自动生成胶囊 |
| `bidirectional` | 否 | 是否双向箭头（数据互通时用） |
| `accent` | 否 | 默认 `slate` |
| `label` | 否 | 分组说明，渲染在胶囊行下方 |

## constraints

```yaml
constraints:
  - { type: not_direct, between: [qc, clinics], reason: 所有数据均经 HIS 中转 }
```

`type: not_direct` 表示 `between` 两方不应直连。如果 `links` 里出现该连线，渲染直接报错并带上 `reason`。

这是刻意设计的**硬拦截**：模型容易「顺手」补一条看起来合理的连线，约束就是用来挡住它的。

## notes

```yaml
notes:
  - text: 注：医保质控系统不与基层医疗机构直接交互。
    align: right
```

`align` 取 `left`（默认）或 `right`。也允许直接写字符串数组：`notes: ["注：…"]`。

注释按实际折行行数自下而上堆叠，不会和图形底部重叠。

## 规模上限

超过上限会直接报错并说明原因，而不是画出一张重叠的图：

| 布局 | 上限 |
|---|---|
| system-interaction | 节点 ≤ 3；单个扇出分组子项 ≤ 12 |
| layered-architecture | 层 ≤ 7；每层组件 ≤ 12 |
| flow | 步骤 ≤ 6 |
| matrix | 列 ≤ 8；行 ≤ 10 |

## layout_overrides

只在自动布局达不到要求时使用。写了就完全接管该元素坐标，单位英寸。

```yaml
layout_overrides:
  nodes:
    his: { x: 1.20, y: 3.05, w: 3.30, h: 1.85 }
```

**优先改模板的布局算法，而不是堆 overrides**——overrides 多了，spec 就退化成脚本，换一张图时无法复用。
