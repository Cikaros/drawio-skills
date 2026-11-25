---
name: drawio-mcp
description: 通过 draw.io MCP 生成、修改和校验 .drawio 图：open_drawio_xml / open_drawio_mermaid / open_drawio_csv 预览，list_pages / get_page / set_page 读写多页文件，get_drawio_reference 取语法，search_shapes 查图标。用于流程图、架构图、ER 图、泳道图、状态机、思维导图、组织架构图，修复箭头错位、标签显示成 <b>、容器越界、空白页，以及在无法打开浏览器时做静态校验。Use when working with draw.io/diagrams.net via MCP, authoring or editing .drawio XML, converting Mermaid into editable draw.io diagrams, or debugging a diagram that will not render.
---

# draw.io MCP 操作规范

目标：用最少调用产出**能打开、能看懂、能验收**的图；不把坏 XML 交给浏览器。

## 0. 先分清两种交付形态

| 你要的结果 | 正确路径 | 不要做的事 |
|---|---|---|
| 用户只想**看一张图** | `open_drawio_xml` / `open_drawio_mermaid` / `open_drawio_csv` → 浏览器预览 | 不要为了预览先造文件 |
| 需要**交付/入库的 .drawio 文件** | 自己写 XML 文件 → 本地校验 → 再预览 | 不要以为 `open_*` 会保存文件 |
| 修改**已存在的 .drawio** | `list_pages` → `get_page` → 改 → `set_page` → 复读 | 不要整文件重写，丢失其它页 |

**实测事实**：`open_drawio_*` 只返回 `Draw.io Editor URL` 并在默认浏览器打开，**不落盘**；它们也**不校验 XML**——畸形 XML 同样返回 URL，浏览器里才会失败。

## 1. 工具契约（当前会话实测）

| 工具 | 作用 | 落盘 | 关键点 |
|---|---|---|---|
| `open_drawio_xml(content, postLayout?, direction?, routing?)` | 用 mxGraphModel 打开编辑器 | ❌ | 传**单个 `<mxGraphModel>`**，不要 `<mxfile>`/`<diagram>` 包裹 |
| `open_drawio_mermaid(content, postLayout?)` | Mermaid 转可编辑图 | ❌ | 复杂流程图加 `postLayout:"elk"`；非流程图忽略该参数 |
| `open_drawio_csv(content)` | CSV 表格转图 | ❌ | 仅适合规则网格/组织架，不适合自由布局 |
| `list_pages(path)` | 列页 | ❌ | 返回 `index/id/name/approxSizeBytes`；索引 0 起 |
| `get_page(path, page)` | 读一页 | ❌ | 返回**解压后**的 `mxGraphModel`；page 可用索引、页名或 id |
| `set_page(path, page, content)` | 整页替换 | ✅ | content 必须是纯 `mxGraphModel`；返回 `Updated page N ("name") in <path>` |
| `get_drawio_reference(format)` | 取 xml / mermaid 参考 | ❌ | 每个会话各读一次足够，别反复读 |
| `search_shapes(query)` | 查形状/图标 style | ❌ | 依赖远程索引；离线报 `could not load the shape search index (fetch failed)` |

工具清单随部署变化：**以当前会话实际提供的工具为准**。缺 `set_page` 时不要假装写入了文件；缺 `search_shapes` 时用已知 style（见 `references/xml-cookbook.md`）。

## 2. 铁律

1. **先写文件，再预览**。要交付就落盘 `.drawio`，预览只是最后一眼。
2. **先校验，再打开**。`open_drawio_xml` 不校验；畸形 XML 在浏览器里才炸。用 `scripts/validate-drawio.mjs` 或本技能 `references/validation.md` 的检查表。
3. **一条边必须有 `<mxGeometry relative="1" as="geometry"/>`**，且不能用自闭合 `<mxCell .../>` 表示边。
4. **边挂在最内层公共容器上**；两端不在同一容器时 `parent="1"`。挂错帧会被布局引擎画歪。
5. **容器子元素坐标是相对容器的**；swimlane 的 `startSize` 是标题区，子元素必须让开。
6. **`html=1` 与转义同时成立**：label 里有 `<b>`/`<br>` 时必须 `html=1`，且 XML 里写成 `&lt;b&gt;`；换行用 `<br>` 或 `&#xa;`，禁止字面 `\n`。
7. **禁止 XML 注释**。draw.io 解析器不接受，且白白消耗 token。
8. **id 唯一且稳定**。改图沿用旧 id；新建用 `n1/d1/e1` 这类可读 id，不用随机串。
9. **一页一个主题**。同文件多页共享版本历史；页面名不带 `/`（会被规范化）。
10. **一套图一个主题**。颜色按角色分配（步骤/判断/开始结束/错误/数据/外部），不要每个框一种颜色。
11. **不发明形状**。需要行业图标时先 `search_shapes`；查不到就用基本形状 + 文字，别拼不存在的 style。
12. **不谎报验收**。没看过预览/导出就说"静态校验通过，未做视觉确认"。

## 3. 标准工作流（交付文件）

**第 1 步 定结构**：先写清节点、边、分组、方向（TD/LR）。超过 20 个节点或 3 个判断时，平面布局会挤，改用 `postLayout:"elk"` 或分层坐标。

**第 2 步 生成 XML**：从最小骨架开始，按 180×120 网格放节点（`x=col*180+40`，`y=row*120+40`，矩形 140×60，菱形 160×90）。

