# 贡献指南

## 可以贡献什么

| 类型 | 例子 | 需要附带 |
|---|---|---|
| 实测结论 | 新的工具行为、版本差异、错误信息 | 环境、日期、可复现步骤 |
| 校验规则 | 新的渲染缺陷检测 | 反例 XML + 单测 |
| 示例 | 新的 lint-clean `.drawio` | 通过 `--strict` |
| 文档 | 澄清、修正、补图 | 说明改动理由 |
| 技能改进 | 更短的路径、更准的触发描述 | 前后对比 |

不接受：没有出处的"应该"、大段复制上游文档、只改措辞的 PR。

## 内容规则

1. **区分硬规则与项目约定**。硬规则要写"违反会怎样"；项目约定要写"可覆盖"。
2. **标注证据等级**：实测 / 源码 / 推断 / 未知。未知项进 `known-unknowns.md`。
3. **不重复事实源**。工具契约写 `pitfalls.md`，XML 骨架写 `references/xml-cookbook.md`，别处只放链接。
4. **示例必须能跑**：`.drawio` 过 `--strict`；脚本只用 Node 内置模块。
5. **中文正文，英文触发词**：SKILL.md 的 `description` 要含英文关键词，便于触发。
6. **frontmatter 只写 `name` 和 `description`**。

## 流程

```bash
# 1. 改动
# 2. 自检
npm run verify

# 3. 如果是技能文件变动，重建 manifest
npm run manifest

# 4. 提交
git add -A
git commit -m "docs: ..."     # feat / fix / docs / test / chore
```

## 评审清单（提交前）

- [ ] `npm run verify` 通过
- [ ] 新规则有对应单测
- [ ] 新示例 `--strict` 零告警
- [ ] 相对链接可点开
- [ ] 结论有环境与日期（若与版本相关）
- [ ] 没把未验证项写成事实
- [ ] `CHANGELOG.md` 已更新（用户可见变更）

## 版本与提交信息

- `feat:` 新能力/新章节 → MINOR
- `fix:` 修正错误 → PATCH
- `docs:` 文档 → PATCH（或随功能一起 MINOR）
- `test:` 测试 → 不单独发版
- 破坏既有用法 → 在提交正文写 `BREAKING CHANGE:`，发 MAJOR

## 目录约定

- `docs/`：解释性文档，可有 README 风格的长文。
- `skills/`：技能目录内**不放** README/CHANGELOG，只放 `SKILL.md`、`references/`、`manifest.json`。
- `examples/`：只放能通过严格校验的源文件。
- `verification/`：探针、日志、兼容性矩阵；日志按日期命名。

## 报告问题

请附：

1. 期望 vs 实际；
2. 最小 XML 片段（能复现的最小 cell 集合）；
3. `validate-drawio.mjs --json` 输出；
4. MCP 工具返回的原文（尤其错误信息）；
5. 环境（OS、Node、MCP 版本、编辑器地址）。
