# drawio-skills

draw.io（diagrams.net）**MCP 使用规范、避坑手册、制图规范**与可执行 **Skill** 的集合。

目标只有一个：让第一次用 draw.io MCP 的 agent 不必把同样的坑再踩一遍，并且**不把坏图说成好图**。

## 这个仓库解决什么

draw.io MCP 是"编辑器的遥控器"，不是"文件生成器"：

- `open_drawio_xml` / `open_drawio_mermaid` / `open_drawio_csv` **只返回编辑器 URL，不落盘**；
- `open_drawio_xml` **不校验 XML**——畸形 XML 同样返回 URL；
- 读写本地文件只有 `list_pages` / `get_page` / `set_page`，且**不能新建文件**；
- 边必须有 `<mxGeometry relative="1"/>`，容器子元素坐标是相对的，标签开 `html=1` 还要求 XML 转义。

这些结论在本仓库里都有实测记录（`docs/drawio-mcp/pitfalls.md`），并固化成了技能、校验器和示例。

## 内容结构

```
docs/
  engineering/COMPASS.md     工程化罗盘：单一事实源、证据等级、路线图
  drawio-mcp/                第一部分：MCP 使用
    usage.md                 工具三角色、调用顺序、文件格式
    conventions.md           命名、几何、样式、层、多页约定
    pitfalls.md              15 条实测陷阱 + 行为矩阵
    glossary.md              mxCell / mxfile / startSize / libavoid 等
    known-unknowns.md        12 项未验证行为与关闭条件
    cases/                   4 个实战案例
  diagram/                   第二部分：制图
    principles.md            一张图一个论点、语义形状、反模式
    layout.md                网格、方向、间距、交叉、容器、规模
    typography-color.md      字号阶梯、角色色、对比度、深色模式
    diagram-types.md         图种选择表与各自验收点
    accessibility.md         黑白可读、文字替代、缩放
    review-checklist.md      阻断/应修/建议三档评审
    prompt-brief.md          8 项简报模板与追问清单
skills/
  drawio-mcp/SKILL.md        可直接安装的技能（短、可执行）
    references/              XML 速查、Mermaid、CSV、形状库、场景矩阵、校验、配方
    manifest.json            文件清单与 SHA-256
shared/
  xml-parse.mjs              零依赖 XML 解析
  drawio-file.mjs            mxfile、压缩页、多页读写
  drawio-lint.mjs            27 条渲染缺陷规则
  drawio-guards.mjs          网格、角色色、标签、边模板
scripts/
  validate-drawio.mjs        命令行校验器（--strict / --json）
  check-docs.mjs             链接、围栏、标题、frontmatter、示例
  build-manifest.mjs         生成/校验技能清单
  build-site.mjs             零依赖静态站
  install-skill.ps1          带备份与版本戳的安装
  doctor.ps1                 环境与仓库自检
examples/                    6 个 lint-clean 的 .drawio 示例（含形状冒烟测试）
test/                        纯函数与文档契约测试
verification/                探针、兼容性矩阵、实测日志
```

## 快速开始

**只想让 AI 少犯错**：安装技能。

```powershell
.\scripts\install-skill.ps1
.\scripts\doctor.ps1
```

手动安装等价于：

```powershell
Copy-Item -Recurse .\skills\drawio-mcp "$env:USERPROFILE\.sclaw\agent\skills\"
```

### 前置条件

- 已部署 draw.io MCP（jgraph 版，暴露 8 个工具）；本仓库**不含 MCP server**。
- 编辑器可访问 `app.diagrams.net`，或本地 draw.io 桌面版。
- Node.js `>= 20`：只用于运行校验脚本；技能本身不依赖 Node。

**想先理解规则**：`docs/drawio-mcp/usage.md` → `conventions.md` → `pitfalls.md`。

**想做制图规范**：`docs/diagram/principles.md` → `layout.md` → `typography-color.md` → `diagram-types.md` → `review-checklist.md`。

