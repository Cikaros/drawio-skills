# XML 时序图：生命线与消息

Mermaid 的 `sequenceDiagram` 更快；需要**精确控制参与者位置、消息高度、标签背景、配色**，或时序页要和架构页同一套视觉时，用 XML。本文只讲 XML 写法，图种选择见 `scenarios.md`。

## 1. 页面与参与者

- 页面：1200×800 或 1600×1000；标题占 `y=14..68`。
- 参与者：`shape=umlLifeline`，宽 160，水平间距 220（160 + 60）。
- 最多 6 个参与者；第 7 个开始标签会挤在一起，拆页。
- 生命线 `y=96`，高度 560–750；页面底部留 100 给图例/页脚。

```xml
<mxCell id="p1" value="客户端" style="shape=umlLifeline;perimeter=lifelinePerimeter;size=16;html=1;fillColor=#EEF4FF;strokeColor=#9DB8F2;fontColor=#1B1F24;fontSize=12;" vertex="1" parent="1">
  <mxGeometry x="60" y="96" width="160" height="560" as="geometry"/>
</mxCell>
```

## 2. 消息的锚点算法

消息是一条**直线边**，两端锚在生命线中轴。不要依赖自动锚点：自动锚点会把箭头吸到生命线顶部或底部。

```text
exitY = (messageY - lifelineY) / lifelineHeight
entryY = 同一个值
```

例：生命线 `y=96`、高 `560`，消息在 `y=216`：

```text
(216 - 96) / 560 = 0.214
```

```xml
<mxCell id="m1" value="1. 请求" style="edgeStyle=none;html=1;exitX=0.5;exitY=0.214;exitDx=0;exitDy=0;entryX=0.5;entryY=0.214;entryDx=0;entryDy=0;endArrow=block;endFill=1;strokeColor=#5A626E;fontSize=11;fontColor=#3D4450;labelBackgroundColor=#FFFFFF;verticalAlign=bottom;" edge="1" parent="1" source="p1" target="p2">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>
```

- 同步调用：`endArrow=block;endFill=1;`
- 返回/异步：`dashed=1;endArrow=open;endFill=0;`
- 双向：`startArrow=block;startFill=1;endArrow=block;endFill=1;`
- 每条带标签的边都要 `labelBackgroundColor=#FFFFFF`，否则线会穿过文字。
- 消息 `y` 间距 ≥ 45；14 条以上拆页。

## 3. 编号与分支

- 标签统一 `1.`、`2.`、`3.`；分支用 `8a.`、`8b.`，不要在同一 y 画两条重叠箭头。
- 不画 UML `alt/opt` 框：XML 里用容器做框会让边的 `parent` 变复杂，容易触发 `EDGE004`。把分支写成两条不同 y 的消息 + 右侧 `note`，读者更容易扫。
- 失败路径用虚线 + 红/橙描边，并在 note 里写清触发条件。

## 4. 自消息与长标签

- 自消息（`source == target`）需要 3 个 waypoints，标签容易压住生命线；能拆成两步就拆。
- 标签 ≤ 40 个汉字；超长改成两行 `<br/>`，或把细节放 note。
- 参与者名 ≤ 12 个汉字；英文名保留原词，不要硬翻。

## 5. 图例与页脚

时序图通常只需要 2–4 个图例项：参与者、同步消息、返回消息、失败分支。页脚写 RPC/协议依据（proto 文件、handler），不要写“示意”。

## 6. 最小示例

完整可打开文件：`examples/07-sequence-lifelines.drawio`（4 个参与者、6 条消息、1 个 note）。

## 7. 自检

- [ ] 参与者 ≤ 6，消息 ≤ 14
- [ ] 每个消息都有 `exitY/entryY`，且值来自同一公式
- [ ] 所有带标签的边有 `labelBackgroundColor`
- [ ] 返回消息是虚线 + 开放箭头
- [ ] 分支用 `a/b` 编号或 note，不重叠
- [ ] 生命线底部没超出页面，图例/页脚不压线
- [ ] 页脚写了 proto 或代码依据
