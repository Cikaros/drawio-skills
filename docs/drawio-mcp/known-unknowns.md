# 已知未知

以下行为**尚未验证**，不要在任何文档或汇报里写成事实。每条都给出关闭条件。

| # | 未知项 | 现状 | 关闭条件 |
|---|---|---|---|
| U1 | `libavoid` 路由在复杂架构图上的实际质量 | 只知道参数被接受，未逐图对比 | 用 20+ 节点、含交叉的图，分别导出有/无 libavoid 的 PNG 对比 |
| U2 | `postLayout:"elk"` 对泳道/嵌套容器的处理 | 未测；ELK 会重排，容器语义是否保留不明 | 用 `examples/02`、`examples/04` 跑 ELK，检查子元素是否仍在容器内 |
| U3 | `set_page` 对无 `name` 页的写回 | 只测了有名字的页 | 造一个无 name 的 `<diagram>`，set 后看 `list_pages` 的名字 |
| U4 | `set_page` 是否保留 `<diagram>` 上的自定义属性 | 只观察到 `name/id` 保留 | 加一个自定义属性，set 后 diff 文件 |
| U5 | CSV 导入的完整指令集 | 只验证了 `# label/# style/# connect` 能打开 | 逐条对照 draw.io CSV 规范做矩阵 |
| U6 | `search_shapes` 的离线缓存/镜像 | 只观察到 fetch failed 与 `DRAWIO_SHAPE_INDEX_URL` | 配置本地索引源，验证可用性 |
| U7 | 深色模式下 `adaptiveColors="auto"` 的实际取色 | 未在深色系统里逐色比对 | 深色主题下导出截图，比对 fill/stroke |
| U8 | PNG/SVG 导出的字体替换 | 无桌面版，未导出 | 在装桌面版的机器上导出含中文/Inter 的图 |
| U9 | 编辑器对超大图的性能边界 | 未测 | 500+ 节点图打开耗时与滚动流畅度 |
| U10 | `open_drawio_*` 在非默认浏览器/无浏览器环境的行为 | 只观察到"已在默认浏览器打开" | 无 GUI 环境跑一次，记录返回 |
| U11 | 手绘风 `sketch=1` 与主题色的叠加效果 | 未目视 | 导出对比 |
| U12 | draw.io 对重复页 id 的实际处理 | lint 会拦，编辑器行为未测 | 造重复 id 文件，用编辑器打开 |
| U13 | 各形状库 stencil 的具体名称与版本差异 | 未逐一目视；只把核心关键字列为 Tier B，品牌/行业图标列为 Tier C | 打开 `examples/06-shape-smoke-test.drawio` 逐格确认，把退化成矩形的项移出 Tier B；用 `search_shapes` 结果补充 Tier C 样例 |

## 维护规则

- 关闭一项时：把结论写进 `docs/drawio-mcp/pitfalls.md` 或 `conventions.md`，注明**实测日期与环境**，然后从本表删除。
- 新增未知项时写清"为什么现在不能下结论"，不要写"待确认"了事。
- 版本升级（MCP 或编辑器）后，U1/U2/U3 需要重测。
