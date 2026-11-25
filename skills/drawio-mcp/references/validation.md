# 校验与验收

draw.io MCP **不做校验**：`open_drawio_xml` 对畸形 XML 同样返回 URL。所以验收必须分三层，顺序不能反。

## 1. 三层验收

| 层 | 手段 | 能证明什么 | 不能证明什么 |
|---|---|---|---|
| L1 结构 | `node scripts/validate-drawio.mjs --strict file.drawio` | XML 可解析、引用完整、几何合法、标签不会渲染成源码 | 好不好看 |
| L2 渲染 | `get_page` 复读 / 浏览器预览 `open_drawio_xml` | 页面能被 draw.io 加载，元素确实出现 | 布局是否美观、文字是否被裁 |
| L3 视觉 | 人眼看预览；装了桌面版可 `drawio --export` 出 PNG/SVG | 重叠、截断、箭头指向、留白 | 内容是否正确 |

汇报时按层写：`L1 通过` / `L1+L2 通过，未做视觉确认` / `已目视预览第 1 页`。不要把 L1 说成"图没问题"。

## 2. lint 规则表

`shared/drawio-lint.mjs` 的规则，全部来自真实渲染缺陷：

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
| `GEO001` | error | 负尺寸 | 改正 |
| `GEO002` | error | 零尺寸（不可见） | 给宽高 |
| `GEO003` | warn | 页面层负坐标 | 平移到正区 |
| `GEO004` | warn | 顶点没有 geometry | 补 geometry |
| `STYLE001` | error | 有 HTML 标签但没有 `html=1` | 加 `html=1` 或去掉标签 |
| `STYLE002` | warn | 标签里有字面 `\n` | 改 `<br>` / `&#xa;` |
| `STYLE010` | warn | 边标签没有背景色，线会穿过文字 | 加 `labelBackgroundColor=#FFFFFF` |
| `LAYOUT001` | warn | 同父级下两个图形重叠 | 换网格单元 |
| `LAYOUT002` | warn | 子元素超出容器边界 | 缩小或移动 |
| `LAYOUT003` | warn | 子元素压在容器标题区 | 让开 `startSize` |
| `PAGE001` | error | 页 id 重复 | 改 id |
| `PAGE002` | warn | 页名重复 | 改名 |

警告不是"可忽略"：`LAYOUT001/002/003`、`EDGE004` 都是肉眼可见的缺陷。

## 3. 几何规则（lint 实际在算什么）

- **重叠**：同一 parent 下两个顶点的矩形交集 > 2px。嵌套容器的子元素与容器本身不算重叠。
- **容器越界**：`child.x + child.width > parent.width + 1`（或 y 方向同理）。
- **标题区**：普通 swimlane 的 `startSize` 占顶部，`child.y ≥ startSize`；`horizontal=0` 时占**左侧**，`child.x ≥ startSize`。
- **边归属**：从两端分别向上走 parent 链，最深公共祖先应是边的 parent；否则 `EDGE004`。
- **可见性**：宽或高为 0 → 不可见；负值 → 非法。

## 4. 预览流程

```text
1. node scripts/validate-drawio.mjs --strict file.drawio   # 0 error
2. get_page(file, page)                                     # 确认页内容
3. open_drawio_xml(<该页 mxGraphModel>, direction?, routing?) # 一次一页
```

参数：

- 需要左到右 → `direction:"horizontal"`。
- 边会穿框、但你要保留手放坐标 → `routing:"libavoid"`。
- 结构复杂、坐标只是草案 → `postLayout:"elk"`（会重排，别再手调坐标）。
- `postLayout` 与 `routing` 不要同时给。

## 5. 导出（可选）

装了 draw.io 桌面版才可用：

```powershell
drawio --export --format png --scale 2 --output out.png file.drawio
drawio --export --format svg --output out.svg file.drawio
```

没有桌面版时不要假装导出成功；改用浏览器预览 + 明确声明"未做视觉确认"。

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
