# PPT Diagram Craft

把业务描述或手绘图，转成一张风格统一的 16:9 配图，一次产出 SVG / PNG / PPTX。

写一份 YAML spec，四种布局任选；配色、字号、间距由内置设计规范统一约束，多张图不会各画各的。它只画示意图，不做柱状 / 折线 / 饼图这类数据图表。

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 四种布局

| layout | 适合画什么 | 规模上限 |
| --- | --- | --- |
| `system-interaction` | 两个及以上系统 / 模块之间的数据流向、接口、双向闭环 | 3 节点 |
| `layered-architecture` | 「分层」「自上而下」「平台架构」 | 7 层 |
| `flow` | 「第一步、然后、最后」的线性步骤 | 6 步 |
| `matrix` | 「现状 vs 目标」「按维度对比」 | 8 列 |

## 快速开始

```bash
git clone https://github.com/fengyale/kf-skill.git
cd kf-skill/ppt-diagram-craft
node scripts/render.js examples/system-interaction.yaml --out out
```

输出目录会得到同名的 `.svg`、`.png`、`.pptx`。首次运行会把依赖（js-yaml / pptxgenjs / sharp）装进本目录，需要联网；sharp 是原生模块，装不上时只出 SVG（PPTX 也依赖它），此时在 PPT 里「插入图片」选 SVG、右键「转换为形状」同样可编辑。

改图只改 spec，不碰代码：

```yaml
meta:
  layout: flow        # 换图型
  theme: consulting-navy   # 换整套配色，8 套可选
```

## 作为技能使用

把本目录（`ppt-diagram-craft/`，不是整个仓库）放进 agent 的技能目录即可，`SKILL.md` 位于本目录根部。触发场景：要一张配图 / 示意图 / 架构图 / 流程图，或丢来一张手绘草图要复刻。字段与取值见 [SKILL.md](SKILL.md)、[spec-schema.md](references/spec-schema.md)、[design-tokens.md](references/design-tokens.md)。

## 硬约束

- 画布固定 16:9（13.333 × 7.5 英寸）
- 字号只用固定阶梯（27 / 20 / 12 / 11 / 10.5 / 9），标题放不下会自动降档
- 颜色只用主题里的 accent，写错会报错并列出可选值
- 每种布局有规模上限，超了直接报错，不静默截断
- `constraints` 里声明不直连的两方若出现连线，渲染直接报错

## 目录

```
SKILL.md              技能入口：何时用、流程、硬约束
scripts/render.js     入口：解析 spec → 校验 → 出图
scripts/primitives.js 栅格、字号、配色、线宽等绘制原语
templates/            四种布局的模板
references/           spec 字段、设计规范、图型规则
examples/             四种布局各一份可运行样例
```

## License

MIT
