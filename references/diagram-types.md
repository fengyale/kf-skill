# 四种布局的数据结构

## system-interaction — 系统交互

**用来表达**：系统之间谁给谁传什么、是否双向、某个系统是否作为汇聚点连向多个下级。

**结构**：

```yaml
meta: { layout: system-interaction, loopChip: 数据闭环, autoNumberLinks: true }
nodes:
  - { id: his, label: 新益华 HIS, desc: 业务数据源系统, shape: cloud, accent: blue }
  - { id: qc,  label: 医保质控系统, desc: 规则校验引擎, shape: cloud, accent: teal }
links:
  - { from: his, to: qc, label: 推送医嘱、费用, accent: blue }
  - { from: qc, to: his, label: 回传规则校验结果, accent: teal }
groups:
  - { id: clinics, mode: fanout, anchor: his, bidirectional: true, items: [卫生院 1, 卫生院 2] }
```

**布局规则**：

- 2 个节点时贴左右两边放（中间留出画弧空间）
- 3 个及以上沿宽度均匀分布
- 双向成对的链路自动画成上下两条 180° 弧，端点错开 0.14 in
- 单向链路画一条微拱曲线，标签在弧顶上方
- fanout 的胶囊行居中于锚点，越界时自动左对齐收进边距

**别用它的场景**：超过 3 个系统互相连线（渲染会直接报错），应改成分层或拆图。

## layered-architecture — 分层架构

**用来表达**：一个平台的层次划分，以及层与层之间的调用方向。

**结构**：

```yaml
meta: { layout: layered-architecture }
layers:
  - { id: portal, label: 门户层, accent: violet, items: [医保工作台, 质控看板] }
  - { id: app,    label: 应用层, accent: blue,   items: [病历质控, 规则中心] }
  - { id: engine, label: 引擎层, accent: teal,   items: [规则引擎, 知识库] }
links:
  - { from: engine, to: app }        # 相邻层之间的箭头
```

**布局规则**：

- 每层一条横向底板（`meta.rowTrack: false` 可关）
- 层名色块在左，组件卡片在右，卡片按数量均分可用宽度（最宽 3.2 in）
- 层间箭头画在两层的空隙里，默认 x = 6.65，可用 `links[].x` 改
- 只支持**相邻层**之间的箭头；跨层依赖请拆成相邻层链路，或直接在文案里说明
- 层数建议 3–5 层，超过 7 层会报错

**别用它的场景**：层内组件有横向调用关系（分层图表达不了，改用 system-interaction）。

## flow — 流程 / 时序

**用来表达**：一条线性的处理链路，3–6 步最合适。

**结构**：

```yaml
meta: { layout: flow, autoNumberSteps: true }
steps:
  - { label: 医嘱开立, desc: 医生站录入 }
  - { label: 费用上传, desc: HIS 实时接口 }
```

**布局规则**：

- 单行横向排列，垂直居中于内容区
- 卡片宽度按步骤数自适应，最宽 2.6 in
- 默认 blue / teal 交替配色；要统一或特例就写 `steps[].accent`
- 超过 6 步直接报错——这是刻意限制，因为一行放 7 个以上必然过挤

**别用它的场景**：有分支或回退的流程。当前不支持分支，需要时用 matrix 或拆成两行文本说明。

## matrix — 能力矩阵 / 对比

**用来表达**：两个维度交叉的对比，如「现状 / 一期 / 二期」× 「数据 / 质控 / 分析」。

**结构**：

```yaml
meta: { layout: matrix }
matrix:
  cols: [数据接入, 质控能力, 分析决策]
  rows:
    - { label: 现状, accent: slate }
    - { label: 一期目标, accent: blue }
  cells:
    - - { text: 手工导入 }
      - { text: 事后抽查 }
      - { text: 月度报表 }
    - - { text: HIS 实时对接, accent: blue }
      - { text: 全量规则校验, accent: blue }
      - { text: 指标看板, accent: blue }
```

**布局规则**：

- 单元格继承行的 accent，每个 cell 可单独覆盖
- 单元格高度上限 1.70 in，行数多时自动压缩
- 单元格留空（`null`）就不画，用来表示「暂无」

**别用它的场景**：维度值需要连续数值（那是热力图/散点，不是这张）。
