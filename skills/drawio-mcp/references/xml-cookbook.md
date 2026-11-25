# XML 速查（draw.io / mxGraph）

只列**能直接粘贴**的骨架。所有示例都满足：`html=1`、唯一 id、边带 `relative="1"` geometry、无 XML 注释。

## 1. 文档外壳

单页文件：

```xml
<mxfile host="app.diagrams.net" version="24.7.17">
  <diagram id="page-1" name="页面名">
    <mxGraphModel pageWidth="1169" pageHeight="827" adaptiveColors="auto">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

规则：

- `id="0"` 是根，`id="1"` 是默认层，**任何文件都必须有**。
- `diagram` 的 `name` 是页名；`id` 必须唯一；页名不要带 `/`。
- 页面内容可内联（上面）或压缩成文本（draw.io 的 "compressed" 选项）。`get_page` 对两种都会返回解压后的 XML。
- 直接给 MCP 预览时，只取 `<mxGraphModel>…</mxGraphModel>`，不要外壳。

## 2. 网格与尺寸

| 项 | 值 |
|---|---|
| 列坐标 | `x = col * 180 + 40` → 40, 220, 400, 580, 760 |
| 行坐标 | `y = row * 120 + 40` → 40, 160, 280, 400, 520 |
| 矩形 | 140 × 60 |
| 菱形 | 160 × 90 |
| 圆/终点 | 60 × 60 或 140 × 60（椭圆） |
| 文档 | 120 × 80 |
| 圆柱 | 100 × 70 |
| 最小间距 | 40（同层相邻节点之间） |

一节点一个单元。两个节点同坐标 = 叠在一起，lint 会报 `LAYOUT001`。

## 3. 常用形状

```xml
<mxCell id="n1" value="步骤" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EEF4FF;strokeColor=#9DB8F2;fontColor=#1B1F24;" vertex="1" parent="1">
  <mxGeometry x="40" y="40" width="140" height="60" as="geometry"/>
</mxCell>

<mxCell id="d1" value="判断？" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFF6E0;strokeColor=#E8C36A;fontColor=#1B1F24;" vertex="1" parent="1">
  <mxGeometry x="40" y="160" width="160" height="90" as="geometry"/>
</mxCell>

<mxCell id="t1" value="终点" style="ellipse;whiteSpace=wrap;html=1;fillColor=#E7F6EC;strokeColor=#8BCB9F;fontColor=#1B1F24;" vertex="1" parent="1">
  <mxGeometry x="40" y="280" width="140" height="60" as="geometry"/>
</mxCell>

<mxCell id="db1" value="数据库" style="shape=cylinder3;boundedLbl=1;whiteSpace=wrap;html=1;fillColor=#F3EEFF;strokeColor=#B9A6F0;" vertex="1" parent="1">
  <mxGeometry x="220" y="40" width="110" height="70" as="geometry"/>
</mxCell>

<mxCell id="doc1" value="文档" style="shape=document;whiteSpace=wrap;html=1;" vertex="1" parent="1">
  <mxGeometry x="400" y="40" width="120" height="80" as="geometry"/>
</mxCell>

<mxCell id="note1" value="注释" style="shape=note;whiteSpace=wrap;html=1;size=14;fillColor=#FFF9DB;strokeColor=#E9D58A;" vertex="1" parent="1">
  <mxGeometry x="580" y="40" width="160" height="80" as="geometry"/>
