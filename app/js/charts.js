// Hand-rolled <canvas> charts: HiDPI-aware, responsive, animated, interactive.
import { animate, clamp, withAlpha } from "./utils.js";

function readTheme() {
  const s = getComputedStyle(document.documentElement);
  const v = (name) => s.getPropertyValue(name).trim();
  return {
    text: v("--text"),
    muted: v("--muted"),
    grid: v("--grid"),
    surface: v("--surface"),
    accent: v("--accent"),
    income: v("--income"),
    expense: v("--expense"),
    font: v("--font-sans") || "system-ui, sans-serif",
  };
}

/** Round a raw axis step up to 1, 2, 2.5 or 5 × 10ⁿ. */
export function niceStep(raw) {
  if (!(raw > 0) || !Number.isFinite(raw)) return 1;
  const exp = 10 ** Math.floor(Math.log10(raw));
  const f = raw / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp;
}

const row = (color, label, value) =>
  `<div class="tip-row"><i style="--c:${color}"></i><span>${label}</span><b>${value}</b></div>`;

class CanvasChart {
  constructor(canvas, { tooltip = null, format = String, compact = String } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.tooltip = tooltip;
    this.format = format;
    this.compact = compact;
    this.w = 0;
    this.h = 0;
    this.progress = 1;
    this.hover = null;
    this.data = null;
    this.onSelect = null;
    this.cancelAnimation = () => {};

    new ResizeObserver(() => this.resize()).observe(canvas);
    const track = (e) => {
      const r = canvas.getBoundingClientRect();
      this.setHover(this.hitTest(e.clientX - r.left, e.clientY - r.top));
    };
    canvas.addEventListener("pointermove", track);
    canvas.addEventListener("pointerdown", track);
    canvas.addEventListener("pointerleave", () => this.setHover(null));
    canvas.addEventListener("click", () => {
      if (this.hover != null) this.onSelect?.(this.hover);
    });
  }

  resize() {
    const { width, height } = this.canvas.getBoundingClientRect();
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.w = width;
    this.h = height;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }

  setData(data, { animated = true } = {}) {
    this.data = data;
    this.setHover(null);
    this.cancelAnimation();
    if (!animated) {
      this.progress = 1;
      this.draw();
      return;
    }
    this.cancelAnimation = animate(900, (p) => {
      this.progress = p;
      this.draw();
    });
  }

  draw() {
    if (!this.w || !this.data) return;
    this.t = readTheme();
    const { ctx } = this;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.save();
    this.render(ctx);
    ctx.restore();
  }

  setHover(hit) {
    if (hit === this.hover) return;
    this.hover = hit;
    this.canvas.style.cursor = hit != null && this.onSelect ? "pointer" : "";
    this.draw();
    if (hit == null) this.hideTip();
    else this.showTip(hit);
  }

  showTip(hit) {
    const info = this.tooltip && this.tooltipFor(hit);
    if (!info) return this.hideTip();
    const tip = this.tooltip;
    tip.innerHTML = info.html;
    tip.hidden = false;
    const x = clamp(info.x - tip.offsetWidth / 2, 4, this.w - tip.offsetWidth - 4);
    let y = info.y - tip.offsetHeight - 14;
    if (y < 4) y = info.y + 14;
    tip.style.translate = `${x}px ${y}px`;
  }

  hideTip() {
    if (this.tooltip) this.tooltip.hidden = true;
  }

  font(weight, size) {
    return `${weight} ${size}px ${this.t.font}`;
  }

  /** Grid lines + y labels. Returns the value→y mapper. */
  yAxis(ctx, { bottom, top, step, pad }) {
    const plotH = this.h - pad.t - pad.b;
    const y = (v) => pad.t + plotH * (1 - (v - bottom) / (top - bottom));
    ctx.font = this.font(500, 11);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 1;
    const ticks = Math.round((top - bottom) / step);
    for (let i = 0; i <= ticks; i++) {
      const v = bottom + i * step;
      const yy = Math.round(y(v)) + 0.5;
      ctx.strokeStyle = this.t.grid;
      ctx.setLineDash(v === 0 ? [] : [3, 4]);
      ctx.beginPath();
      ctx.moveTo(pad.l, yy);
      ctx.lineTo(this.w - pad.r, yy);
      ctx.stroke();
      ctx.fillStyle = this.t.muted;
      ctx.fillText(this.compact(v), pad.l - 8, yy);
    }
    ctx.setLineDash([]);
    return y;
  }