```xml
<mxfile host="app.diagrams.net" version="24.7.17">
  <diagram id="flow-1" name="主流程">
    <mxGraphModel pageWidth="1169" pageHeight="827" adaptiveColors="auto">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="n1" value="开始" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#E7F6EC;strokeColor=#8BCB9F;fontColor=#1B1F24;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="140" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="e1" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#8A94A6;labelBackgroundColor=#FFFFFF;" edge="1" parent="1" source="n1" target="n2">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

**第 3 步 本地校验**：

```bash
node scripts/validate-drawio.mjs --strict path/to/file.drawio
```

零 error 且零 warning 才继续。警告也要看：`LAYOUT001`（重叠）、`LAYOUT002`（越界）、`EDGE004`（边挂错帧）都是真实视觉缺陷。

只安装了本技能、没有仓库时：按 `references/validation.md` 第 2 节的规则表逐条人工核对；能带上仓库的 `shared/` 与 `scripts/validate-drawio.mjs` 就用脚本。

**第 4 步 预览**：把**当前页的 model**（不是整个 mxfile）传给 `open_drawio_xml`；需要左到右布局时加 `direction:"horizontal"`，有大量交叉时加 `routing:"libavoid"`。一次只预览一页，避免刷一屏标签页。

**第 5 步 汇报**：说明文件路径、页数、节点/边数量、校验结果；只有真的看过预览才说"视觉确认"。

## 4. 改已有文件

```text
list_pages(path) → 选 page（索引/页名/id）
get_page(path, page) → 得到 mxGraphModel
  只改需要改的 cell，保留 id 与其它页
set_page(path, page, 新 model) → 复读 get_page 确认
```

`set_page` 是**整页替换**：不要只传改动的片段；也不要把 `<diagram>`/`<mxfile>` 传进去。页面索引从 0 开始，越界会报 `Page index N out of range (file has M pages)`。

## 5. 布局与路由参数怎么选

| 场景 | 选择 |
|---|---|
| 手放坐标、要保留（架构、泳道、UML、平面图） | 不加 `postLayout`；边穿框时加 `routing:"libavoid"` |
| 流程图/状态机/决策树，结构由代码决定 | `postLayout:"elk"`，`direction:"vertical"` 或 `"horizontal"` |
| 稀疏、无交叉 | 两者都不加 |
| Mermaid 复杂流程图（≥20 节点 / ≥3 判断 / 有回边 / ≥3 终点） | `postLayout:"elk"` |

`postLayout` 与 `routing` **互斥**：ELK 自己会排边。ELK 会移动节点，手放坐标只剩"大致方向"意义。

## 6. 失败速查

| 症状 | 真实原因 | 处理 |
|---|---|---|
| 浏览器里空白/报错，但工具返回了 URL | `open_drawio_xml` 不校验 XML | 本地 lint；检查根节点是不是单个 `mxGraphModel` |
| 边不显示 | 边缺 `<mxGeometry relative="1"/>` 或被写成自闭合 | 补 geometry，展开成开闭标签 |
| 标签显示成 `<b>xxx</b>` | 有 HTML 但缺 `html=1`，或没转义 | 加 `html=1`，把 `<` 写成 `&lt;` |
| 文字里出现 `\n` | 用了字面反斜杠 n | 改 `<br>` 或 `&#xa;` |
| 新节点压在一起 | 两个节点放了同一个网格单元 | 一节点一单元；跑 lint 看 `LAYOUT001` |
| 子元素跑出泳道/容器 | 坐标当成了绝对坐标，或没让开 `startSize` | 相对父容器定位；`horizontal=0` 时 x ≥ startSize |
| 线穿过方块 | draw.io 默认路由器不做避障 | 加 `routing:"libavoid"`，或调整节点位置 |
| 图整体太挤 | 超过 ~20 节点仍在用原生布局 | `postLayout:"elk"`，或拆成多页 |
| `search_shapes` 报 fetch failed | 形状索引是远程资源 | 用基本形状/已知 style；不要重试到超时 |
| `set_page` 后其它页没了 | 传了整份文件而不是单页 model | 传纯 `mxGraphModel`；必要时从备份恢复 |
| `get_page` 报 index 越界 | 索引 0 起，或文件页数变了 | 先 `list_pages` 重新取索引 |

## 7. 交付前检查清单

- [ ] 文件能在 draw.io 打开（根节点正确、无注释、无未闭合标签）
- [ ] `validate-drawio.mjs --strict` 零 error；warning 已逐条判断
- [ ] 每条边都有 source/target 与 `relative="1"` 的 geometry
- [ ] 边挂在最内层公共容器上
- [ ] 容器子元素坐标相对父级，且让开 `startSize`
- [ ] 没有重叠节点、零尺寸节点、负尺寸
- [ ] 含 HTML 的 label 都有 `html=1` 且已转义
- [ ] 一页一个主题；多页时页名与 id 唯一
- [ ] 颜色按角色，不超过 4 种角色
- [ ] 至少预览过一页；没预览就写明"未做视觉确认"
- [ ] 交付说明里给出文件路径、页数、节点/边规模

## 参考

- `references/xml-cookbook.md`：形状、容器、泳道、表格布局、层、标签、主题的可复制 XML
- `references/mermaid.md`：28 种图的选择、ELK 触发条件、样式与降级
- `references/validation.md`：lint 规则、几何算法、预览与导出验收
- `references/recipes.md`：流程图、架构图、ER、泳道、多页改写的完整骨架
- `references/csv.md`：CSV 导入的最小可用格式与适用边界
