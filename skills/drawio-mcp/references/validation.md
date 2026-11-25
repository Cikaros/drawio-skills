# 校验与验收

draw.io MCP **不做校验**：`open_drawio_xml` 对畸形 XML 同样返回 URL。所以验收必须分三层，顺序不能反。

> 校验器随技能安装：`scripts/validate-drawio.mjs`，依赖在 `scripts/lib/`。下表命令默认在**技能根目录**执行；当前目录不在技能目录时，改用 `<skill-root>/scripts/validate-drawio.mjs` 的绝对路径，其中 `<skill-root>` 是包含 `SKILL.md` 的目录，不是仓库根目录。

## 1. 三层验收

| 层 | 手段 | 能证明什么 | 不能证明什么 |
|---|---|---|---|
| L1 结构 | `node scripts/validate-drawio.mjs --strict file.drawio` | XML 可解析、引用完整、几何合法、标签不会渲染成源码 | 好不好看 |
| L2 渲染 | `get_page` 复读 / 浏览器预览 `open_drawio_xml` | 页面能被 draw.io 加载，元素确实出现 | 布局是否美观、文字是否被裁 |
| L3 视觉 | 人眼看预览；装了桌面版可 `drawio --export` 出 PNG/SVG | 重叠、截断、箭头指向、留白 | 内容是否正确 |

汇报时按层写：`L1 通过` / `L1+L2 通过，未做视觉确认` / `已目视预览第 1 页`。不要把 L1 说成"图没问题"。

## 2. lint 规则表

`scripts/lib/drawio-lint.mjs` 的规则，全部来自真实渲染缺陷：

| 代码 | 级别 | 含义 | 典型修法 |
|---|---|---|---|
| `XML001` | error | 标签不闭合/不匹配/多根节点 | 修标签；不要手改压缩页 |
| `DOC001` | error | 没有 `mxGraphModel` | 检查根节点 |
| `DOC002` | error | 没有 `<root>` | 补 `<root>` |
| `DOC003` | error | 文件里有 XML 注释 | 删除注释 |
| `DOC004` | error | 根节点既非 `mxfile` 也非 `mxGraphModel` | 修正外壳 |
| `DOC005` | error | 压缩页解不开 | 重新用 draw.io 保存 |
| `CELL001` | error | 重复/缺失 id | id 唯一 |
| `CELL002` | error | 缺 `id="0"` 或 `id="1"` | 补根与默认层 |
| `CELL003` | error | parent 指向不存在的 cell | 修 parent 或补容器 |
| `CELL004` | error | 自己是自己的父级 | 修 parent |
| `CELL005` | warn | 既不是顶点/边/层 | 删除或补 vertex/edge |
| `EDGE001` | error | 边缺 geometry 或没有 `relative="1"` | 补 `<mxGeometry relative="1" as="geometry"/>` |
| `EDGE002` | error | 边的 source/target 不存在 | 修 id |
| `EDGE003` | warn | 两端都没有的悬浮边 | 接线或删除 |
| `EDGE004` | warn | 边挂在非最内层公共容器 | 改 parent |
| `EDGE005` | warn | 两条边共享 >12px 的同轴线段，或一条边原路折返 | 每条边独立端口/走廊；对向边合并成双向边或改道 |
| `EDGE006` | warn | 边从无关图形内部穿过 | 改 `exit`/`entry` 与 waypoint，绕到行间/列间走廊 |
| `GEO001` | error | 负尺寸 | 改正 |
| `GEO002` | error | 零尺寸（不可见） | 给宽高 |
| `GEO003` | warn | 页面层负坐标 | 平移到正区 |
| `GEO004` | warn | 顶点没有 geometry | 补 geometry |
| `STYLE001` | error | 有 HTML 标签但没有 `html=1` | 加 `html=1` 或去掉标签 |
| `STYLE002` | warn | 标签里有字面 `\n` | 改 `<br>` / `&#xa;` |
| `STYLE010` | warn | 边标签没有背景色，线会穿过文字 | 加 `labelBackgroundColor=#FFFFFF` |
| `TEXT001` | warn | 标签按框宽/行高估算放不下 | 用 `<br>` 主动断行、增大宽高或降低 fontSize |
| `LAYOUT001` | warn | 同父级下两个图形重叠 | 换网格单元 |
| `LAYOUT002` | warn | 子元素超出容器边界 | 缩小或移动 |
| `LAYOUT003` | warn | 子元素压在容器标题区 | 让开 `startSize` |
| `PAGE001` | error | 页 id 重复 | 改 id |
| `PAGE002` | warn | 页名重复 | 改名 |

