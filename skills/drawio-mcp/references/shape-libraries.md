# 形状库与元素选择

draw.io 的侧边栏把上万个 stencil 分成九组：**通用、基本、箭头、剪贴画、流程图、软件、网络、商务、其他**。选错组的典型后果不是"画不出来"，而是"画出来语义不对"——用矩形代替数据库、用架构图讲分支、用品牌图标讲协议。

本页解决两件事：**按上下文选组**，以及**在不确定 stencil 名称时如何安全降级**。

## 0. 三级可用性（先看这个）

| 级别 | 含义 | 使用规则 |
|---|---|---|
| **Tier A 已验证** | MCP 参考明确给出，或本仓库示例已使用并通过结构校验 | 可直接复制 |
| **Tier B 核心关键字** | mxGraph 基础 `shape=` 名称，写错会**退化成矩形** | 首次使用必须预览确认；不确定就换 Tier A |
| **Tier C 库 stencil / 品牌图标** | AWS/Azure/GCP/Cisco/K8s/BPMN/P&ID 等上万图标 | **只能由 `search_shapes` 返回**，禁止手写猜名 |

铁律：**能在 A/B 表达，就不要用 C**；需要 C 时先 `search_shapes`；离线失败就降级为 A/B + 文字，并在汇报里说明。

## 1. 九组元素怎么选

| 组 | 典型元素 | 适合 | 不适合 | 软件工程中的主场景 |
|---|---|---|---|---|
| **通用** | 矩形、圆角、圆、椭圆、菱形、三角、六边形、圆柱、云、文档、便签 | 任何图的骨架、概念图、汇报图 | 需要精确 UML/BPMN 语义 | 上下文图、分层图、组件草图 |
| **基本** | 过程、预定义过程、手动输入、延迟、显示、循环上限、数据存储、离页连接、或、汇合、卡片、磁带 | 流程图、系统边界、数据流 | 需要品牌识别 | DFD、算法流程、数据处理 |
| **箭头** | 单箭头、双箭头、弯折箭头、柔性箭头、链环 | 强调方向、阶段推进、标注 | 代替普通依赖线（会抢注意力） | 路线图、迁移路径、流水线 |
| **剪贴画** | 人物、设备、概念图标 | 汇报、旅程、概念图 | 精确技术图 | 用户旅程、角色说明 |
| **流程图** | 终止、处理、判断、数据、文档、数据库、预定义、手动输入 | 业务流程、算法、审批 | 系统架构、部署 | 审批流、算法、异常处理 |
| **软件** | UML、ER、BPMN、C4、DFD、ArchiMate、SysML | 设计、契约、行为、数据模型 | 业务汇报（读者不懂） | 类图、时序、状态机、ER、C4 |
| **网络** | 服务器、路由器、防火墙、云、区域、AWS/Azure/GCP、Cisco、K8s | 部署、拓扑、云架构 | 业务流程图 | 部署图、网络拓扑、云参考架构 |
| **商务** | 组织架构、价值流、精益、象限、画布 | 组织、运营、决策 | 技术细节 | 组织图、价值流、选型象限 |
| **其他** | P&ID、电气、标识、线框、平面图、iOS/Android | 行业专用 | 通用软件图 | 线框图、行业图（按需） |

**选择顺序**：先定图种（见 `scenarios.md`）→ 再定组 → 最后定具体形状。不要从"我想用这个图标"倒推图。

## 2. Tier A：已验证，可直接复制

| 语义 | style 片段 | 来源 |
|---|---|---|
| 直角矩形 | `rounded=0;whiteSpace=wrap;html=1;` | 基础几何 |
| 圆角矩形 | `rounded=1;whiteSpace=wrap;html=1;` | 基础几何 |
| 椭圆/起止 | `ellipse;whiteSpace=wrap;html=1;` | 基础几何 |
| 判断 | `rhombus;whiteSpace=wrap;html=1;` | 基础几何 |
| 数据库/存储 | `shape=cylinder3;boundedLbl=1;whiteSpace=wrap;html=1;` | MCP XML 参考 |
| 文档 | `shape=mxgraph.flowchart.document;whiteSpace=wrap;html=1;` | MCP XML 参考 |
| 容器（带标题） | `swimlane;startSize=24;html=1;verticalAlign=top;` | MCP XML 参考 |
| 纯分组 | `group;` | MCP XML 参考 |
| 任意形状作容器 | `<原 style>;container=1;pointerEvents=0;` | MCP XML 参考 |
| 表格布局 | `shape=table;childLayout=tableLayout;startSize=0;collapsible=0;` | MCP XML 参考 |
| 时序生命线 | `shape=umlLifeline;perimeter=lifelinePerimeter;size=16;html=1;` | MCP XML 参考 |
| 纯文本 | `text;html=1;align=left;verticalAlign=middle;` | 基础 |
| 图片/图标 | `shape=image;image=<URL 或 data URI>;` | `search_shapes` 返回 |