</mxCell>
```

其他语义形状：`shape=parallelogram`（输入输出）、`shape=hexagon`、`shape=cloud`、`shape=actor`（UML 用例）、`shape=umlLifeline`（时序图，优先用 Mermaid）、`shape=table`（见第 6 节）。

## 4. 边

```xml
<mxCell id="e1" value="是" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#8A94A6;fontColor=#1E7F3E;labelBackgroundColor=#FFFFFF;" edge="1" parent="1" source="d1" target="n2">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>
```

按图种选风格：

| 图种 | 风格 |
|---|---|
| 流程图/架构/泳道/BPMN | `edgeStyle=orthogonalEdgeStyle;rounded=1;` |
| 组织架构/家族树 | 加 `endArrow=none` |
| ER | `edgeStyle=entityRelationEdgeStyle;` + `startArrow=ERmandOne;endArrow=ERmany;` |
| 状态机 | 不加 `edgeStyle`，`endArrow=open;endSize=10;` |
| 依赖/异步 | `dashed=1;endArrow=open;` |
| 思维导图 | `edgeStyle=entityRelationEdgeStyle;startArrow=none;endArrow=none;curved=1;` |

标签：写在 `value` 上；`labelBackgroundColor=#FFFFFF`（或 `default`）让文字截断线条。1–3 个词，别写句子。

连接点：默认不写 `exitX/exitY/entryX/entryY`，也不加 `<Array as="points">`；一旦出现 `EDGE005`（共享段/折返）或 `EDGE006`（穿框），就必须显式写锚点与走廊。

### 4.1 端口与走廊

```xml
<mxCell id="e2" value="" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#5A626E;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" edge="1" parent="1" source="a" target="b">
  <mxGeometry relative="1" as="geometry">
    <Array as="points">
      <mxPoint x="540" y="290"/>
      <mxPoint x="540" y="430"/>
    </Array>
  </mxGeometry>
</mxCell>
```

规则：

- **端口分开**：同一形状的多条边用不同的 `exitY`/`entryY`（如 `0.25`、`0.5`、`0.75`）或不同边；不要一条进、一条出共用同一点，否则两个反向箭头会叠成一条线（`EDGE005`）。
- **走廊分开**：每条边占独立的水平/垂直走廊，间距至少 12px；两条边不要共享同一 y/x 的长段。
- **扇出排序**：从同一源扇出到同一行多个目标时，按目标从左到右把走廊从近到远排列（近目标走上侧走廊），避免每条边的落点竖线被外侧走廊横穿。
- **双向关系**：用一条 `startArrow=block;endArrow=block;` 的边并标“双向”，不要画两条完全重合、方向相反的边。
- **不穿框**：waypoint 放在行间/列间；线擦着边框可以，进入方块内部就是 `EDGE006`。
- **不穿标签**：lint 只把 `text` 分区标题当背景，不检测普通文字；走廊仍要避开标题、图例和 note。

> 本仓库的 `EDGE005` 会把同一条边原路折返也算作共享段；`EDGE006` 会跳过 source/target、`text` 分区标题、生命线与容器。

## 5. 容器与泳道

### 嵌套容器（架构图）

```xml
<mxCell id="vpc" value="VPC" style="swimlane;startSize=24;html=1;verticalAlign=top;fillColor=#F7F8FA;strokeColor=#D5DAE1;" vertex="1" parent="1">
  <mxGeometry x="40" y="40" width="720" height="360" as="geometry"/>
</mxCell>
<mxCell id="az1" value="可用区 A" style="swimlane;startSize=24;html=1;verticalAlign=top;fillColor=#FFFFFF;strokeColor=#D5DAE1;" vertex="1" parent="vpc">
  <mxGeometry x="20" y="40" width="320" height="280" as="geometry"/>
</mxCell>
<mxCell id="web1" value="web-1" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="az1">
  <mxGeometry x="30" y="40" width="120" height="60" as="geometry"/>
</mxCell>
```

- 子元素坐标**相对父容器**；`startSize` 是标题高度，子元素 `y ≥ startSize`（这里 40 ≥ 24）。
- 边挂最内层公共容器：web1→web2（分属两个 AZ）挂 `vpc`；同 AZ 内挂 `az1`。
- 容器自身要能连线时用 `swimlane`；纯装饰容器加 `container=1;pointerEvents=0;`。

### 水平泳道（BPMN 风格）

固定值：`x=0, y=lane*150, width=CANVAS_W, height=150`，`swimlane;horizontal=0;startSize=110;`，子元素 `x=120+col*180, y=45`。

