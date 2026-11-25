# 实测陷阱与版本差异

本文件只写**实测过**的行为。环境：draw.io MCP（jgraph 版，8 个工具）+ `app.diagrams.net` 编辑器 + Windows / Node 22。日期 2026-11-25。

## 0. 一页结论

| 结论 | 证据 |
|---|---|
| `open_drawio_*` **不写文件** | 三个 open 工具都只返回 `Draw.io Editor URL`，没有任何路径参数或落盘提示 |
| `open_drawio_xml` **不校验 XML** | 故意少写 `</mxCell>`，仍返回 URL 并打开浏览器 |
| `list/get/set_page` 只操作**已存在**的文件 | 没有 create 工具；路径不存在时无法新建 |
| 压缩页必须用**纯 base64** | URI 编码的 payload 报 `invalid bit length repeat` |
| `set_page` 会**保留**原页压缩状态 | 改完文件仍是 base64 文本，页名保留 |
| `set_page` 成功消息里的页名可能是 `null` | 文件里页名其实在，别被消息误导 |
| `search_shapes` 依赖**远程索引** | 离线报 `could not load the shape search index (fetch failed)` |

## 1. 工具行为矩阵

| 调用 | 观察到的返回 |
|---|---|
| `open_drawio_xml(<两节点图>)` | `Draw.io Editor URL: https://app.diagrams.net/?grid=0&pv=0&border=10&edit=_blank#R…` + `The diagram has been opened in your default browser.` |
| `open_drawio_xml(<畸形 XML>)` | 同样返回 URL（**没有**报错） |
| `open_drawio_mermaid(flowchart, postLayout:"elk")` | URL 带 `#create={"type":"mermaid","compressed":true,"data":"…","version":"12"}` |
| `open_drawio_csv(带 # 指令的 CSV)` | URL 带 `#create={"type":"csv","compressed":true,…}` |
| `list_pages(两页文件)` | `[{"index":0,"id":"page-one","name":"Flow","approxSizeBytes":891},…]` |
| `get_page(path, 1)` | 返回该页 `<mxGraphModel>…</mxGraphModel>`（无 `<diagram>` 外壳） |
| `get_page(path, 9)` | `Error: Page index 9 out of range (file has 2 pages)` |
| `set_page(path, "Notes", model)` | `Updated page 1 ("Notes") in E:\…\sample.drawio.` |
| `set_page(path, 0, model)`（压缩页） | `Updated page 0 ("null") in …`，但文件内 `name='Packed'` 仍在 |
| `get_page`（URI 编码的压缩页） | `Error: Failed to decompress page content: invalid bit length repeat` |
| `search_shapes("aws lambda")` | `Error: could not load the shape search index (fetch failed). Set DRAWIO_SHAPE_INDEX_URL to override the source.` |

## 2. 逐条陷阱

### P1. 以为预览等于保存

**症状**：汇报"已生成 xxx.drawio"，但目录里没有文件。

**原因**：`open_*` 只是把模型编码进 URL 打开浏览器；没有任何工具提供输出路径。

**处理**：交付文件时自己写 `.drawio`（见 `skills/drawio-mcp/references/recipes.md`），预览是最后一步。没有写盘工具时不要宣称已保存。

**证据**：三个 open 工具的参数表里没有 path/out；返回体只有 URL。

### P2. 以为工具返回 URL 就是图没问题

**症状**：浏览器里白屏、控制台报解析错误，但调用"成功"。

**原因**：`open_drawio_xml` 直接把内容塞进 URL，不做 schema 校验。实测把 `<mxCell>` 的闭合标签删掉，仍然返回 URL。

**处理**：先跑 `node scripts/validate-drawio.mjs --strict file.drawio`，再看预览。

### P3. 压缩页编码错

**症状**：`get_page` 报 `Failed to decompress page content: invalid bit length repeat`。

**原因**：把 **URI 编码后**的 base64 写进了文件。draw.io 文件里存的是**纯 base64**；`encodeURIComponent` 只用于把同一段数据放进编辑器 URL。

**处理**：编码顺序固定为 `deflateRaw(encodeURIComponent(xml))` → `base64`，**不要再对 base64 做 URI 编码**。本仓库的解码器对两种写法都能容忍（会先尝试 `decodeURIComponent`），但 MCP 的文件读取只接受纯 base64。

**证据**：同一份 XML，URI 编码版本失败，纯 base64 版本 `get_page` 正常返回。

### P4. set_page 的消息说页名是 null

**症状**：`Updated page 0 ("null") in …`，以为页名丢了。

**原因**：成功消息取的字段与页名不同；实测文件里 `<diagram name='Packed'>` 未被改写。

