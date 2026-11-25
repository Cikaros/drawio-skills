# Changelog

遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与语义化版本。

## [0.4.0] - 2026-11-25

### Added

- `EDGE005`：两条边共享 >12px 同轴线段（区分同向/对向），以及单条边原路折返。
- `EDGE006`：边穿过无关图形内部；按真实 `exitX/exitY`、`entryX/entryY` 与 waypoint 计算路径，跳过 source/target、`text` 分区标题、生命线与容器。
- 5 项几何回归测试：共享走廊对向、单边折返、穿框、贴边不误报、时序消息穿生命线不误报。
- `xml-cookbook.md` 4.1「端口与走廊」：独立端口、12px 走廊间距、扇出排序、双向边合并、贴边与穿框边界。

### Changed

- `references/validation.md`：规则表加入 `EDGE005/006`，第 3 节补边路径/共享段/穿框算法，5.1 改为「lint 已覆盖与仍需目检」。
- `SKILL.md`：新增铁律 13「边不叠、不穿框」；失败速查、严格门禁与交付清单加入 `EDGE005/006`。
- `docs/diagram/{layout,review-checklist}.md`、`references/sequences.md`：把共享段/穿框/端口分离写成验收项。
- `examples/01-approval-flow.drawio`：`材料不全` 回边改走财务复核下方走廊，修掉与 `主管审批→财务复核` 的 40px 反向共享段和穿 `主管审批` 框。
- `docs/drawio-mcp/cases/05-netbird-atlas.md`：补充第二轮边几何回写。
- 版本升至 `0.4.0`；README lint 规则数更新为 29。

### Validated

- 外部项目 `netbird/docs/drawio`（不纳入本仓库提交）：17 页重新生成并导出 PNG；修正 01 扇出走廊顺序、03/07/12/17 同端口进出、03/11/17 穿 Store/ACL/告警框、01/16 分区标签压线。
- `node scripts/validate-drawio.mjs --strict E:\Code\netbird\docs\drawio\*.drawio`：17/17，0 error / 0 warning；新增规则下仍为零告警。
- `npm run verify`：46/46 通过；8 个示例 `--strict` 零告警。

## [0.3.1] - 2026-11-25

### Added

- `examples/08-tier-c-icons.drawio`：用 `search_shapes` 返回的原始 style 验证 AWS S3、Azure Function Apps、GCP BigQuery、Cisco Router、Kubernetes Pod、BPMN Gateway、P&ID Gate Valve、Electrical Attenuator、React、Azure VM 共 10 个 Tier C 图标，lint 零告警。
- 契约测试覆盖 Tier C 示例的零告警、关键 stencil 与图标数量，并为 Tier B 冒烟图保留 `summingJunction`、`link` 两个退化负例。

### Changed

- `references/shape-libraries.md`：补充 Tier C 实测记录；`shape=summingJunction` 退化为矩形、`shape=link` 只剩文字，二者移出 Tier B。
- `docs/drawio-mcp/pitfalls.md` P7、`usage.md` 与 `SKILL.md`：说明形状索引首次下载约 4.8 MB、默认缓存位置、`DRAWIO_SHAPE_INDEX_URL` 与可用镜像。
- `known-unknowns.md`：关闭 U6（索引缓存/镜像）；U13 缩小为全量 ~10,800 名称与版本差异未逐一验证。
- README 示例数量更新为 8，案例数量更新为 5。

### Validated

- 代理开启后 `search_shapes` 成功；索引缓存 `shape-index.json` 5,089,452 bytes / 10,800 条，本地索引源可被 `loadShapeIndex` 读取。
- Tier B 冒烟图导出 PNG 逐格检查：31 个名称有效，`summingJunction`/`link` 为退化项；Tier C 10 个代表图标全部渲染。
- `npm run verify`：41/41 通过；`--strict` 示例校验零 error / 零 warning。

## [0.3.0] - 2026-11-25

### Added

- `references/sequences.md`：XML 时序图的生命线布局、`exitY/entryY` 锚点公式、同步/返回/分支写法与自检；补上 Mermaid 之外的精确排版路径。
- `examples/07-sequence-lifelines.drawio`：4 参与者、6 消息的最小可打开示例，lint 零告警。
- `references/scenarios.md` 新增「真实项目图集（Atlas）」八步工作流：事实源盘点、矩阵、命名、索引、批量校验、视觉抽检、缺口记录。
- `docs/drawio-mcp/cases/05-netbird-atlas.md`：在真实仓库 NetBird 上产出 17 张设计图的案例与暴露的缺口。

### Changed

- `references/xml-cookbook.md` 增加 ER 实体盒与 crow's foot 画法，并给时序图章节加指针。
- `references/validation.md` 第 5 节改为 draw.io 桌面 CLI 批量导出流程，新增 5.1「静态 lint 查不到的典型缺陷」：穿框、叠线、标签压线、箭头指错列、自动布局破坏语义。
- `SKILL.md` 参考清单加入 `sequences.md`。
- README 示例数量更新为 7，并加入 Atlas 入口。

### Validated

- 外部项目 `netbird/docs/drawio`：17 个 `.drawio` 文件、`--strict` 零 error / 零 warning；图集含系统上下文、用例、容器、组件、部署、网络、ER、3 张时序、策略、路由/DNS、认证、状态机、CI、可观测性、Agent Network。
- 用 draw.io 32.7.4 CLI 将 17 页导出 PNG 做视觉回归，修正 01/03/04/05/06/07/08/13/14/15 的穿框、叠线与文字溢出；重点页复核后重新导出，lint 复跑仍为零告警。

## [0.2.0] - 2026-11-25

### Added

- `skills/drawio-mcp/references/shape-libraries.md`：九组元素（通用/基本/箭头/剪贴画/流程图/软件/网络/商务/其他）的选择指南、Tier A/B/C 三级可用性、上下文到元素的映射、离线降级阶梯。
- `skills/drawio-mcp/references/scenarios.md`：68 个软件工程场景矩阵（需求、架构、设计、数据、流程、交付、质量安全、组织、决策），含选型五问、六套交付组合、反模式与快速路径。
- `examples/06-shape-smoke-test.drawio`：38 个形状的目视冒烟测试（33 个 Tier B 核心关键字），用于确认哪些名称会退化成矩形。
- `SKILL.md` 新增「1.5 选型与元素」：五问决策表、九组速记、三级可用性与指针。
- `test/reference-contract.test.mjs`：场景 id 唯一性、三级策略、冒烟测试 lint、SKILL 指针的契约测试。

### Changed

- `docs/diagram/diagram-types.md` 增加软件工程场景矩阵入口。
- README 补充选型路径与示例数量（6 个）。

### Known

- 各库 stencil 的具体名称未逐一验证；Tier B 需按冒烟测试目视确认（U13）。

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
