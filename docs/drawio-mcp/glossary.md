# 术语表

| 术语 | 含义 | 注意 |
|---|---|---|
| `mxfile` | `.drawio` 文件根节点，含一个或多个 `diagram` | 直接传给 `open_drawio_xml` 会失败，要取里面的 model |
| `diagram` | 一"页"，有 `id` 与 `name` | 页名不带 `/`；id 要稳定 |
| `mxGraphModel` | 一页的图模型根节点 | 可含 `background`、`adaptiveColors` 等 |
| `root` | `mxGraphModel` 下的容器 | 必须包含 `id="0"` 与 `id="1"` |
| cell `0` | 图的根 cell | 所有层的父级 |
| cell `1` | 默认层 | 没指定层的元素都挂这里 |
| 层（layer） | `parent="0"`、无 `vertex/edge` 的 cell | 用于分组隐藏，不参与渲染顺序以外的事 |
| vertex | 有 `vertex="1"` 的 cell，即形状 | 需要 `mxGeometry` 宽高 |
| edge | 有 `edge="1"` 的 cell，即连线 | 必须有 `<mxGeometry relative="1"/>` |
| `parent` | cell 的归属容器或层 | 决定坐标系与 z 序 |
| `mxGeometry` | 位置与尺寸 | 顶点的 x/y 相对 parent；边用 `relative="1"` |
| `relative="1"` | 边几何的相对标志 | 缺失 → 边不渲染 |
| style | 分号分隔的键值串 | `rounded=1;html=1;fillColor=#…` |
| `html=1` | 允许 label 解析 HTML | 有 `<b>`/`<br>` 必须开，且 XML 转义 |
| `startSize` | swimlane 标题区尺寸 | 普通泳道占顶部；`horizontal=0` 占左侧 |
| `horizontal=0` | 泳道标题在左 | 子元素 x 必须 ≥ startSize |
| container | 带 `container=1` 的普通形状，可容纳子元素 | 需要 `pointerEvents=0` 避免抢连线 |
| group | 无边框容器 | 无标题，不参与连线 |
| `shape=table` | 表格布局容器，`childLayout=tableLayout` | 行是 `tableRow`，单元格是普通顶点 |
| `<object>` | 包在 `mxCell` 外的元数据壳 | id/label/tags 写在 object 上 |
| tags | 空格分隔的标签，用于过滤 | 需要 `<object>` 包裹 |
| placeholder | `%name%` 形式的占位符 | 需 `placeholders="1"` |
| 压缩页 | `diagram` 的文本内容为 base64(deflateRaw(uri(xml))) | 文件里用**纯 base64**，不要 URI 编码 |
| `postLayout: "elk"` | 服务端 ELK 分层重排 | 会移动节点；与 `routing` 互斥 |
| `routing: "libavoid"` | 避障正交路由 | 不改节点位置，只重算连线 |
| `edgeStyle=orthogonalEdgeStyle` | 直角连线 | 流程图/架构默认 |
| `edgeStyle=entityRelationEdgeStyle` | ER 专用，端点垂直出头 | 配鸦爪箭头 |
| `adaptiveColors` | 深色模式自动适配 | `auto` 默认；自定义深色时用 `none` |
| `app.diagrams.net` | 云端编辑器 | 预览会打开浏览器标签 |
| draw.io 桌面版 CLI | `drawio --export` | 导出 PNG/SVG 才需要 |

## 容易混淆

- **层 vs 页**：层是同一页内的可见性分组；页是独立画布。
- **容器 vs 分组**：容器有视觉边界/标题，可被连线；分组不可见，通常不可连线。
- **`value` vs `label`**：普通 `mxCell` 用 `value`；`<object>` 包裹时用 `label`。
- **压缩 vs 编码**：压缩是 deflate；编码是 base64；URL 里还会再套一层 URI 编码。三者不要混。