```xml
<mxCell id="lane1" value="客户" style="swimlane;horizontal=0;startSize=110;html=1;fontStyle=1;fillColor=#F7F8FA;strokeColor=#D5DAE1;" vertex="1" parent="1">
  <mxGeometry x="0" y="0" width="1200" height="150" as="geometry"/>
</mxCell>
<mxCell id="n1" value="提交订单" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="lane1">
  <mxGeometry x="120" y="45" width="140" height="60" as="geometry"/>
</mxCell>
```

- `horizontal=0` 时标题在**左侧**，占 x 方向的 `startSize`。
- 跨泳道边挂 `parent="1"`；同泳道内两条节点的边挂该泳道。
- 泳道颜色按顺序取：`#F7F8FA #F6F9FF #FFF7F2 #F3FAF5 #FFFAF0 #FEF6F6`。

## 6. 交叉职能表（table 布局）

两维（角色 × 阶段）时用 `shape=table`，不要用手工泳道拼网格。

```xml
<mxCell id="tbl" style="shape=table;childLayout=tableLayout;startSize=0;collapsible=0;fillColor=none;" vertex="1" parent="1">
  <mxGeometry x="0" y="0" width="900" height="320" as="geometry"/>
</mxCell>
<mxCell id="r0" style="shape=tableRow;horizontal=0;startSize=0;collapsible=0;" vertex="1" parent="tbl">
  <mxGeometry width="900" height="40" as="geometry"/>
</mxCell>
<mxCell id="h1" value="下单" style="text;html=1;align=center;fontStyle=1;fillColor=#F2F4F7;" vertex="1" parent="r0">
  <mxGeometry x="140" width="380" height="40" as="geometry"/>
</mxCell>
<mxCell id="r1" style="shape=tableRow;horizontal=0;startSize=0;collapsible=0;" vertex="1" parent="tbl">
  <mxGeometry y="40" width="900" height="140" as="geometry"/>
</mxCell>
<mxCell id="a1" value="客户" style="fillColor=#EEF4FF;fontStyle=1;html=1;" vertex="1" parent="r1">
  <mxGeometry width="140" height="140" as="geometry"/>
</mxCell>
<mxCell id="c1" style="fillColor=none;" vertex="1" parent="r1">
  <mxGeometry x="140" width="380" height="140" as="geometry"/>
</mxCell>
<mxCell id="t1" value="提交订单" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="c1">
  <mxGeometry x="120" y="40" width="140" height="60" as="geometry"/>
</mxCell>
```

宽度不必精确加总，`tableLayout` 会归一化；不要给行/单元格设 `startSize`；不要把泳道塞进表格行。

## 6.5 ER 实体与 crow's foot

实体用 HTML 文本盒，不用 `shape=table`（那是交叉职能表）。固定 250×160，标题下一行 `<hr>` 分隔字段：

```xml
<mxCell id="peer" value="&lt;b&gt;PEER&lt;/b&gt;&lt;hr&gt;id &lt;font color=&quot;#C9302C&quot;&gt;PK&lt;/font&gt;&lt;br&gt;account_id &lt;font color=&quot;#5A626E&quot;&gt;FK&lt;/font&gt;&lt;br&gt;key&lt;br&gt;dns_label&lt;br&gt;ip / ipv6" style="rounded=0;whiteSpace=wrap;html=1;align=left;verticalAlign=top;spacing=6;fillColor=#EEF4FF;strokeColor=#9DB8F2;fontColor=#1B1F24;fontSize=11;" vertex="1" parent="1">
  <mxGeometry x="60" y="100" width="250" height="160" as="geometry"/>
</mxCell>
```

关系用 crow's foot：

```xml
<mxCell id="r1" value="1:N" style="edgeStyle=entityRelationEdgeStyle;html=1;startArrow=ERmandOne;endArrow=ERmany;endFill=0;strokeColor=#8A94A6;fontColor=#5A626E;labelBackgroundColor=#FFFFFF;" edge="1" parent="1" source="account" target="peer">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>
```

