# Changelog

遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与语义化版本。

## [0.1.0] - 2026-11-25

### Added

- `skills/drawio-mcp`：可安装技能，覆盖工具契约、铁律、标准工作流、失败速查、交付清单。
- `skills/drawio-mcp/references/`：XML 速查、Mermaid 指南、CSV 导入、校验规则、7 个配方。
- `docs/drawio-mcp/`：使用说明、命名与几何约定、15 条实测陷阱、术语表、12 项已知未知、4 个案例。
- `docs/diagram/`：制图原则、布局、字体颜色、图种选择、可访问性、评审清单、简报模板。
- `docs/engineering/COMPASS.md`：单一事实源、证据等级、质量门禁、路线图。
- `shared/`：零依赖 XML 解析、mxfile 读写（含压缩页）、27 条 lint 规则、作者工具函数。
- `scripts/validate-drawio.mjs`：命令行校验器，支持 `--strict` 与 `--json`。
- `scripts/check-docs.mjs`：链接、围栏、标题、frontmatter、示例 lint 检查。
- `scripts/build-manifest.mjs`、`build-site.mjs`、`install-skill.ps1`、`doctor.ps1`。
- `examples/`：5 个 lint-clean 的 `.drawio`（流程图、架构、ER、泳道、多页）。
- `verification/`：探针、兼容性矩阵、2026-11-25 实测日志。
- `test/`：33 项单测（XML 解析、压缩往返、lint 规则、作者函数）。

### Verified

- `open_*` 只返回编辑器 URL，不落盘、不校验 XML（畸形 XML 仍返回 URL）。
- `list_pages` / `get_page` / `set_page` 的返回结构与错误信息。
- 压缩页必须使用纯 base64；URI 编码会报 `invalid bit length repeat`。
- `set_page` 保留原页压缩状态；成功消息中的页名可能显示 `null`。
- `search_shapes` 在无网络环境报 `could not load the shape search index`。

### Known

- `libavoid` 实际绕行质量、ELK 对容器图的处理、PNG/SVG 导出未验证；见 `docs/drawio-mcp/known-unknowns.md`。