警告不是"可忽略"：`LAYOUT001/002/003`、`EDGE004/005/006`、`TEXT001` 都是肉眼可见的缺陷。`EDGE005` 的对向共享段尤其危险：两条线完全重合时，读者只能看到一条线和一个反向箭头，数据流会读反。

## 3. 几何规则（lint 实际在算什么）

- **重叠**：同一 parent 下两个顶点的矩形交集 > 2px。嵌套容器的子元素与容器本身不算重叠。
- **容器越界**：`child.x + child.width > parent.width + 1`（或 y 方向同理）。
- **标题区**：普通 swimlane 的 `startSize` 占顶部，`child.y ≥ startSize`；`horizontal=0` 时占**左侧**，`child.x ≥ startSize`。
- **边归属**：从两端分别向上走 parent 链，最深公共祖先应是边的 parent；否则 `EDGE004`。
- **边路径**：先按 `exitX/exitY`、`entryX/entryY` 取真实出入点，再加 `<Array as="points">` 的 waypoint；没写锚点时从中心出发，并裁到源/目标边框。waypoint 在容器内时叠加容器绝对偏移。
- **共享段**：两条边的同轴（水平/垂直）线段重叠 >12px → `EDGE005`；同一条边非相邻或相邻线段原路折返也算。消息里会标出 same/opposite directions。
- **穿框**：边的任一线段穿过无关图形的内部 → `EDGE006`。只擦着边框走不算；`text` 分区标题、`shape=umlLifeline` 生命线、容器/泳道不作为障碍物，避免把时序消息穿越生命线误报为穿框。
- **标签适配**：按 CJK≈1em、拉丁≈0.55em 估宽，行高≈1.2×fontSize；菱形/椭圆等形状再乘保守内框系数。`whiteSpace=wrap` 时按可用宽度试排，否则只认 `<br>`/换行；超出可用宽或高 → `TEXT001`。内联 `font-size` 会作为保守提示。
- **可见性**：宽或高为 0 → 不可见；负值 → 非法。

## 4. 预览流程

```text
1. node scripts/validate-drawio.mjs --strict file.drawio   # 技能根目录；0 error
2. get_page(file, page)                                     # 确认页内容
3. open_drawio_xml(<该页 mxGraphModel>, direction?, routing?) # 一次一页
```

参数：

- 需要左到右 → `direction:"horizontal"`。
- 边会穿框、但你要保留手放坐标 → `routing:"libavoid"`。
- 结构复杂、坐标只是草案 → `postLayout:"elk"`（会重排，别再手调坐标）。
- `postLayout` 与 `routing` 不要同时给。

## 5. 导出与视觉回归（draw.io 桌面 CLI）

装了 draw.io 桌面版即可批量导出，不需要打开 GUI：

```powershell
draw.io -x -f png --size page -o out.png file.drawio
draw.io -x -f svg --size page -o out.svg file.drawio
```

- `-x` 导出、`-f` 格式、`-o` 输出；`--size page` 按页面尺寸出图，最接近编辑器里的 100% 视图。
- 批量时逐文件调用；输出目录必须先存在。
- 导出成功只证明“能渲染”，仍要逐张看图：箭头指向、标签压线、线穿框、页面空白比例。