**处理**：用 `list_pages` 复核页名，不要信消息里的 `"null"`。

### P5. set_page 整页替换

**症状**：改一页后其它页消失，或本页其它元素消失。

**原因**：`set_page` 的语义是替换整页内容，不是合并。

**处理**：先 `get_page` 拿完整 model，只改目标 cell，再整页写回；不要把 `<mxfile>`/`<diagram>` 传进去；改完复读。

### P6. 页面索引从 0 开始

**症状**：`Page index 9 out of range (file has 2 pages)`，或改错了页。

**处理**：先 `list_pages`，用返回的 `index` 或 `name` 定位；页名重复时用 id。

### P7. 搜索形状索引加载失败

**症状**：`could not load the shape search index (fetch failed)`。

**原因**：索引不在 npm 包内，首次调用才从 `cdn.jsdelivr.net` 拉取约 4.8 MB / 10,800 条 JSON；`postinstall` 只预取 libavoid，不预取索引。默认 CDN 在当前网络被 TLS 重置时，若本地也没有缓存，就会直接失败。

**2026-11-25 实测**：默认地址 `curl`/Node `fetch` 均为 `ECONNRESET`；`fastly.jsdelivr.net`、`testingcf.jsdelivr.net`、`raw.githubusercontent.com` 可正常返回完整索引。代理开启后 `search_shapes` 成功，并生成 `%LOCALAPPDATA%\drawio-mcp\shape-index.json`（约 5.1 MB）；本地索引源也能被 `loadShapeIndex` 读取（10,800 条）。

**处理**：优先用 `DRAWIO_SHAPE_INDEX_URL` 指向可用镜像或本地文件，或预置上述缓存（格式 `{etag, src}`）；仍然失败时再降级为基本形状 + 文字，并在汇报里说明。不要重试到超时。

### P8. Mermaid 复杂流程图挤成一团

**症状**：20+ 节点、多个判断、有回边时，原生布局重叠、线打结。

**处理**：`postLayout:"elk"`（或源码 frontmatter `config: layout: elk`）。注意 ELK 会重排，之后不要再手调坐标。

### P9. 把 `<mxfile>` 传给 open_drawio_xml

**症状**：浏览器里没有图，或只有空页。

**原因**：该工具只接受单个 `<mxGraphModel>`。

**处理**：从文件里取 `<mxGraphModel>…</mxGraphModel>` 再传；多页时一次一页。

### P10. 边用自闭合标签

**症状**：边完全不显示，节点正常。

**原因**：`<mxCell ... />` 缺少 `<mxGeometry relative="1"/>`，draw.io 不认为它是合法连线。

**处理**：边必须展开成开闭标签并带 geometry。

### P11. 容器坐标当成绝对坐标

**症状**：子元素跑到容器外，或整组偏移。

**原因**：子元素 `x/y` 相对父容器，且 swimlane 的 `startSize` 占掉标题区。

**处理**：`parent` 指向容器，坐标从容器左上角算；`horizontal=0` 的泳道标题在左侧。

### P12. 边挂错容器

**症状**：布局后线绕远、穿过容器标题、或在 ELK 下跑到画布外。

**原因**：边应挂在**最内层公共容器**；跨容器时挂 `parent="1"`。

**处理**：跑 lint 看 `EDGE004`；按提示改 parent。

### P13. 以为 `get_drawio_reference` 可以反复读

**症状**：上下文被两份长文档塞满。

**处理**：每个会话各读一次（xml、mermaid 各一次）即可；细节写进本仓库 references，不重复拉取。

### P14. 预览刷屏

**症状**：一次生成 5 页，浏览器开 5 个标签。

**处理**：批量内容先落盘 + lint，只预览最需要确认的一页；其余注明"未逐页预览"。

### P15. 云端编辑器的隐私边界

**事实**：`open_*` 的图内容编码在 URL 的 `#` 片段里；按浏览器规范，fragment 不会随请求发给服务器。但页面本身与脚本来自 `app.diagrams.net`。

**处理**：涉密/内网图不要走云端预览，改用本地 draw.io 桌面版打开文件；汇报时说明这一点。

## 3. 尚未验证（不要写成事实）

- `libavoid` 路由在真实复杂架构图上的具体绕行质量（只验证了参数被接受）。
- `postLayout:"elk"` 对容器/泳道图的处理（ELK 会重排，容器内坐标是否保持语义未测）。
- CSV 导入的全部指令（`# connect`、`# style`、`# label` 已用最小样例验证可打开）。
- `set_page` 对**未命名页**的页名处理（只测了有名字的页）。
- 深色模式 `adaptiveColors` 在编辑器里的实际取色。

见 `docs/drawio-mcp/known-unknowns.md`。
