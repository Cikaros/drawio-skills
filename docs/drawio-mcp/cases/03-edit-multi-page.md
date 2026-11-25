# 案例 03：改多页文件的其中一页

## 目标

一个 `system.drawio` 有两页（`总览`、`状态机`），只给状态机加一个"已退款"状态与两条边，其它页与既有元素必须原样保留。

## 步骤

1. 列页：

```text
list_pages("system.drawio")
→ [{index:0,id:"overview",name:"总览"},{index:1,id:"order-state",name:"状态机"}]
```

2. 读目标页：

```text
get_page("system.drawio", "状态机")
→ <mxGraphModel>…</mxGraphModel>
```

3. 只改目标 cell：

- 新增 `s5`（已退款），放在 `s3` 下方空网格；
- 新增 `e5: s2 → s5`（`退款`，虚线）；
- 保留所有旧 id 与坐标。

4. 整页写回：

```text
set_page("system.drawio", "状态机", 新model)
→ Updated page 1 ("状态机") in E:\…\system.drawio
```

5. 复读校验：

```text
get_page("system.drawio", "状态机")   # 节点数 +1，边数 +1
list_pages("system.drawio")           # 仍是 2 页，页名未变
```

## 验收证据

- 页数不变，两页名称不变。
- 状态机页节点从 5 增至 6，边从 4 增至 5。
- `validate-drawio.mjs --strict` 零告警。

## 踩到的坑

| 坑 | 现象 | 处理 |
|---|---|---|
| 把整份 `<mxfile>` 传给 `set_page` | 页面结构被当成 model，写坏 | 只传 `<mxGraphModel>` |
| 只传新增片段 | 旧节点全没了 | `set_page` 是整页替换，必须先 `get_page` |
| 用索引定位后文件页序变了 | 改错页 | 优先用页名或 id |
| 成功消息显示 `("null")` | 以为页名丢了 | 实测页名在文件里；用 `list_pages` 复核 |
| 压缩页写回后变成明文 | 以为格式变了 | `set_page` 会保持原压缩状态；若变明文说明原页本来就没压缩 |

## 压缩页补充

读取压缩页时 `get_page` 返回解压后的 XML；写回时按原页的压缩状态处理。**不要**自己把 base64 塞进 `set_page` 的 content——它要的是 XML 文本。
