# 案例 01：从零交付一页审批流程

## 目标

给一个报销审批流程画一页图，交付 `approval.drawio`，要求：两条分支、一个回退、颜色有语义、能直接打开。

## 关键判断

1. **交付形态**：要文件，所以不能只用 `open_drawio_xml`；先写 XML。
2. **布局**：7 个节点 + 1 个判断，属于简单流程图，手放网格即可，不需要 ELK。
3. **分支**：`金额 ≤ 5000` 是唯一判断；"材料不全"是异常回退，用虚线区分主路径。
4. **颜色角色**：开始绿、步骤蓝、判断黄、异常红、结束绿。

## 步骤

1. 定结构：

```text
提交 → 自动校验 → 金额≤5000?
  是 → 主管审批 → 财务复核 → 打款 → 完成
  否 → 财务复核
  材料不全 → 补充材料 → 重新提交（回到提交）
```

2. 按 180×120 网格排坐标（关键：判断菱形 160×90，与下方节点留 30 的间隙）。
3. 写 `<mxfile>`，所有 label 用 `html=1`，边带 `labelBackgroundColor`。
4. 校验：

```bash
node scripts/validate-drawio.mjs --strict examples/01-approval-flow.drawio
# 0 error(s), 0 warning(s)
```

5. 预览：把该页 `<mxGraphModel>` 传给 `open_drawio_xml`。

## 验收证据

- `validate-drawio.mjs --strict`：0 error / 0 warning。
- 页面 1169×827（A4 横向），所有节点在画布内。
- 两条分支的边标签分别用绿/红，回退边为虚线。

## 踩到的坑

| 坑 | 处理 |
|---|---|
| 判断菱形与"主管审批"垂直间距不足，箭头挤在一起 | 菱形 y=145、高 90，下方节点 y=280 |
| 回退边直接穿过"自动校验" | 走下方外侧，视觉上作为独立回路 |
| 一开始把回退边也设成实线 | 虚线只表达"补偿路径"，并加图例说明 |

## 可复用的部分

- 完整文件：`examples/01-approval-flow.drawio`
- 网格与尺寸：`skills/drawio-mcp/references/xml-cookbook.md` 第 2 节
- 配方骨架：`skills/drawio-mcp/references/recipes.md` 配方 1