- 多对多用显式连接表（`GROUP_PEER`），不要画成两条直接的多对多线。
- `sources[]` / `destinations[]` 这类 JSON 数组是逻辑关系，用虚线并在标签写明，不要伪造外键。
- 字段多时增高到 180–200；超过 8 个字段就只留主键/外键/判别字段，其余放到数据字典。
- 所有实体都有 `account_id` 时在标题或 note 说明一次，不要每条线都画租户边。

## 7. 层与标签

层（可分别隐藏）：

```xml
<mxCell id="layer-notes" value="注释" parent="0"/>
<mxCell id="note1" value="说明" style="text;html=1;" vertex="1" parent="layer-notes">
  <mxGeometry x="40" y="200" width="300" height="24" as="geometry"/>
</mxCell>
```

标签（同一元素可多标签，用于过滤，需要 `<object>` 包裹）：

```xml
<object id="svc" label="订单服务" tags="core v1">
  <mxCell style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1">
    <mxGeometry x="40" y="40" width="160" height="70" as="geometry"/>
  </mxCell>
</object>
```

元数据 + 占位符：

```xml
<object id="srv1" label="&lt;b&gt;%name%&lt;/b&gt;&lt;br&gt;owner: %owner%" placeholders="1" name="api-1" owner="平台组">
  <mxCell style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1">
    <mxGeometry x="40" y="40" width="160" height="70" as="geometry"/>
  </mxCell>
</object>
```

`<object>` 上的 `label` 取代 `mxCell` 的 `value`；自定义属性就是普通 XML 属性；`%id% %width% %height% %date%` 等预置占位符无需声明。

## 8. 主题

一套图用一个主题。最少够用的角色色：

| 角色 | fill | stroke |
|---|---|---|
| 步骤 | `#EEF4FF` | `#9DB8F2` |
| 判断 | `#FFF6E0` | `#E8C36A` |
| 开始/结束 | `#E7F6EC` | `#8BCB9F` |
| 等待/重试 | `#FFF0E5` | `#F0B48A` |
| 错误/取消 | `#FDECEC` | `#EBA3A3` |
| 数据/存储 | `#F3EEFF` | `#B9A6F0` |
| 外部系统 | `#F2F4F7` | `#B8C0CC` |
| 容器 | `#F7F8FA` | `#D5DAE1` |
| 文字 | `#1B1F24` | — |

经典 draw.io 配色（用户点名时）：蓝 `#dae8fc/#6c8ebf`、绿 `#d5e8d4/#82b366`、黄 `#fff2cc/#d6b656`、橙 `#ffe6cc/#d79b00`、红 `#f8cecc/#b85450`、紫 `#e1d5e7/#9673a6`。

深色页：`<mxGraphModel background="#0F172A" adaptiveColors="none">`，文字 `#F1F5F9`，边 `#94A3B8`；不要混用浅色页的 `#1B1F24` 文字。

手绘风：`sketch=1;curveFitting=1;jiggle=2;fontFamily=Architects Daughter;` 加在每个 cell 上，颜色仍用上面的角色色。

## 9. 易错清单

- `<mxCell ... />` 自闭合表示边 → 不渲染；边必须带 `<mxGeometry relative="1"/>` 子元素。
- `value` 里的 `&`、`<`、`"` 必须转义；HTML 只对 `html=1` 生效。
- `<br>` 只在 `html=1` 下换行；否则用 `&#xa;`。
- 层 cell 的 `parent="0"`，且**没有** `vertex`/`edge` 属性。
- `object` 包裹时 id 写在 `object` 上，`mxCell` 不再写 id。
- 别把 `<mxfile>` 传给 `open_drawio_xml`。

## 10. 时序图生命线

生命线用 `shape=umlLifeline`，消息用 `edgeStyle=none` + `exitY/entryY` 百分比锚点；完整公式、分支、自检见 [sequences.md](sequences.md)。最小示例：`examples/07-sequence-lifelines.drawio`。