**想直接抄骨架**：`skills/drawio-mcp/references/recipes.md`，对照 `examples/`。

**不知道选哪种图**：先查 `skills/drawio-mcp/references/scenarios.md` 的 68 个软件工程场景矩阵，再用 `shape-libraries.md` 选元素与降级方案。

## 文档站发布

`.github/workflows/pages.yml` 在 CI 里执行 `npm run site` 并上传 `site/` 产物。启用步骤：

1. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**；
2. 推送到 `main`，或手动运行 `pages` workflow；
3. 首次部署后访问 `https://<owner>.github.io/<repo>/`。

`GITHUB_TOKEN` 不能替仓库创建 Pages site。若未启用，`configure-pages` 会报 `Get Pages site failed` 或 `Resource not accessible by integration`；这是需要在设置里完成的一次性操作。站点链接全为相对路径，子路径部署无需额外配置。

## 质量门禁

```bash
npm test          # XML 解析、压缩往返、lint 规则、示例
npm run check     # 链接、围栏、标题、frontmatter、示例 lint、manifest
npm run verify    # check + test
npm run lint:examples
npm run site      # 可选：生成静态站（site/ 已忽略）
```

一条命令验收单个文件：

```bash
node scripts/validate-drawio.mjs --strict path/to/file.drawio
```

## 实测覆盖（2026-11-25）

| 能力 | 结论 |
|---|---|
| 工具数量 | 8 个：3 个 open、3 个 page、2 个参考 |
| 预览落盘 | 否；只返回 URL 并打开浏览器 |
| 预览校验 | 否；畸形 XML 仍返回 URL |
| 多页读取 | `list_pages` 返回 index/id/name/approxSizeBytes |
| 单页读取 | `get_page` 返回解压后的 `mxGraphModel` |
| 单页写回 | `set_page` 整页替换；保留原压缩状态 |
| 错误信息 | 索引越界、压缩失败、形状索引失败均已记录 |
| 压缩格式 | 文件内为纯 base64；URI 编码会报 `invalid bit length repeat` |

逐条证据见 `docs/drawio-mcp/pitfalls.md` 与 `verification/log/2026-11-25.md`。

## 两部分的关系

| | 第一部分：MCP | 第二部分：制图 |
|---|---|---|
| 解决 | 打不开、线不显示、文件写坏 | 看不懂、层级乱、颜色无意义 |
| 形态 | 契约、硬规则、lint、速查 | 原则、尺度、验收 |
| 失败 | URL 空白、标签变源码、页丢失 | 图能开但没人看 |

第一部分保证"操作正确"，第二部分保证"结果正确"。

## 版本管理

语义化版本，标签 `vMAJOR.MINOR.PATCH`：

| 变更 | 版本位 |
|---|---|
| 既有用法需改写（骨架、工具契约） | MAJOR |
| 新增技能、章节、规则 | MINOR |
| 修正、补例、措辞 | PATCH |

发布流程：

```bash
npm run verify
git add -A
git commit -m "feat: ..."
git tag -a v0.1.0 -m "v0.1.0"
git push origin main --tags
```

每个版本记 `CHANGELOG.md`；标签只打在通过自检的提交上。

## 约定

- 结论必须来自实测或源码；不确定就标"待验证"，不要写成事实。
- 硬规则（违反即坏）与项目约定（可覆盖）必须分开标注。
- 与版本相关的结论标注环境与日期。
- 每个技能一个目录：`skills/<name>/SKILL.md`，frontmatter 只写 `name` 与 `description`。
- 说明性文档放 `docs/`，技能目录内不放 README/CHANGELOG。

## 来源

- <https://github.com/jgraph/drawio-mcp>（工具与 style reference）
- <https://github.com/jgraph/drawio/discussions/5643>（Mermaid 支持范围）
- <https://github.com/jgraph/drawio-mcp/blob/main/shared/mxfile.xsd>（mxfile schema）
- 实测环境：Windows 11、Node 22.23、draw.io MCP（8 工具）、`app.diagrams.net`
