# 使用说明

draw.io MCP 是"**编辑器的遥控器**"，不是"文件生成器"。理解这一点，后面的行为都顺。

## 1. 它由什么组成

| 层 | 是什么 | 谁负责 |
|---|---|---|
| MCP server | 提供 8 个工具，把参数转成编辑器 URL 或读写本地文件 | 部署方（jgraph drawio-mcp） |
| 编辑器 | `app.diagrams.net` 或桌面版，负责真正的渲染 | 浏览器/桌面版 |
| 文件 | `.drawio`（mxfile + 多页 mxGraphModel） | 你自己写、或 `set_page` 改 |

MCP **不含**渲染引擎，也不含导出器。所以"图长什么样"只能在编辑器里确认。

## 2. 工具的三种角色

### 2.1 预览器（open_*）

`open_drawio_xml` / `open_drawio_mermaid` / `open_drawio_csv`：

- 输入：图源（XML / Mermaid / CSV）。
- 输出：`Draw.io Editor URL`，并在默认浏览器打开。
- **不落盘、不校验**。

适用：确认结构、给人看一版、把 Mermaid 快速变成可编辑图。

### 2.2 文件读写（list/get/set_page）

- `list_pages(path)`：列页，返回 `index/id/name/approxSizeBytes`。
- `get_page(path, page)`：读一页，page 可以是索引、页名或 id；返回**解压后**的 `mxGraphModel`。
- `set_page(path, page, content)`：整页替换，content 必须是纯 `mxGraphModel`；保留该页原有压缩状态。

三者只能操作**已存在**的文件。新建文件要自己写（技能内 `scripts/lib/drawio-file.mjs` 的 `buildMxfile` 可以直接用；仓库根目录 `shared/drawio-file.mjs` 是兼容入口）。

### 2.3 知识（get_drawio_reference / search_shapes）

- `get_drawio_reference("xml")`：样式、容器、层、标签、主题、路由规则。
- `get_drawio_reference("mermaid")`：28 种图的关键字与语法。
- `search_shapes(query)`：返回 `style` 字符串，直接塞进 `mxCell`。

每个会话读一次参考即可；`search_shapes` 首次调用会下载约 4.8 MB 的远程索引，失败时按 `DRAWIO_SHAPE_INDEX_URL` → 本地缓存 → 基本形状降级的顺序处理（见 `pitfalls.md` P7）。

## 3. 推荐调用顺序

```text
① 定交付形态
   只要预览 → open_drawio_mermaid / open_drawio_xml
   要文件   → 写 .drawio（本地）→ lint → 预览
   改文件   → list_pages → get_page → 改 → set_page → get_page

② 需要语法细节 → get_drawio_reference（一次）
③ 需要行业图标 → search_shapes（可选；首次需下载索引，失败按 P7 处理）
④ 预览时选布局 → postLayout:"elk" 或 routing:"libavoid"（二选一）
```

## 4. 文件格式

`.drawio` 是 XML：

```xml
<mxfile>
  <diagram id="page-1" name="页面名">
    <mxGraphModel>
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        …
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

- 也可以只有一个裸 `<mxGraphModel>`（单页）。
- 页面内容可内联，也可以是压缩文本：`base64(deflateRaw(encodeURIComponent(xml)))`。
- 文件里**不要**放 XML 注释。

## 5. 环境与配置

- 编辑器地址默认 `https://app.diagrams.net`；离线/内网需要自建或桌面版。
- `DRAWIO_SHAPE_INDEX_URL` 可替换形状索引源（`search_shapes` 报 fetch failed 时）。默认缓存位于 `%LOCALAPPDATA%\drawio-mcp\shape-index.json`；代理或镜像可用时首次调用会自动写入。
- 每个 open 调用会开一个浏览器标签；批量预览会很吵。
- 仓库脚本只依赖 Node ≥ 20，无第三方包。

## 6. 与"画图"无关但常被问

**能不能直接导出 PNG/SVG？** MCP 没有导出工具。装了 draw.io 桌面版可以：

```powershell
drawio --export --format png --scale 2 --output out.png file.drawio
```

没有桌面版就只能靠编辑器里手工导出，或浏览器预览。

**能不能读取用户正在编辑器里改的内容？** 不能。MCP 只处理你给它的模型和本地文件，编辑器里的未保存修改不可见。

**能不能改云端文件？** 不能。没有云端文件 API，只有本地路径。

## 7. 相关文档

- 陷阱与实测：`docs/drawio-mcp/pitfalls.md`
- 命名与几何约定：`docs/drawio-mcp/conventions.md`
- 术语：`docs/drawio-mcp/glossary.md`
- 未验证项：`docs/drawio-mcp/known-unknowns.md`
- 实战：`docs/drawio-mcp/cases/`
