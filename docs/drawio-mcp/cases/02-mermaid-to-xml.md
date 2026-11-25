# 案例 02：把 Mermaid 固化成可交付 XML

## 目标

先用 Mermaid 快速对齐结构，最终交付可编辑、可验收的 `.drawio`，不能停在"预览过一次"。

## 为什么不在 Mermaid 上收尾

- Mermaid 没有容器嵌套坐标，泳道/分层只能靠子图近似。
- 样式只能到 `classDef` 粒度，图例、注释、脚注都要另行处理。
- 自动布局的结果不稳定，改一个节点可能整图重排。

## 步骤

1. **Mermaid 探结构**（复杂图加 ELK）：

```json
{
  "content": "flowchart TD\n  A[提交] --> B{通过?}\n  B -->|是| C[归档]\n  B -->|否| D[退回]",
  "postLayout": "elk"
}
```

2. **抽三张清单**：节点（含文字）、边（含标签）、分组（哪些节点同容器）。不要抄 Mermaid 的坐标。
3. **按网格重排**：判断 160×90，其余 140×60；同列同 x。
4. **补 draw.io 原生能力**：容器、图例、注释层、每节点样式。
5. **校验 + 预览 + 落盘**。

## 对照表

| Mermaid | draw.io XML |
|---|---|
| `flowchart TD` | 竖向坐标递增；或 `postLayout:"elk"` |
| `subgraph 名称` | `swimlane;startSize=24;` + 子元素相对坐标 |
| `classDef step fill:…` | 每个 cell 的 `fillColor/strokeColor/fontColor` |
| `-->|是|` | 边的 `value="是"` + `labelBackgroundColor` |
| `style X fill:…` | 合并进该 cell 的 `style` 串 |

## 验收证据

- 节点数、边数与 Mermaid 源一致（逐条对）。
- `validate-drawio.mjs --strict` 零告警。
- 预览确认：分支标签没有压在线上，子图边界清楚。

## 踩到的坑

| 坑 | 处理 |
|---|---|
| 直接把 Mermaid 的自动坐标当"参考"手抄 | 不可得；重排更快也更整齐 |
| 忘记 Mermaid 默认紫色会带进 draw.io | 显式给所有节点 `fillColor` |
| ELK 预览时又手调坐标 | 两者只能选一个；定稿用哪种就先定下来 |
| 子图在 Mermaid 里是"逻辑分组"，在 draw.io 里变成容器后边挂错 | 按最内层公共容器改 `parent`，跑 `EDGE004` 检查 |