边的 Tier A 风格见 `xml-cookbook.md` 第 4 节：`orthogonalEdgeStyle`、`entityRelationEdgeStyle`、状态机直箭头、`endArrow=none`（组织架构）。

## 3. Tier B：核心关键字，首次必须预览

这些是 mxGraph 的基础 `shape=` 名称。**写错不会报错，只会退化成矩形**，所以第一次使用必须打开预览确认。

| 语义 | style 片段 |
|---|---|
| 六边形（准备/校验） | `shape=hexagon;whiteSpace=wrap;html=1;` |
| 三角形 | `shape=triangle;whiteSpace=wrap;html=1;` |
| 平行四边形（输入/输出） | `shape=parallelogram;whiteSpace=wrap;html=1;` |
| 梯形 | `shape=trapezoid;whiteSpace=wrap;html=1;perimeter=trapezoidPerimeter;` |
| 步骤（stage） | `shape=step;whiteSpace=wrap;html=1;` |
| 过程 | `shape=process;whiteSpace=wrap;html=1;` |
| 预定义过程 | `shape=process;backgroundOutline=1;whiteSpace=wrap;html=1;` |
| 手动输入 | `shape=manualInput;whiteSpace=wrap;html=1;` |
| 延迟 | `shape=delay;whiteSpace=wrap;html=1;` |
| 显示 | `shape=display;whiteSpace=wrap;html=1;` |
| 循环上限 | `shape=loopLimit;whiteSpace=wrap;html=1;` |
| 数据存储（DFD） | `shape=dataStorage;whiteSpace=wrap;html=1;` |
| 内部存储 | `shape=internalStorage;whiteSpace=wrap;html=1;` |
| 离页连接 | `shape=offPageConnector;whiteSpace=wrap;html=1;` |
| 或 | `shape=or;whiteSpace=wrap;html=1;` |
| 卡片 | `shape=card;whiteSpace=wrap;html=1;` |
| 磁带 | `shape=tape;whiteSpace=wrap;html=1;` |
| 便签 | `shape=note;whiteSpace=wrap;html=1;size=14;` |
| 标注 | `shape=callout;whiteSpace=wrap;html=1;size=20;` |
| 角色（简笔） | `shape=actor;whiteSpace=wrap;html=1;` |
| 立方体 | `shape=cube;whiteSpace=wrap;html=1;` |
| 云 | `shape=cloud;whiteSpace=wrap;html=1;` |
| 文档（核心名） | `shape=document;whiteSpace=wrap;html=1;` |
| 单箭头 | `shape=singleArrow;whiteSpace=wrap;html=1;` |
| 双箭头 | `shape=doubleArrow;whiteSpace=wrap;html=1;` |
| 柔性箭头 | `shape=flexArrow;whiteSpace=wrap;html=1;` |
| UML 角色 | `shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;` |
| UML 边界 | `shape=umlBoundary;whiteSpace=wrap;html=1;` |
| UML 控制 | `shape=umlControl;whiteSpace=wrap;html=1;` |
| UML 实体 | `shape=umlEntity;whiteSpace=wrap;html=1;` |
| UML 组件 | `shape=component;whiteSpace=wrap;html=1;align=left;verticalAlign=top;spacingLeft=36;` |

**冒烟测试**：`examples/06-shape-smoke-test.drawio` 把上表排成网格。打开一次，凡是显示成矩形或只剩文字的，就是名称无效（或当前版本不支持），按预览结果替换，不要盲信本表。

**2026-11-25 实测（draw.io 32.7.4）**：`shape=summingJunction` 渲染为矩形，`shape=link` 只剩文字，二者已从 Tier B 移除；需要“汇合”语义时用 `shape=or` 加文字标签。其余 31 个关键字均保持可辨认外观。

## 4. Tier C：库 stencil 与品牌图标

### 4.1 用法

```text
search_shapes("aws lambda")
→ [{ title, style, width, height, ... }]
```

把返回的 `style` **原样**放进 `mxCell`，不要改写、不要拼接、不要凭记忆拼前缀。返回 `shape=image;image=...` 时，尺寸用返回值，不要拉伸变形。

### 4.2 检索关键词（只是关键词，不是 style）

