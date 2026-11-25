# 实战案例

每个案例写清：目标 → 关键判断 → 调用序列 → 验收证据 → 踩到的坑。案例只保留可复现的部分，不写"当时感觉"。

| # | 案例 | 主要能力 |
|---|---|---|
| 01 | [从零交付一页审批流程](01-flowchart-from-scratch.md) | XML 作者、lint、预览 |
| 02 | [把 Mermaid 固化成可交付 XML](02-mermaid-to-xml.md) | Mermaid、ELK、迁移 |
| 03 | [改多页文件的其中一页](03-edit-multi-page.md) | list/get/set、压缩页 |
| 04 | [修"线不显示 / 标签显示成标签"](04-render-defects.md) | 诊断、最小复现 |
| 05 | [真实项目图集：NetBird](05-netbird-atlas.md) | 图集规划、时序/ER 配方、Atlas 工作流 |

## 共同前提

- 交付物是 `.drawio` 文件时，**先落盘再预览**。
- 每次交付都跑 `node scripts/validate-drawio.mjs --strict`。
- 需要目视时只预览关键页，并在汇报里注明看了哪一页。
