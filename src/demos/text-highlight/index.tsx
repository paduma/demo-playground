import React, { useState } from 'react';
import { Card, Input, Button, Tag, Space } from 'antd';
import TextHighlight from '@/demos/text-highlight/TextHighlight';
import type { HighlightRule } from '@/demos/text-highlight/TextHighlight';

const sampleText =
  '访问 https://example.com 查看详情。关键词包括：安全审核、内容监控。另外 www.test.org 也需要检查。安全审核是重点工作。';

const xssText = '这是一段包含 <script>alert("xss")</script> 的文本，React 节点方案会自动转义，不会执行脚本。';

const defaultRules: HighlightRule[] = [
  { keyword: '安全审核', color: '#ff9800' },
  { keyword: '内容监控', color: '#2196f3' },
  { keyword: '重点', color: '#f44336' },
];

const TextHighlightDemo: React.FC = () => {
  const [text, setText] = useState(sampleText);
  const [rules, setRules] = useState<HighlightRule[]>(defaultRules);
  const [newKeyword, setNewKeyword] = useState('');

  const colors = ['#ff9800', '#2196f3', '#f44336', '#4caf50', '#9c27b0', '#00bcd4'];

  const addRule = () => {
    if (!newKeyword.trim()) return;
    setRules((prev) => [...prev, { keyword: newKeyword.trim(), color: colors[prev.length % colors.length] }]);
    setNewKeyword('');
  };

  return (
    <Card title="多关键词文本高亮（React 节点方案）">
      <p style={{ color: '#666', marginBottom: 16 }}>
        基于 React 节点渲染，非 innerHTML，天然防 XSS。支持多关键词 + URL 高亮，优先级自动处理。
      </p>

      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8 }}>当前规则：</div>
        {rules.map((r, i) => (
          <Tag
            key={i}
            color={r.color}
            closable
            onClose={() => setRules((prev) => prev.filter((_, idx) => idx !== i))}
          >
            {r.keyword}
          </Tag>
        ))}
        <Space style={{ marginTop: 8 }}>
          <Input
            size="small"
            placeholder="添加关键词"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onPressEnter={addRule}
            style={{ width: 150 }}
          />
          <Button size="small" onClick={addRule}>添加</Button>
        </Space>
      </div>

      <Input.TextArea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      <Card size="small" title="渲染结果" style={{ marginBottom: 16 }}>
        <TextHighlight text={text} rules={rules} highlightUrls style={{ lineHeight: 2 }} />
      </Card>

      <Card size="small" title="XSS 防护演示">
        <TextHighlight
          text={xssText}
          rules={[{ keyword: 'script', color: '#f44336' }]}
          style={{ lineHeight: 2 }}
        />
      </Card>
    </Card>
  );
};

export default TextHighlightDemo;
