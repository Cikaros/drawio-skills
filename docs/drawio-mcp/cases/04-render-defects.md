# 案例 04：修"线不显示 / 标签显示成标签"

## 症状

1. 节点都在，**一条边都看不到**。
2. 节点文字显示成 `<b>订单服务</b>`。

## 诊断顺序（不要先猜）

| 步 | 检查 | 命令/手段 |
|---|---|---|
| 1 | XML 是否可解析 | `validate-drawio.mjs` → `XML001` |
| 2 | 边是不是自闭合 | 搜 `<mxCell[^>]*edge="1"[^>]*/>` |
| 3 | 边有没有 geometry | `EDGE001` |
| 4 | source/target 是否存在 | `EDGE002` |
| 5 | label 是否含 HTML | 看 `value` 与 style 的 `html=1` |
| 6 | 线是否穿过方块/共用长段 | `EDGE005` / `EDGE006`；看 `exitX/exitY`、`entryX/entryY` 与 waypoint |
| 7 | 文字是否溢出/被裁 | `TEXT001`；看 `value` 长度、`fontSize`、`width/height`；长标签是否用 `<br>` 断行 |

## 根因 A：边被写成自闭合

```xml
<!-- 错：draw.io 不认 -->
<mxCell id="e1" edge="1" parent="1" source="a" target="b" style="edgeStyle=orthogonalEdgeStyle;html=1;"/>

<!-- 对 -->
<mxCell id="e1" edge="1" parent="1" source="a" target="b" style="edgeStyle=orthogonalEdgeStyle;html=1;">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>
```

lint 报 `EDGE001`。修完边立刻出现。

## 根因 B：有 HTML 但没开 html=1

```xml
<!-- 错：显示源码 -->
<mxCell value="&lt;b&gt;订单服务&lt;/b&gt;" style="rounded=1;" …/>

<!-- 对 -->
<mxCell value="&lt;b&gt;订单服务&lt;/b&gt;" style="rounded=1;whiteSpace=wrap;html=1;" …/>
```

lint 报 `STYLE001`（error）。注意：XML 里**必须**转义 `<`，否则 XML 本身就坏了——这是两层独立的问题。

## 根因 C：边挂错帧

边挂在 `1`，但两端都在 `lane2` 里。图能显示，但布局后线会绕到泳道外。lint 报 `EDGE004`，把 `parent` 改成 `lane2`。

## 验收

```bash
node scripts/validate-drawio.mjs --strict file.drawio
# 0 error(s), 0 warning(s)
```

再预览一次，确认箭头方向与标签位置。

## 经验

- 这类问题**全部可以在本地发现**，不需要开浏览器试错。
- 修复顺序固定：结构（XML）→ 引用（id/parent）→ 几何（geometry）→ 样式（html）。
- 修完不要只改一处：同一批生成的 cell 往往有同样的错，用搜索批量核对。
