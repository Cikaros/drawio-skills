# 可复制配方

每个配方都能独立跑通。坐标遵循 180×120 网格；示例文件见仓库 `examples/`。

## 配方 1：一页流程图（含判断与回退）

```xml
<mxfile host="app.diagrams.net" version="24.7.17">
  <diagram id="flow-1" name="审批流程">
    <mxGraphModel pageWidth="1169" pageHeight="827" adaptiveColors="auto">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="n1" value="提交申请" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#E7F6EC;strokeColor=#8BCB9F;fontColor=#1B1F24;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="140" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="n2" value="自动校验" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EEF4FF;strokeColor=#9DB8F2;fontColor=#1B1F24;" vertex="1" parent="1">
          <mxGeometry x="220" y="40" width="140" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="d1" value="通过？" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFF6E0;strokeColor=#E8C36A;fontColor=#1B1F24;" vertex="1" parent="1">
          <mxGeometry x="400" y="25" width="160" height="90" as="geometry"/>
        </mxCell>
        <mxCell id="n3" value="人工复核" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EEF4FF;strokeColor=#9DB8F2;fontColor=#1B1F24;" vertex="1" parent="1">
          <mxGeometry x="400" y="160" width="140" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="n4" value="通过" style="ellipse;whiteSpace=wrap;html=1;fillColor=#E7F6EC;strokeColor=#8BCB9F;fontColor=#1B1F24;" vertex="1" parent="1">
          <mxGeometry x="580" y="40" width="140" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="e1" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#8A94A6;labelBackgroundColor=#FFFFFF;" edge="1" parent="1" source="n1" target="n2">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
        <mxCell id="e2" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#8A94A6;labelBackgroundColor=#FFFFFF;" edge="1" parent="1" source="n2" target="d1">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
        <mxCell id="e3" value="否" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#8A94A6;fontColor=#C9302C;labelBackgroundColor=#FFFFFF;" edge="1" parent="1" source="d1" target="n3">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
        <mxCell id="e4" value="是" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#8A94A6;fontColor=#1E7F3E;labelBackgroundColor=#FFFFFF;" edge="1" parent="1" source="d1" target="n4">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

要点：判断菱形比矩形高 30；两个分支的 y 不重叠；`e3/e4` 标签带颜色语义。

## 配方 2：嵌套架构图

步骤：

1. 外层容器 `sys`（720×400，`startSize=24`）。
2. 内层容器 `sub` 相对 `sys` 放在 `(210,40)`，尺寸 470×300。
3. `web` 相对 `sys` 放 `(30,60)`；`api/svc` 相对 `sub` 放 `(30,40)`、`(30,150)`。
4. 边归属：`web→api` 挂 `sys`；`api→svc` 挂 `sub`；`svc→db` 挂 `sys`。
5. 外部用户放在 `sys` 之外，边挂 `parent="1"`。

完整文件：`examples/02-service-architecture.drawio`。

常见错误：把 `api` 的绝对坐标直接写进 `sub`（会跑到容器外）；把 `web→api` 挂到 `sub`（端点不在 `sub` 里，`EDGE004`）。

## 配方 3：ER 图

```xml
<mxCell id="order" value="&lt;b&gt;ORDER&lt;/b&gt;&lt;hr&gt;id &lt;font color=&quot;#C9302C&quot;&gt;PK&lt;/font&gt;&lt;br&gt;customer_id FK&lt;br&gt;status" style="rounded=0;whiteSpace=wrap;html=1;align=left;verticalAlign=top;spacing=6;fillColor=#EEF4FF;strokeColor=#9DB8F2;fontColor=#1B1F24;" vertex="1" parent="1">
  <mxGeometry x="320" y="60" width="200" height="120" as="geometry"/>
</mxCell>
<mxCell id="rel" value="places" style="edgeStyle=entityRelationEdgeStyle;html=1;startArrow=ERmandOne;endArrow=ERmany;strokeColor=#8A94A6;fontColor=#5A626E;labelBackgroundColor=#FFFFFF;" edge="1" parent="1" source="customer" target="order">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>
```

- 实体用 `rounded=0`，字段 `align=left;verticalAlign=top;spacing=6`。
- 主键/外键用 `<font color>` 标注，比额外图例省地方。
- 关系用 `entityRelationEdgeStyle` + 鸦爪箭头；实体宽度固定 200，字段多就加高。

完整文件：`examples/03-er-schema.drawio`。

## 配方 4：泳道流程

固定参数：`width=1200`、每道 `height=150`、`horizontal=0;startSize=110`，子元素 `x=120+col*180, y=45`。跨道边 `parent="1"`，同道人内边挂泳道。

完整文件：`examples/04-swimlane-process.drawio`。

判断泳道宽度：`max_col*180 + 300`。最后一列右边留 140 的余量。

## 配方 5：改已有文件的一页

```text
1. list_pages("diagram.drawio")
   → [{index:0,name:"总览"},{index:1,name:"状态机"}]
2. get_page("diagram.drawio", "状态机")
   → <mxGraphModel>…</mxGraphModel>
3. 在内存里只改目标 cell：新增节点 / 改 value / 加边
4. set_page("diagram.drawio", "状态机", 新model)
   → Updated page 1 ("状态机") in …\diagram.drawio
5. get_page("diagram.drawio", "状态机") 复读，确认节点数与边数
```

- 不要传整份 `<mxfile>`。
- 不要改页 id；改名用页名参数定位。
- 改完 `list_pages` 确认页数没变。

## 配方 6：把 Mermaid 固化成 XML

1. 先用 `open_drawio_mermaid` 验证结构（复杂图加 `postLayout:"elk"`）。
2. 从 Mermaid 源码抄出**节点清单 + 边清单 + 分支标签**。
3. 按 180×120 重排；判断节点占 160×90。
4. 角色配色统一，边标签 ≤ 3 个词。
5. 本地 lint → 预览 → 落盘为 `.drawio`。

不要照抄 Mermaid 的自动坐标（不可得），也不要保留 Mermaid 的默认紫色。

## 配方 7：给图加图例

```xml
<mxCell id="legend" value="" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#D5DAE1;align=left;verticalAlign=top;spacing=8;" vertex="1" parent="1">
  <mxGeometry x="40" y="620" width="240" height="90" as="geometry"/>
</mxCell>
<mxCell id="lg1" value="实线 = 主路径" style="text;html=1;fontSize=11;align=left;" vertex="1" parent="1">
  <mxGeometry x="52" y="632" width="200" height="20" as="geometry"/>
</mxCell>
<mxCell id="lg2" value="虚线 = 补偿/异步" style="text;html=1;fontSize=11;align=left;" vertex="1" parent="1">
  <mxGeometry x="52" y="656" width="200" height="20" as="geometry"/>
</mxCell>
```

图例是"混用线型"的必要条件：一种线型只能有一个含义。

## 配方 8：压缩页与多页

- `get_page` 对压缩页返回**解压后** XML；`set_page` 会按该页原本的压缩状态写回。
- 需要批量生成多页时，自己拼 `<mxfile>` + 多个 `<diagram>`，比逐页 `set_page` 稳。
- 页 id 保持稳定（`overview`、`flow`），不要用随机串；页名可改。
