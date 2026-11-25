# 05 真实项目图集：NetBird

## 目标

给一个真实 Go 仓库 `netbird` 产出设计阶段图集，放在 `docs/drawio/`，并用这次实践反推 drawio skill 的缺口。要求：图必须能追溯到代码/配置，不用未验证的 stencil，不把“示意图”当契约。

## 事实源

| 事实 | 来源 |
|---|---|
| 组件、三种网络模式、特权边界 | `AGENTS.md` |
| 部署服务、端口、卷、证书 | `infrastructure_files/{docker-compose.yml.tmpl,base.setup.env,management.json.tmpl}` |
| 控制面 RPC | `shared/management/proto/*.proto`、`shared/signal/proto/signalexchange.proto` |
| 领域模型 | `management/server/types/*.go` |
| 连接与路由 | `client/internal/{peer,routemanager,dns,acl}`、`route/`、`dns/` |
| Agent Network | `docs/agent-networks/*`、`proxy/internal/*` |
| CI | `.github/workflows/*` |

## 图集（17 张）

| 阶段 | 图 |
|---|---|
| 需求/范围 | 01 系统上下文、02 用例 |
| 架构 | 03 容器、04 Management 组件、05 Agent 组件 |
| 部署/网络 | 06 部署拓扑、07 网络拓扑 |
| 数据 | 08 领域模型 ER |
| 行为 | 09 注册时序、10 连接时序、11 策略评估、12 路由/DNS、13 认证、14 状态机 |
| 交付/运维 | 15 CI/发布、16 可观测性 |
| 扩展 | 17 Agent Network |

## 关键判断

1. **先事实后图**：每个图先列“已证实”的节点/边；没有来源的组件不画。图脚写依据文件。
2. **一图一问**：例如 10 只讲“连接怎么建立”，不把注册、策略、DNS 混进去；注册在 09。
3. **只用手测过的形状**：Tier A 的矩形/椭圆/菱形/圆柱/生命线；品牌图标全部不用，避免离线退化成矩形。
4. **时序图必须用 XML**：Mermaid 无法控制 6 个参与者的精确高度和标签背景；改用 `shape=umlLifeline` + `edgeStyle=none` + `exitY/entryY`。
5. **ER 不用 `shape=table`**：实体是 HTML 文本盒（`<b>TABLE</b><hr>字段`），关系用 crow's foot；`shape=table` 只用于交叉职能表。
6. **页面固定 1600×1000**：网格 250×140，节点 200×80；超密就拆页，不缩字号。

## 执行

1. 盘点事实源，列出 17 个问题。
2. 写一个本地 DSL（node + 仓库的 `shared/drawio-file.mjs`）生成 `mxCell`，统一配色、图例、页脚。
3. 每批生成后跑 `validate-drawio.mjs --strict`，按 `LAYOUT001` 修正分区标签/节点重叠。
4. 用 draw.io 桌面 CLI 批量导出 PNG 做视觉回归：`draw.io -x -f png --size page -o <out>.png <in>.drawio`。
5. 按 PNG 逐个修正：删掉穿框的长边、给跨行列边补 `exitX/exitY` + `entryX/entryY`、把 waypoint 放进行间走廊；密集页删除边标签，语义留在节点副标题/图例。
6. 生成 `docs/drawio/README.md` 索引，按角色给出阅读顺序。
7. 把缺口回写到 skill：`sequences.md`、`xml-cookbook.md` 的 ER 小节、`scenarios.md` 的 Atlas 工作流、`examples/07`、`validation.md` 的导出与锚点小节。

## 暴露的缺口

| 缺口 | 表现 | 回写 |
|---|---|---|
| 没有 XML 时序图配方 | 生命线锚点靠试；消息会吸到生命线顶部 | `references/sequences.md` + `examples/07` |
| ER 只有 Mermaid/表格，没有实体盒 + crow's foot | 容易把 ER 画成 `shape=table` 网格 | `xml-cookbook.md` 6.5 |
| 没有“真实项目图集”流程 | 单图技巧够，但不知道先盘点什么、如何命名/索引 | `scenarios.md` 第 8 节 |
| 静态 lint 不查视觉 | 交叉、标签遮挡、线穿框全部 lint 通过 | `validation.md` 5.1 + 本案例 |
| 正交边缺少锚点写法 | 只给 waypoint，首段仍从中心出发穿框 | `validation.md` 5.1；DSL 增加 `exit`/`entry` |
| 自动布局看似省事但破坏语义 | `--layout` 把控制面/数据面重排成一张网 | 明确禁用；只对纯流程图用 |

## 视觉回归结果

- 环境：draw.io 桌面 CLI 32.7.4，`-x -f png --size page` 导出全部 17 页。
- 发现并修正：01 长边与标签拥挤、03 Agent→Signal 穿 Terraform、04 NetworkMap 长边穿 Policy、05 Conn→Relay 穿 Route、06 用户→Management 穿 DNS、07 Relay/Turn 箭头指错列、08 Rule→Group 穿 GROUP_PEER、13 消息密度、14 标签压线、15 Gate 文字溢出。
- 采用手法：删不可读长边；跨行列边补 `exit`/`entry` 锚点；waypoint 移到行间/列间；密集页去边标签；时序页重排为 6 条生命线、14 条消息。
- 复核：修改后重新导出 PNG 逐页检查；全量 `--strict` 仍为 0 error / 0 warning。

## 验收

- `netbird/docs/drawio`：17 个 `.drawio` + `README.md`。
- `validate-drawio.mjs --strict`：17/17，0 error / 0 warning。
- 视觉：17 页全部导出 PNG；重点页（01/03/04/05/06/07/08/13/14/15）逐页复核，剩余页为抽检。
- drawio-skills：新增 1 篇参考、1 个示例、1 个案例、3 个契约测试；`npm run verify` 41/41。
- 未做：逐页人工签字确认；品牌/行业图标改走通用形状；Tier C 已在 `examples/08-tier-c-icons.drawio` 单独验证 10 个代表图标，但未回填 NetBird 图集。
