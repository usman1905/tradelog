import { useEffect, useRef } from 'react';
import { money } from '../lib/format.js';

const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Draws on a canvas at device resolution and redraws when it is resized. */
function useCanvas(draw, deps, height) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const paint = () => {
      const dpr = window.devicePixelRatio || 1, w = canvas.clientWidth;
      if (!w) return;
      canvas.width = w * dpr; canvas.height = height * dpr;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.font = '11px Geist, system-ui, sans-serif';
      draw(ctx, w, height);
    };
    paint();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(paint) : null;
    ro?.observe(canvas);
    return () => ro?.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

export function EquityChart({ points, height = 260 }) {
  const ref = useCanvas((ctx, w, h) => {
    const pad = { l: 56, r: 12, t: 10, b: 24 };
    const values = [0, ...points.map(p => p.equity)];
    const min = Math.min(0, ...values), max = Math.max(0, ...values), span = max - min || 1;
    const x = i => pad.l + (i / Math.max(1, values.length - 1)) * (w - pad.l - pad.r);
    const y = v => pad.t + (1 - (v - min) / span) * (h - pad.t - pad.b);
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const v = min + (span * i) / 4, yy = y(v);
      ctx.strokeStyle = cssVar('--line'); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke();
      ctx.fillStyle = cssVar('--muted'); ctx.textAlign = 'right'; ctx.fillText(money(v), pad.l - 8, yy);
    }
    const last = values[values.length - 1], up = last >= 0, colour = cssVar(up ? '--up' : '--down');
    const fill = ctx.createLinearGradient(0, pad.t, 0, h - pad.b);
    fill.addColorStop(0, up ? 'rgba(34,197,94,.28)' : 'rgba(239,68,68,.28)'); fill.addColorStop(1, 'rgba(0,0,0,0)');
    const line = () => { ctx.beginPath(); values.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v)))); };
    line(); ctx.lineTo(x(values.length - 1), y(min)); ctx.lineTo(x(0), y(min)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    line(); ctx.strokeStyle = colour; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.fillStyle = colour; ctx.beginPath(); ctx.arc(x(values.length - 1), y(last), 3.5, 0, Math.PI * 2); ctx.fill();
    if (points.length) {
      ctx.fillStyle = cssVar('--muted');
      ctx.textAlign = 'left'; ctx.fillText(points[0].date, pad.l, h - 8);
      ctx.textAlign = 'right'; ctx.fillText(points[points.length - 1].date, w - pad.r, h - 8);
    }
  }, [points], height);
  return <canvas ref={ref} style={{ height }} role="img" aria-label="Equity curve" />;
}

const BINS = [-1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5];

export function RHistogram({ values, height = 260 }) {
  const ref = useCanvas((ctx, w, h) => {
    const counts = BINS.slice(0, -1).map((b, i) => values.filter(r => r >= b && r < BINS[i + 1]).length);
    const pad = { l: 10, r: 10, t: 22, b: 24 }, max = Math.max(1, ...counts), bw = (w - pad.l - pad.r) / counts.length;
    ctx.textAlign = 'center';
    counts.forEach((c, i) => {
      const bh = (c / max) * (h - pad.t - pad.b), xx = pad.l + i * bw;
      ctx.fillStyle = cssVar(BINS[i] < 0 ? '--down' : '--up');
      ctx.globalAlpha = 0.85; ctx.fillRect(xx + 3, h - pad.b - bh, bw - 6, bh); ctx.globalAlpha = 1;
      if (c) { ctx.fillStyle = cssVar('--ink'); ctx.fillText(c, xx + bw / 2, h - pad.b - bh - 8); }
      ctx.fillStyle = cssVar('--muted'); ctx.fillText(BINS[i] + 'R', xx + bw / 2, h - 8);
    });
  }, [values], height);
  return <canvas ref={ref} style={{ height }} role="img" aria-label="Distribution of results in R" />;
}
