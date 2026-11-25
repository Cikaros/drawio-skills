# 兼容性矩阵

只记录**实际验证过**的组合。空着表示未测，不要填"应该可以"。

## 1. MCP 工具 × 能力

环境：draw.io MCP（jgraph 版，8 工具），`app.diagrams.net`，2026-11-25。

| 能力 | open_drawio_xml | open_drawio_mermaid | open_drawio_csv | list_pages | get_page | set_page | search_shapes |
|---|---|---|---|---|---|---|---|
| 落盘 | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| 校验 XML | ❌ | — | — | — | ✅（解析失败会报错） | — | — |
| 多页 | — | — | — | ✅ | ✅ | ✅ | — |
| 压缩页 | — | — | — | ✅ | ✅ | ✅ | — |
| 需要网络 | 编辑器 | 编辑器 | 编辑器 | ❌ | ❌ | ❌ | 首次（索引约 4.8 MB；可缓存/换源） |

## 2. 文件形态

| 形态 | 读取 | 写回 | 备注 |
|---|---|---|---|
| 裸 `mxGraphModel` | ✅ | — | 单页 |
| `mxfile` + 内联页 | ✅ | ✅ | 最稳 |
| `mxfile` + 压缩页（纯 base64） | ✅ | ✅ | 写回保持压缩 |
| `mxfile` + 压缩页（URI 编码） | ❌ | — | `invalid bit length repeat` |
| 无 `name` 的页 | ✅（name=null） | 未测 | 见 U3 |
| 重复页 id | 未测 | 未测 | lint 会拦 |

## 3. 编辑器 / 平台

| 平台 | 预览 | 导出 | 备注 |
|---|---|---|---|
| `app.diagrams.net` | ✅ | 手工 | 内容在 URL fragment |
| draw.io 桌面版 | 未测 | 未测 | 无桌面版环境 |
| 自建 draw.io | 未测 | 未测 | 需改编辑器地址 |
| 无 GUI 环境 | 未测 | — | 见 U10 |

## 4. 布局参数

| 参数 | 接受 | 效果验证 |
|---|---|---|
| `postLayout:"elk"`（Mermaid） | ✅ | 未逐图对比 |
| `postLayout:"elk"`（XML） | 未测 | — |
| `direction:"horizontal"` | 未测 | — |
| `routing:"libavoid"` | 未测 | — |

## 5. 升级后必须重测

1. 工具数量与参数是否变化（尤其 open_* 是否新增 path）。
2. 压缩格式是否仍为纯 base64。
3. `set_page` 的整页替换语义是否变化。
4. 错误信息文本（脚本/文档有引用）。

重测后更新本表与 `docs/drawio-mcp/pitfalls.md`，并在 `log/` 追加记录。
