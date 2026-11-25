#!/usr/bin/env node
// Probe: MCP behaviour cannot be driven from a local script, so this prints the
// manual checklist that produced verification/log recordings. Run it, follow the
// steps in the agent session, and append the raw returns to a dated log.

const steps = [
  {
    id: 'M-01',
    tool: 'get_drawio_reference("xml")',
    expect: 'long style/container/layer reference',
    record: '是否包含 routing / postLayout / container 章节'
  },
  {
    id: 'M-02',
    tool: 'open_drawio_xml(<two nodes + edge>)',
    expect: 'Draw.io Editor URL + "opened in your default browser"',
    record: '是否出现任何文件路径（应当没有）'
  },
  {
    id: 'M-03',
    tool: 'open_drawio_xml(<malformed: drop a closing tag>)',
    expect: 'still returns a URL (no validation)',
    record: '浏览器里是否报错；错误文本'
  },
  {
    id: 'M-04',
    tool: 'open_drawio_mermaid(<flowchart with a decision>, postLayout:"elk")',
    expect: 'create payload type=mermaid',
    record: 'URL 是否含 type%22%3A%22mermaid'
  },
  {
    id: 'M-05',
    tool: 'open_drawio_csv(<2 rows + # style>)',
    expect: 'create payload type=csv',
    record: '编辑器是否可打开'
  },
  {
    id: 'M-06',
    tool: 'list_pages(<two-page file>)',
    expect: 'index/id/name/approxSizeBytes',
    record: '页数与顺序'
  },
  {
    id: 'M-07',
    tool: 'get_page(path, 1)',
    expect: 'unwrapped mxGraphModel',
    record: '是否含 <diagram>'
  },
  {
    id: 'M-08',
    tool: 'get_page(path, 9)',
    expect: 'Error: Page index 9 out of range (file has 2 pages)',
    record: '原文'
  },
  {
    id: 'M-09',
    tool: 'set_page(path, "Notes", <one-page model>)',
    expect: 'Updated page 1 ("Notes") in <abs path>',
    record: '随后 get_page 是否为新内容'
  },
  {
    id: 'M-10',
    tool: 'get_page(<URI-encoded compressed page>)',
    expect: 'Error: Failed to decompress page content: invalid bit length repeat',
    record: '原文'
  },
  {
    id: 'M-11',
    tool: 'set_page(<compressed page>) then read raw file',
    expect: 'compression preserved; message may say "null"',
    record: '文件内 name 与 payload 形态'
  },
  {
    id: 'M-12',
    tool: 'search_shapes("aws lambda")',
    expect: 'Error: could not load the shape search index (fetch failed)…',
    record: '是否离线；DRAWIO_SHAPE_INDEX_URL 是否可用'
  }
];

console.log('draw.io MCP manual probe checklist\n');
for (const step of steps) {
  console.log(`${step.id}  ${step.tool}`);
  console.log(`     expect: ${step.expect}`);
  console.log(`     record: ${step.record}\n`);
}
console.log('把每条返回原文（URL 可截断到 # 之前）写入 verification/log/<date>.md。');
console.log('任何与上面 expect 不符的结果，先记日志，再改 docs/drawio-mcp/pitfalls.md。');
