# 验证

本目录保存**可复跑**的探针与**一次性的实测记录**。文档里的"实测"必须能在这里找到对应证据。

## 目录

| 路径 | 内容 |
|---|---|
| `probes/` | 可执行探针（只用 Node 内置模块） |
| `log/` | 按日期记录的实测日志（含 MCP 返回原文） |
| `compatibility.md` | 能力 × 环境矩阵 |

## 跑探针

```bash
node verification/probes/01-lint-examples.mjs
node verification/probes/02-compression-roundtrip.mjs
node verification/probes/03-mcp-manual-checklist.mjs
```

探针退出码非 0 即失败；输出用于粘贴进日志。

## MCP 探针为什么是"手动清单"

MCP 工具只能在 agent 会话里调用，本地脚本无法直接触发。所以涉及 MCP 的验证以**清单 + 记录返回原文**的方式固化：

1. 按 `probes/03-mcp-manual-checklist.mjs` 打印的步骤逐条调用；
2. 把返回原文（可截断 URL）写入 `log/<日期>.md`；
3. 结论升级进 `docs/drawio-mcp/pitfalls.md`，未知项留在 `known-unknowns.md`。

不要在没有记录的情况下修改"实测"结论。

## 日志格式

```markdown
# YYYY-MM-DD 实测

环境：OS / Node / MCP 工具数 / 编辑器

## 结论摘要
| 编号 | 结论 | 证据 |

## 逐条记录
### V-01 标题
调用：...
返回：...
结论：...
```

## 规则

- 一条记录只回答一个问题。
- 返回原文优先于转述；URL 可截断到 `#` 前。
- 失败也要记：错误信息是最有价值的证据。
- 环境变了（MCP 升级、编辑器改版）就重跑，不要沿用旧结论。
