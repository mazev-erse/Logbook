/**
 * Initializes continuous corner (squircle) paint worklet for Chromium browsers
 * that support CSS Houdini Paint API, enabling G2 curvature continuity.
 */
export function initContinuousCorners() {
  if (typeof window === 'undefined') return;

  const CSSObj = (window as any).CSS;
  if (CSSObj && 'paintWorklet' in CSSObj) {
    try {
      const workletCode = `
        registerPaint('smooth-corners', class {
          static get inputProperties() { return ['--smooth-corners']; }
          paint(ctx, geom, properties) {
            const n = parseFloat(properties.get('--smooth-corners')?.toString() || '4') || 4;
            const w = geom.width / 2;
            const h = geom.height / 2;
            ctx.beginPath();
            for (let i = 0; i < 360; i++) {
              const rad = (i * Math.PI) / 180;
              const cos = Math.cos(rad);
              const sin = Math.sin(rad);
              const x = w + Math.sign(cos) * Math.pow(Math.abs(cos), 2 / n) * w;
              const y = h + Math.sign(sin) * Math.pow(Math.abs(sin), 2 / n) * h;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
          }
        });
      `;
      const blob = new Blob([workletCode], { type: 'text/javascript' });
      CSSObj.paintWorklet.addModule(URL.createObjectURL(blob));
    } catch {
      // Gracefully ignored if blocked or unsupported
    }
  }
}
