import React, { useMemo } from 'react';

export interface HighlightRule {
  keyword: string;
  color: string;
}

interface HighlightRange {
  start: number;
  end: number;
  color: string;
  priority: number;
}

export interface TextHighlightProps {
  text: string;
  rules?: HighlightRule[];
  highlightUrls?: boolean;
  urlColor?: string;
  style?: React.CSSProperties;
}

const URL_REGEX =
  /https?:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+|(?:www\.)?[a-zA-Z0-9-]+\.(?:com|net|org|io|cn|co)(?:\.[a-zA-Z]{2,})?(?=\s|$|[,.!?;])/gi;

/**
 * 计算所有高亮区间（关键词 + URL）
 */
const computeRanges = (text: string, rules: HighlightRule[], highlightUrls: boolean, urlColor: string): HighlightRange[] => {
  const ranges: HighlightRange[] = [];

  // URL 高亮（低优先级）
  if (highlightUrls) {
    let match: RegExpExecArray | null;
    const regex = new RegExp(URL_REGEX.source, 'gi');
    while ((match = regex.exec(text)) !== null) {
      ranges.push({ start: match.index, end: match.index + match[0].length, color: urlColor, priority: 0 });
    }
  }

  // 关键词高亮（按顺序递增优先级）
  rules.forEach(({ keyword, color }, i) => {
    if (!keyword) return;
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      ranges.push({ start: match.index, end: match.index + match[0].length, color, priority: i + 1 });
    }
  });

  return ranges;
};

/**
 * 逐字符应用最高优先级的高亮，生成不重叠的最终区间
 */
const resolveRanges = (text: string, ranges: HighlightRange[]): HighlightRange[] => {
  if (ranges.length === 0) return [];

  // 为每个字符找到最高优先级的区间
  const charPriority = new Int32Array(text.length).fill(-1);
  const charRangeIdx = new Int32Array(text.length).fill(-1);

  ranges.forEach((range, idx) => {
    for (let i = range.start; i < range.end && i < text.length; i++) {
      if (range.priority > charPriority[i]) {
        charPriority[i] = range.priority;
        charRangeIdx[i] = idx;
      }
    }
  });

  // 合并连续相同区间的字符
  const result: HighlightRange[] = [];
  let i = 0;
  while (i < text.length) {
    const rangeIdx = charRangeIdx[i];
    if (rangeIdx === -1) {
      const start = i;
      while (i < text.length && charRangeIdx[i] === -1) i++;
      result.push({ start, end: i, color: '', priority: -1 });
    } else {
      const start = i;
      const color = ranges[rangeIdx].color;
      while (i < text.length && charRangeIdx[i] === rangeIdx) i++;
      result.push({ start, end: i, color, priority: ranges[rangeIdx].priority });
    }
  }

  return result;
};

/**
 * 基于 React 节点的高亮渲染，天然防 XSS
 */
const buildNodes = (text: string, finalRanges: HighlightRange[]): React.ReactNode[] => {
  if (finalRanges.length === 0) return [text];

  return finalRanges.map((range, i) => {
    const segment = text.substring(range.start, range.end);
    if (!range.color) return <React.Fragment key={i}>{segment}</React.Fragment>;
    return (
      <span
        key={i}
        style={{ backgroundColor: range.color, padding: '1px 3px', borderRadius: 3 }}
      >
        {segment}
      </span>
    );
  });
};

const TextHighlight: React.FC<TextHighlightProps> = ({
  text,
  rules = [],
  highlightUrls = false,
  urlColor = '#7CFC00',
  style,
}) => {
  const nodes = useMemo(() => {
    if (!text) return null;
    const ranges = computeRanges(text, rules, highlightUrls, urlColor);
    const finalRanges = resolveRanges(text, ranges);
    return buildNodes(text, finalRanges);
  }, [text, rules, highlightUrls, urlColor]);

  return <span style={style}>{nodes}</span>;
};

export default TextHighlight;
