# kf-skill

个人技能集合。每个子目录是一个**可独立拷走**的技能：`SKILL.md` 位于子目录根部，把这个子目录整体放进 agent 的技能目录即可使用。

| 技能 | 一句话 | 产出 | 文档 |
| --- | --- | --- | --- |
| [ppt-diagram-craft](ppt-diagram-craft/) | 把业务描述或手绘图转成风格统一的 16:9 配图 | SVG / PNG / PPTX | [README](ppt-diagram-craft/README.md) |
| [agent-rules-refactor](agent-rules-refactor/) | 把重复臃肿的 Agent 规则文件收敛为「单一真源 + 按需触发」 | 重构后的规则体系 | [SKILL.md](agent-rules-refactor/SKILL.md) |

## 安装

```bash
git clone https://github.com/fengyale/kf-skill.git
cp -r kf-skill/ppt-diagram-craft ~/.trae-cn/skills/
```

Windows PowerShell：

```powershell
git clone https://github.com/fengyale/kf-skill.git
Copy-Item -Recurse kf-skill\ppt-diagram-craft "$env:USERPROFILE\.trae-cn\skills\"
```

拷进去之后技能目录是独立副本，仓库再更新需要重新拷一次。

## 新增技能

1. 新建子目录，`SKILL.md` 放根部，不嵌套
2. 依赖装进技能自己的目录（参考 `ppt-diagram-craft/scripts/bootstrap.js` 的自举做法），`node_modules/` 不进仓库
3. 在 README 的表格里登记一行

## 什么该进来

- 进：自用或直接分发的技能，一个目录一个，拷走即用
- 不进：有独立发布节奏、需要自己的 CI / issue / 版本号的重型项目（如 harness-bootstrap），留独立仓库

## License

MIT，见 [LICENSE](LICENSE)；每个技能子目录内也保留了一份，便于单独拷出后仍带许可证。
