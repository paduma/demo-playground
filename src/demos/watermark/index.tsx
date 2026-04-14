import React, { useRef, useState, useCallback } from 'react';
import { Card, Form, Input, Slider, Switch, Button, Space, Tag, Typography, message, Divider, Alert } from 'antd';
import { SafetyOutlined, EyeInvisibleOutlined, DeleteOutlined, BgColorsOutlined } from '@ant-design/icons';
import { useWatermark, type WatermarkOptions } from './useWatermark';
import { encodeBlindWatermark, decodeBlindWatermark, createSampleCanvas } from './blindWatermark';

const { Text, Paragraph, Title } = Typography;

/** Mock document content for the preview area */
const MockDocument: React.FC = () => (
  <div style={{ padding: 24, lineHeight: 2, color: '#333' }}>
    <Title level={4}>Confidential Report — Q4 2025</Title>
    <Paragraph>This document contains sensitive business information and is intended solely for authorized personnel.
      Unauthorized distribution, copying, or disclosure is strictly prohibited.</Paragraph>
    <Paragraph>Revenue for Q4 reached ¥12.8M, representing a 23% increase over the previous quarter.
      The growth was primarily driven by expansion in the enterprise segment.</Paragraph>
    <Divider />
    <Paragraph>Key metrics:</Paragraph>
    <ul>
      <li>Monthly Active Users: 158,000 (+18%)</li>
      <li>Customer Retention Rate: 94.2%</li>
      <li>Average Revenue Per User: ¥81.0</li>
      <li>Net Promoter Score: 72</li>
    </ul>
    <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 24 }}>
      Document ID: DOC-2025-Q4-0042 | Classification: Internal
    </Paragraph>
  </div>
);

const WatermarkDemo: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [options, setOptions] = useState<WatermarkOptions>({
    text: '[name]@company.com',
    fontSize: 16,
    color: '#000000',
    opacity: 0.15,
    rotate: -22,
    gapX: 200,
    gapY: 120,
    useShadowDom: true,
  });

  const { refresh } = useWatermark(containerRef, options);

  // Blind watermark state
  const [blindText, setBlindText] = useState('[name] — 2025-12-01 10:30');
  const [encodedCanvas, setEncodedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [decodedText, setDecodedText] = useState<string>('');

  const updateOption = useCallback(<K extends keyof WatermarkOptions>(key: K, value: WatermarkOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  }, []);

  /** Simulate tamper attempts */
  const tryDeleteWatermark = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const host = container.querySelector('[data-watermark-host]');
    const wm = container.querySelector('[data-watermark]');
    if (host) {
      host.remove();
      message.info('Watermark deleted... watch it recover!');
    } else if (wm) {
      wm.remove();
      message.info('Watermark deleted... watch it recover!');
    }
  }, []);

  const tryHideWatermark = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const host = container.querySelector('[data-watermark-host]') as HTMLElement;
    const wm = container.querySelector('[data-watermark]') as HTMLElement;
    const target = host || wm;
    if (target) {
      target.style.display = 'none';
      message.info('Watermark hidden... watch it recover!');
    }
  }, []);

  /** Blind watermark encode */
  const handleEncode = useCallback(() => {
    if (!blindText.trim()) { message.warning('Enter text to encode'); return; }
    const source = createSampleCanvas();
    const encoded = encodeBlindWatermark(source, blindText);
    setEncodedCanvas(encoded);
    setDecodedText('');
    message.success('Blind watermark encoded!');
  }, [blindText]);

  /** Blind watermark decode */
  const handleDecode = useCallback(() => {
    if (!encodedCanvas) { message.warning('Encode first'); return; }
    const text = decodeBlindWatermark(encodedCanvas);
    setDecodedText(text);
    message.success('Decoded!');
  }, [encodedCanvas]);

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 64px)' }}>
      {/* Left: Config */}
      <div style={{ width: 260, flexShrink: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card size="small" title={<><BgColorsOutlined /> Watermark Config</>}>
          <Form size="small" layout="vertical">
            <Form.Item label="Text">
              <Input value={options.text} onChange={e => updateOption('text', e.target.value)} />
            </Form.Item>
            <Form.Item label={`Font Size: ${options.fontSize}px`}>
              <Slider min={10} max={32} value={options.fontSize} onChange={v => updateOption('fontSize', v)} />
            </Form.Item>
            <Form.Item label="Color">
              <Input type="color" value={options.color} onChange={e => updateOption('color', e.target.value)} style={{ width: 60 }} />
            </Form.Item>
            <Form.Item label={`Opacity: ${options.opacity}`}>
              <Slider min={0.02} max={0.3} step={0.01} value={options.opacity} onChange={v => updateOption('opacity', v)} />
            </Form.Item>
            <Form.Item label={`Rotate: ${options.rotate}°`}>
              <Slider min={-45} max={45} value={options.rotate} onChange={v => updateOption('rotate', v)} />
            </Form.Item>
            <Form.Item label="Shadow DOM isolation">
              <Switch checked={options.useShadowDom} onChange={v => updateOption('useShadowDom', v)} />
            </Form.Item>
          </Form>
        </Card>

        <Card size="small" title={<><SafetyOutlined /> Security Test</>}>
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            <Button size="small" block icon={<DeleteOutlined />} onClick={tryDeleteWatermark} danger>
              Try Delete Watermark
            </Button>
            <Button size="small" block icon={<EyeInvisibleOutlined />} onClick={tryHideWatermark} danger>
              Try Hide Watermark
            </Button>
            <Text type="secondary" style={{ fontSize: 11 }}>
              MutationObserver detects tampering and auto-recovers the watermark.
            </Text>
          </Space>
        </Card>

        <Card size="small" title={<><EyeInvisibleOutlined /> Blind Watermark</>}>
          <Form size="small" layout="vertical">
            <Form.Item label="Hidden text">
              <Input value={blindText} onChange={e => setBlindText(e.target.value)} placeholder="Text to hide in image" />
            </Form.Item>
          </Form>
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            <Button size="small" block type="primary" onClick={handleEncode}>
              Encode into Image
            </Button>
            <Button size="small" block onClick={handleDecode} disabled={!encodedCanvas}>
              Extract Hidden Text
            </Button>
            {decodedText && (
              <Alert type="success" message={<>Decoded: <Tag color="green">{decodedText}</Tag></>} />
            )}
          </Space>
        </Card>
      </div>

      {/* Center: Preview */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
        <Card size="small" title="Document Preview — Visible Watermark" style={{ flex: 1 }}>
          <div ref={containerRef} style={{ position: 'relative', minHeight: 400, background: '#fff', borderRadius: 6, overflow: 'hidden' }}>
            <MockDocument />
          </div>
        </Card>

        {encodedCanvas && (
          <Card size="small" title="Blind Watermark — Image Preview">
            <div style={{ display: 'flex', gap: 16, alignItems: 'start' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                  This image has hidden data (LSB of blue channel)
                </Text>
                <canvas ref={node => {
                  if (node && encodedCanvas) {
                    node.width = encodedCanvas.width;
                    node.height = encodedCanvas.height;
                    node.getContext('2d')!.drawImage(encodedCanvas, 0, 0);
                  }
                }} style={{ border: '1px solid #f0f0f0', borderRadius: 4, maxWidth: '100%' }} />
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default WatermarkDemo;