### 5.1 边几何：lint 已覆盖与仍需目检

`EDGE005/006` 已把最常见的两类“能渲染但读不懂”变成可复现的告警：

| 现象 | 规则 | 修法 |
|---|---|---|
| 多条线共享同一水平/垂直线段，甚至方向相反 | `EDGE005` | 每条边换独立 `exit`/`entry` 百分比或独立走廊；双向关系合并为一条 `startArrow+endArrow` 的边并标“双向” |
| 一条边出去又原路折返 | `EDGE005` | 出边和回边分两条走廊；不要让 waypoint 倒退 |
| 线从无关方块中间穿过 | `EDGE006` | 先定出入边，再把 waypoint 放到行间/列间；必要时从外侧绕行 |
| 多条边从同一端口发散，箭头挤成一点 | 通常同时触发 `EDGE005` | 同一形状的不同边用 `0.25/0.5/0.75` 等不同锚点，或分配到不同边 |

仍要目检的项目：

| 现象 | 原因 | 修法 |
|---|---|---|
| 标签压在线上或节点上 | 边标签无背景、走廊太窄，或标签落点正好在节点上 | `labelBackgroundColor=#FFFFFF`；仍挤就删边标签，把语义放进节点副标题/图例 |
| 箭头指向错误对象 | 边 source/target 接错，lint 只能验证 id 存在，不能理解语义 | 对照节点坐标和事实源逐个箭头检查 |
| 页面留白失衡、图例抢视线 | 几何合法但不美观 | 调整分区、图例与页脚；拆页 |
| 自动布局后语义错乱 | `--layout` 按图论重排，不保留“左控制面/右数据面” | 语义布局禁用 `--layout`；只对纯流程图使用 |

**不要用“删掉所有 waypoint 让 draw.io 自动绕”当万能解**：默认正交路由不避障，删点后线往往直接穿框。正确顺序是：先给锚点，再给走廊 waypoint，最后导出复核。

没有桌面版时不要假装导出成功；改用浏览器预览 + 明确声明“未做视觉确认”。

### 5.2 文本适配

`TEXT001` 是估算规则，不替代浏览器排版，但能在写 XML 阶段抓住“框太小、字太长”。计算方式：

```text
可用宽 = width - spacingLeft - spacingRight
可用高 = height - spacingTop - spacingBottom
所需行高 ≈ 1.2 × fontSize × 行数
```

- 中文每字≈1em，拉丁字符≈0.55em；12px 的 10 个汉字约 120px。
- 先用 `<br>` 在语义边界断行，再决定 `height`；不要用自动缩小字号来救所有溢出。
- 生成脚本用 `scripts/lib/text-metrics.mjs` 的 `fitLabel(text, {maxWidth, fontSize})`：返回 `value`（已含 `<br>`）、`width`、`height`，直接写进 `mxGeometry`。
- 菱形、椭圆、六边形、圆柱等形状内框更小，留出额外余量；`TEXT001` 通过后仍要目检一次。

## 6. 人工看什么

1. 每个箭头是否指向它该指的框（尤其判断分支）。
2. 文字有没有被边框裁掉、有没有换行到框外。
3. 容器标题是否压住子元素。
4. 线条是否穿过方块或文字。
5. 同一角色是否同色；颜色是否超过 4 种。
6. 图在 100% 缩放下是否还能读（字号 ≥ 11）。
7. 多页之间术语、命名、编号是否一致。

## 7. 常见误判

| 说法 | 事实 |
|---|---|
| "工具返回 URL 了，所以图没问题" | URL 只说明请求被接受；XML 未校验 |
| "lint 过了，所以能看" | lint 只证明结构和几何合法 |
| "Mermaid 渲染成功就是最终图" | 还需要确认标签未截断、方向符合预期 |
| "set_page 成功了，所以改对了" | 整页替换可能丢内容，必须 `get_page` 复读 |