  render() {}
  hitTest() {
    return null;
  }
  tooltipFor() {
    return null;
  }
}

/* ============================== Donut ============================== */

export class DonutChart extends CanvasChart {
  render(ctx) {
    const { w, h, t } = this;
    const items = this.data.items;
    const total = items.reduce((s, d) => s + d.value, 0);
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.max(20, Math.min(w, h) / 2 - 10);
    const r = R * 0.68;
    this.geom = { cx, cy, R, r, arcs: [] };

    if (!total) {
      ctx.beginPath();
      ctx.arc(cx, cy, (R + r) / 2, 0, Math.PI * 2);
      ctx.lineWidth = R - r;
      ctx.strokeStyle = t.grid;
      ctx.stroke();
      this.centerText(ctx, "No spending", "—", "this month");
      return;
    }

    const full = Math.PI * 2 * this.progress;
    const gap = items.length > 1 ? 0.014 : 0;
    let angle = 0;
    items.forEach((d, i) => {
      const span = (d.value / total) * full;
      const a0 = angle - Math.PI / 2;
      const a1 = a0 + span;
      this.geom.arcs.push([angle, angle + span]);
      angle += span;
      if (span <= 0) return;

      const active = this.hover === i;
      const mid = (a0 + a1) / 2;
      const ox = active ? Math.cos(mid) * 6 : 0;
      const oy = active ? Math.sin(mid) * 6 : 0;
      const g = Math.min(gap, span / 3);
      ctx.beginPath();
      ctx.arc(cx + ox, cy + oy, R + (active ? 2 : 0), a0 + g, a1 - g);
      ctx.arc(cx + ox, cy + oy, r, a1 - g, a0 + g, true);
      ctx.closePath();
      ctx.globalAlpha = this.hover == null || active ? 1 : 0.3;
      ctx.fillStyle = d.color;
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    const hovered = this.hover != null ? items[this.hover] : null;
    if (hovered) {
      this.centerText(ctx, hovered.label, this.format(hovered.value),
        `${Math.round((hovered.value / total) * 100)}% of spend`);
    } else {
      this.centerText(ctx, "Total spent", this.format(total * this.progress),
        `${items.length} ${items.length === 1 ? "category" : "categories"}`);
    }
  }

  centerText(ctx, label, value, sub) {
    const { cx, cy, r } = this.geom;
    const maxW = r * 1.6;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let size = Math.max(14, Math.round(r * 0.3));
    ctx.font = this.font(750, size);
    while (ctx.measureText(value).width > maxW && size > 11) ctx.font = this.font(750, --size);
    ctx.fillStyle = this.t.text;
    ctx.fillText(value, cx, cy);

    const small = Math.max(10, Math.round(r * 0.13));
    ctx.font = this.font(600, small);
    ctx.fillStyle = this.t.muted;
    ctx.fillText(label, cx, cy - size * 0.95, maxW);
    ctx.font = this.font(500, small);
    ctx.fillText(sub, cx, cy + size * 0.95, maxW);
  }

  hitTest(x, y) {
    if (!this.geom) return null;
    const { cx, cy, R, r, arcs } = this.geom;
    const dist = Math.hypot(x - cx, y - cy);
    if (dist < r || dist > R + 8) return null;
    let a = Math.atan2(y - cy, x - cx) + Math.PI / 2;
    if (a < 0) a += Math.PI * 2;
    const i = arcs.findIndex(([a0, a1]) => a1 > a0 && a >= a0 && a < a1);
    return i === -1 ? null : i;
  }

  highlight(i) {
    this.setHover(i);
  }
}

/* ============================ Cash-flow bars ============================ */

export class BarChart extends CanvasChart {
  render(ctx) {
    const { w, h, t, progress } = this;
    const { months, selected } = this.data;
    const pad = { l: 56, r: 12, t: 14, b: 30 };
    const nets = months.map((m) => m.income - m.expense);
    const max = Math.max(0, ...months.flatMap((m) => [m.income, m.expense]), ...nets);
    const min = Math.min(0, ...nets);
    const step = niceStep((max - min) / 4 || 1);
    const top = Math.ceil(max / step) * step || step;
    const bottom = Math.floor(min / step) * step;
    const y = this.yAxis(ctx, { bottom, top, step, pad });

    const plotW = w - pad.l - pad.r;
    const gw = plotW / months.length;
    const bw = clamp(gw * 0.24, 4, 22);
    const zero = y(0);
    const radius = Math.min(6, bw / 2);
    this.geom = { pad, gw, y };

    const bar = (x, value, color) => {
      const hh = (zero - y(value)) * progress;
      if (hh <= 0.5) return;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, zero - hh, bw, hh, [radius, radius, 0, 0]);
      ctx.fill();
    };

    months.forEach((m, i) => {
      const cx = pad.l + gw * (i + 0.5);
      const isSel = m.key === selected;
      if (isSel || this.hover === i) {
        ctx.fillStyle = isSel ? withAlpha(t.accent, 0.1) : t.grid;
        ctx.beginPath();
        ctx.roundRect(cx - gw / 2 + 3, pad.t - 6, gw - 6, h - pad.t - pad.b + 12, 10);
        ctx.fill();
      }
      bar(cx - bw - 2, m.income, t.income);
      bar(cx + 2, m.expense, t.expense);

      ctx.font = this.font(isSel ? 700 : 500, 11.5);
      ctx.fillStyle = isSel ? t.text : t.muted;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(m.label, cx, h - 10);
    });

    // Net line, revealed left → right.
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, 0, plotW * progress, h);
    ctx.clip();
    ctx.strokeStyle = t.accent;
    ctx.lineWidth = 2.25;
    ctx.lineJoin = "round";
    ctx.beginPath();
    nets.forEach((n, i) => {
      const px = pad.l + gw * (i + 0.5);
      i ? ctx.lineTo(px, y(n)) : ctx.moveTo(px, y(n));
    });
    ctx.stroke();
    nets.forEach((n, i) => {
      ctx.beginPath();
      ctx.arc(pad.l + gw * (i + 0.5), y(n), this.hover === i ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = t.surface;
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }

  hitTest(x, y) {
    if (!this.geom) return null;
    const { pad, gw } = this.geom;
    if (x < pad.l || x > this.w - pad.r || y < 0 || y > this.h) return null;
    const i = Math.floor((x - pad.l) / gw);
    return i >= 0 && i < this.data.months.length ? i : null;
  }

  tooltipFor(i) {
    const m = this.data.months[i];
    const { pad, gw, y } = this.geom;
    const net = m.income - m.expense;
    return {
      x: pad.l + gw * (i + 0.5),
      y: y(Math.max(m.income, m.expense, net)),
      html: `<p class="tip-title">${m.title}</p>
        ${row("var(--income)", "Income", this.format(m.income))}
        ${row("var(--expense)", "Expenses", this.format(m.expense))}
        ${row("var(--accent)", "Net", this.format(net))}`,
    };
  }
}

/* ========================== Cumulative spend pace ========================== */

export class PaceChart extends CanvasChart {
  render(ctx) {
    const { w, h, t, progress } = this;
    const { daily, days, budget } = this.data;
    const pad = { l: 56, r: 14, t: 14, b: 28 };
    const cum = [];
    daily.reduce((s, v) => (cum.push(s + v), s + v), 0);
    const spent = cum.at(-1) ?? 0;

    const step = niceStep(Math.max(spent, budget, 1) / 4);
    const top = Math.ceil(Math.max(spent, budget, 1) / step) * step;
    const y = this.yAxis(ctx, { bottom: 0, top, step, pad });
    const plotW = w - pad.l - pad.r;
    const x = (i) => pad.l + (days > 1 ? i / (days - 1) : 0) * plotW;
    this.geom = { x, y, cum, pad };

    // x labels
    ctx.font = this.font(500, 11);
    ctx.fillStyle = t.muted;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    for (const d of [1, 8, 15, 22, days]) ctx.fillText(String(d), x(d - 1), h - 9);

    // Ideal budget pace
    const pace = (i) => (budget / days) * (i + 1);
    if (budget > 0) {
      ctx.strokeStyle = t.muted;
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x(0), y(pace(0)));
      ctx.lineTo(x(days - 1), y(budget));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = this.font(600, 11);
      ctx.textAlign = "right";
      ctx.fillText("Budget pace", x(days - 1), y(budget) - 8);
    }

    if (!cum.length) {
      ctx.font = this.font(500, 13);
      ctx.textAlign = "center";
      ctx.fillStyle = t.muted;
      ctx.fillText("Nothing spent yet", pad.l + plotW / 2, pad.t + (h - pad.t - pad.b) / 2);
      return;
    }

    const last = cum.length - 1;
    const over = budget > 0 && spent > pace(last);
    const color = over ? t.expense : t.accent;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, pad.l + (x(last) - pad.l) * progress + 6, h);
    ctx.clip();

    const line = new Path2D();
    cum.forEach((v, i) => (i ? line.lineTo(x(i), y(v)) : line.moveTo(x(i), y(v))));
    const area = new Path2D(line);
    area.lineTo(x(last), y(0));
    area.lineTo(x(0), y(0));
    area.closePath();

    const grad = ctx.createLinearGradient(0, pad.t, 0, y(0));
    grad.addColorStop(0, withAlpha(color, 0.32));
    grad.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = grad;
    ctx.fill(area);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.stroke(line);
    ctx.restore();

    const dot = this.hover ?? (progress === 1 ? last : null);
    if (dot != null) {
      if (this.hover != null) {
        ctx.strokeStyle = t.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.round(x(dot)) + 0.5, pad.t);
        ctx.lineTo(Math.round(x(dot)) + 0.5, y(0));
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(x(dot), y(cum[dot]), 5, 0, Math.PI * 2);
      ctx.fillStyle = t.surface;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }

  hitTest(px) {
    if (!this.geom?.cum.length) return null;
    const { pad, cum } = this.geom;
    const plotW = this.w - pad.l - pad.r;
    const i = Math.round(((px - pad.l) / plotW) * (this.data.days - 1));
    return clamp(i, 0, cum.length - 1);
  }

  tooltipFor(i) {
    const { x, y, cum } = this.geom;
    const { daily, budget, days, dateFor } = this.data;
    return {
      x: x(i),
      y: y(cum[i]),
      html: `<p class="tip-title">${dateFor(i)}</p>
        ${row("var(--expense)", "That day", this.format(daily[i]))}
        ${row("var(--accent)", "Month to date", this.format(cum[i]))}
        ${budget > 0 ? row("var(--muted)", "Budget pace", this.format((budget / days) * (i + 1))) : ""}`,
    };
  }
}

/* ============================== Sparkline ============================== */

export class Sparkline extends CanvasChart {
  render(ctx) {
    const { w, h, progress } = this;
    const { values } = this.data;
    const color = this.t[this.data.color] ?? this.data.color;
    if (values.length < 2) return;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const x = (i) => 3 + (i / (values.length - 1)) * (w - 6);
    const y = (v) => 4 + (h - 8) * (1 - (v - min) / span);

    ctx.beginPath();
    ctx.rect(0, 0, w * progress, h);
    ctx.clip();
    const line = new Path2D();
    values.forEach((v, i) => (i ? line.lineTo(x(i), y(v)) : line.moveTo(x(i), y(v))));
    const area = new Path2D(line);
    area.lineTo(x(values.length - 1), h);
    area.lineTo(x(0), h);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, withAlpha(color, 0.25));
    grad.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = grad;
    ctx.fill(area);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke(line);

    const lx = x(values.length - 1);
    const ly = y(values.at(-1));
    ctx.beginPath();
    ctx.arc(lx, ly, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}
