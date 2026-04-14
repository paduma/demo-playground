import { useEffect, useRef, useCallback } from 'react';

export interface WatermarkOptions {
  text: string;
  fontSize?: number;
  color?: string;
  opacity?: number;
  rotate?: number;
  gapX?: number;
  gapY?: number;
  /** Use Shadow DOM to isolate watermark from external access */
  useShadowDom?: boolean;
}

const DEFAULT_OPTIONS: Required<WatermarkOptions> = {
  text: 'Watermark',
  fontSize: 16,
  color: '#000000',
  opacity: 0.08,
  rotate: -22,
  gapX: 200,
  gapY: 120,
  useShadowDom: true,
};

/** Generate watermark image via Canvas */
function createWatermarkImage(opts: Required<WatermarkOptions>): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const font = `${opts.fontSize}px sans-serif`;
  ctx.font = font;
  const metrics = ctx.measureText(opts.text);
  const textW = metrics.width + opts.gapX;
  const textH = opts.fontSize + opts.gapY;

  canvas.width = textW;
  canvas.height = textH;

  ctx.font = font;
  ctx.fillStyle = opts.color;
  ctx.globalAlpha = opts.opacity;
  ctx.translate(textW / 2, textH / 2);
  ctx.rotate((opts.rotate * Math.PI) / 180);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(opts.text, 0, 0);

  return canvas.toDataURL();
}

/** Create the watermark DOM element */
function createWatermarkEl(dataUrl: string): HTMLDivElement {
  const el = document.createElement('div');
  el.setAttribute('data-watermark', 'true');
  Object.assign(el.style, {
    position: 'absolute',
    inset: '0',
    pointerEvents: 'none',
    zIndex: '9999',
    backgroundImage: `url(${dataUrl})`,
    backgroundRepeat: 'repeat',
  } as CSSStyleDeclaration);
  return el;
}

/**
 * React hook for tamper-proof watermark.
 *
 * Features:
 * - Canvas-generated repeating watermark
 * - MutationObserver auto-recovery (anti-delete, anti-style-tamper)
 * - Optional Shadow DOM isolation
 */
export function useWatermark(containerRef: React.RefObject<HTMLElement | null>, options: WatermarkOptions) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const observerRef = useRef<MutationObserver | null>(null);
  const watermarkRef = useRef<HTMLDivElement | null>(null);
  const shadowRef = useRef<ShadowRoot | null>(null);

  const render = useCallback(() => {
    const container = containerRef.current;
    if (!container || !opts.text) return;

    // Ensure container is positioned
    const pos = getComputedStyle(container).position;
    if (pos === 'static') container.style.position = 'relative';

    const dataUrl = createWatermarkImage(opts);

    // Clean up previous
    observerRef.current?.disconnect();

    if (opts.useShadowDom) {
      // Shadow DOM mode — external JS cannot access watermark
      let shadow = shadowRef.current;
      if (!shadow) {
        const host = document.createElement('div');
        host.setAttribute('data-watermark-host', 'true');
        Object.assign(host.style, {
          position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '9999',
        } as CSSStyleDeclaration);
        shadow = host.attachShadow({ mode: 'closed' });
        shadowRef.current = shadow;
        container.appendChild(host);
      }
      const el = createWatermarkEl(dataUrl);
      shadow.innerHTML = '';
      shadow.appendChild(el);
      watermarkRef.current = el;

      // Observe host element deletion
      const host = shadow.host as HTMLElement;
      observerRef.current = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const removed of m.removedNodes) {
            if (removed === host) {
              container.appendChild(host);
            }
          }
          // Detect style tampering on host
          if (m.type === 'attributes' && m.target === host) {
            Object.assign(host.style, {
              position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '9999', display: 'block', visibility: 'visible', opacity: '1',
            } as CSSStyleDeclaration);
          }
        }
      });
      observerRef.current.observe(container, { childList: true, subtree: false });
      observerRef.current.observe(host, { attributes: true, attributeFilter: ['style', 'class'] });
    } else {
      // Simple mode — direct DOM
      const el = createWatermarkEl(dataUrl);
      container.appendChild(el);
      watermarkRef.current = el;

      // MutationObserver: auto-recover on delete or style tamper
      observerRef.current = new MutationObserver((mutations) => {
        for (const m of mutations) {
          // Detect deletion
          for (const removed of m.removedNodes) {
            if (removed === el) {
              container.appendChild(el);
              return;
            }
          }
          // Detect style/attribute tampering
          if (m.type === 'attributes' && m.target === el) {
            const fresh = createWatermarkEl(dataUrl);
            el.replaceWith(fresh);
            watermarkRef.current = fresh;
            return;
          }
        }
      });
      observerRef.current.observe(container, { childList: true, subtree: false });
      observerRef.current.observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
    }
  }, [containerRef, opts.text, opts.fontSize, opts.color, opts.opacity, opts.rotate, opts.gapX, opts.gapY, opts.useShadowDom]);

  useEffect(() => {
    render();
    return () => {
      observerRef.current?.disconnect();
    };
  }, [render]);

  /** Force re-render watermark */
  const refresh = useCallback(() => render(), [render]);

  return { refresh };
}