| 库 | 检索词示例 |
|---|---|
| AWS | `aws4 lambda`, `aws4 s3`, `aws4 api gateway` |
| Azure | `azure functions`, `azure sql`, `azure devops` |
| GCP | `gcp2 bigquery`, `gcp2 cloud run` |
| Cisco/网络 | `cisco router`, `cisco switch`, `rack server` |
| Kubernetes | `kubernetes pod`, `kubernetes service`, `kubernetes ingress` |
| BPMN | `bpmn task`, `bpmn gateway`, `bpmn event` |
| SysML/ArchiMate | `sysml block`, `archimate application component` |
| 行业 | `pid globe valve`, `electrical resistor`, `floorplan sofa` |
| 品牌/概念 | `react`, `slack`, `shopping cart`, `solar panel` |

**重要**：上表是 `search_shapes` 的查询词，不是可手写的 style 前缀。离线时不要把它们拼成 `shape=mxgraph.aws4.lambda` 之类的字符串——名称错一个字符就退化成矩形。

**2026-11-25 实测（@drawio/mcp 1.13.0 / draw.io 32.7.4）**：`examples/08-tier-c-icons.drawio` 用 `search_shapes` 返回的原始 style 验证了 10 个代表图标——AWS S3、Azure Function Apps、GCP BigQuery、Cisco Router、Kubernetes Pod、BPMN Exclusive Gateway、P&ID Gate Valve、Electrical Attenuator、React、Azure VM，全部渲染成功。Azure 与 React 使用远程 `image=` URL，离线打开可能只剩标签；其余为本地 stencil。

### 4.3 离线降级阶梯

1. 用 Tier A/B 的通用形状 + 文字表达同一语义（如"Lambda"用圆角矩形 + `AWS Lambda` 文字）。
2. 用容器/泳道补足边界，用颜色区分供应商。
3. 汇报里写明"离线，未使用品牌图标"。
4. 不要重试 `search_shapes` 到超时，也不要伪造图标。

## 5. 上下文 → 元素映射

| 要表达 | 首选 | 备选 | 避免 |
|---|---|---|---|
| 处理步骤 | 圆角矩形 | 过程 `shape=process` | 用图标代替文字 |
| 判断/分支 | 菱形 | 六边形 | 用矩形 + "如果" |
| 开始/结束 | 椭圆 | 体育场 | 用矩形 |
| 数据存储 | 圆柱 | 数据存储 `shape=dataStorage` | 用文档 |
| 报表/文档 | 文档形状 | 便签 | 用圆柱 |
| 人工输入 | `shape=manualInput` | 圆角矩形 + 人图标 | 省略 |
| 外部系统 | 云/灰色矩形 | 虚线容器 | 与内部同色 |
| 角色 | `shape=actor` / `umlActor` | 文字 + 剪贴画 | 只写名字 |
| 边界 | swimlane / `container=1` | 虚线矩形 | 用阴影暗示 |
| 消息 | 开放箭头 | 实心箭头 | 双向箭头滥用 |
| 依赖 | 虚线 + 开放箭头 | 实线 | 与调用混用 |
| 数据流 | 带标签箭头 | 粗箭头 | 无标签 |
| 表结构 | `shape=table` | 三个 swimlane 叠放 | 手画网格 |
| 品牌组件 | `search_shapes` 返回 | 矩形 + 文字 | 手拼 prefix |

## 6. 使用规则

1. **同图同义同形**：一个形状只承担一种语义。
2. **形状种类 ≤ 6**：超过就说明图没抽象好。
3. **形状不单独承载信息**：图标旁必须有文字；颜色不是唯一区分。
4. **尺寸服从网格**：140×60、160×90；图标 48–64，名称在下方（`verticalLabelPosition=bottom`）。
5. **不用 3D/阴影/渐变** 强调；用位置、粗细、边框。
6. **容器不抢连线**：装饰容器加 `pointerEvents=0`；需要连线才用 swimlane。
7. **每个 Tier B/C 形状首次使用都要预览**；写错只会退化，不会报错。
8. **品牌图标只在"识别"有价值时用**：汇报、云架构；流程图里用通用形状更清楚。

## 7. 自检

- [ ] 图种与元素组匹配（不是"有什么图标画什么图"）
- [ ] 没有把 Tier B 名称当 Tier A 直接用（首次已预览）
- [ ] 没有手写猜出来的 Tier C style
- [ ] 退化矩形已排查（预览或冒烟测试）
- [ ] 同角色同形同色
- [ ] 图标有文字标签，尺寸未拉伸
- [ ] 离线降级已说明
