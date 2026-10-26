// Source for /lab/ — built into lab/app.js by `npm run build:lab`.
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  useReducedMotion,
} from "framer-motion";

/* ------------------------------------------------------------------ */
/* Shared animation core                                               */
/* ------------------------------------------------------------------ */

const FADE_MS = 500;
const white = (a) => `rgba(255,255,255,${a})`;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const easeInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

// rAF opacity fade that resumes from wherever the previous fade left off.
function fadeTo(el, target, duration = FADE_MS) {
  if (!el) return;
  cancelAnimationFrame(el._fadeRaf);
  const from = parseFloat(el.style.opacity || "0");
  const start = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - start) / duration);
    el.style.opacity = String(from + (target - from) * k);
    if (k < 1) el._fadeRaf = requestAnimationFrame(step);
  };
  el._fadeRaf = requestAnimationFrame(step);
}

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One rAF loop per canvas: DPR-aware sizing, paused while off-screen or the
 * tab is hidden, and a single pre-simulated static frame under reduced motion.
 * draw(ctx, { w, h, t, dt, state, isStatic })
 */
function useCanvasLoop(draw, { warmupMs = 2500 } = {}) {
  const ref = useRef(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const state = {};
    let w = 0, h = 0, t = 0, raf = 0, last = 0, visible = false, shown = false;

    const frame = (dt, isStatic = false) => {
      t += dt;
      ctx.clearRect(0, 0, w, h);
      drawRef.current(ctx, { w, h, t, dt, state, isStatic });
    };
    const renderStatic = () => {
      t = 0;
      for (const k of Object.keys(state)) delete state[k];
      const steps = Math.round(warmupMs / 16);
      for (let i = 0; i < steps; i++) frame(16, true);
      canvas.style.opacity = "1";
    };
    const loop = (now) => {
      frame(Math.min(50, now - last));
      last = now;
      if (!shown) { shown = true; fadeTo(canvas, 1); }
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (raf || reduced || !visible || document.hidden || !w) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width; h = r.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced) renderStatic();
      else if (!raf && w) frame(0);
      start();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      visible ? start() : stop();
    });
    io.observe(canvas);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);

    return () => {
      stop();
      cancelAnimationFrame(canvas._fadeRaf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reduced]);

  return ref;
}

function convexHull(points) {
  const p = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p;
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

// Traces a soft, padded blob around a set of points (a drawn hyperedge).
function blobPath(ctx, points, pad) {
  let hull = convexHull(points);
  if (hull.length < 2) return false;
  if (hull.length === 2) {
    const [a, b] = hull;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
    const nx = (-dy / d) * 0.5, ny = (dx / d) * 0.5;
    hull = [
      { x: a.x + nx, y: a.y + ny }, { x: b.x + nx, y: b.y + ny },
      { x: b.x - nx, y: b.y - ny }, { x: a.x - nx, y: a.y - ny },
    ];
  }
  const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length;
  const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length;
  const ex = hull.map((p) => {
    const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / d) * pad, y: p.y + (dy / d) * pad };
  });
  const n = ex.length;
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const m0 = mid(ex[n - 1], ex[0]);
  ctx.beginPath();
  ctx.moveTo(m0.x, m0.y);
  for (let i = 0; i < n; i++) {
    const m = mid(ex[i], ex[(i + 1) % n]);
    ctx.quadraticCurveTo(ex[i].x, ex[i].y, m.x, m.y);
  }
  ctx.closePath();
  return true;
}

// Smooth line through points (Catmull-Rom → Bézier).
function smoothLine(ctx, pts) {
  if (pts.length < 2) return;
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    ctx.bezierCurveTo(
      p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6,
      p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6,
      p2.x, p2.y
    );
  }
}

const MONO = "'JetBrains Mono', ui-monospace, monospace";

/* ------------------------------------------------------------------ */
/* HypergraphField — the cinematic background                          */
/* ------------------------------------------------------------------ */

const HYPER_HOLD_MS = 1500;
const PULSE_MS = 600;

function HypergraphField({
  density = 1,
  edgeAlpha = 0.18,
  hyperedges = true,
  interactive = true,
  linkCursor = true,
  topBias = true,
  seed = 7,
  className = "",
  label,
}) {
  const pointerRef = useRef(null);
  const ref = useCanvasLoop((ctx, { w, h, t, dt, state }) => {
    if (!state.nodes) {
      const rand = mulberry32(seed);
      const base = window.innerWidth < 768 ? 40 : 80;
      const count = Math.round(base * density);
      state.rand = rand;
      state.nodes = Array.from({ length: count }, () => ({
        u: 0.02 + rand() * 0.96,
        v: topBias ? 0.02 + Math.pow(rand(), 1.35) * 0.93 : 0.03 + rand() * 0.94,
        ax: 14 + rand() * 26, ay: 10 + rand() * 22,
        fx: 0.05 + rand() * 0.12, fy: 0.05 + rand() * 0.12,
        px: rand() * 6.28, py: rand() * 6.28,
        r: 1.2 + rand() * 1.0,
        glow: 0, lastFire: -1e9,
      }));
      state.hyper = [];
      state.pulses = [];
      state.nextHyper = 600;
      state.nextAuto = 2500;
    }
    const { nodes, rand } = state;
    const s = t / 1000;
    const n = nodes.length;
    const P = nodes.map((q) => ({
      x: q.u * w + q.ax * Math.sin(s * q.fx * 6.28 + q.px),
      y: q.v * h + q.ay * Math.cos(s * q.fy * 6.28 + q.py),
    }));
    const maxD = clamp(Math.sqrt((w * h) / n) * 1.05, 90, 175);

    // Proximity graph, rebuilt every frame as nodes drift.
    const adj = Array.from({ length: n }, () => []);
    ctx.lineWidth = 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = P[i].x - P[j].x, dy = P[i].y - P[j].y;
        const d = Math.hypot(dx, dy);
        if (d < maxD) {
          adj[i].push(j); adj[j].push(i);
          const g = Math.max(nodes[i].glow, nodes[j].glow);
          ctx.strokeStyle = white(edgeAlpha * (1 - d / maxD) * (1 + g * 1.5));
          ctx.beginPath(); ctx.moveTo(P[i].x, P[i].y); ctx.lineTo(P[j].x, P[j].y); ctx.stroke();
        }
      }
    }

    // Hyperedges: a seed node plus its nearest neighbours, faded in/out.
    if (hyperedges) {
      state.nextHyper -= dt;
      if (state.nextHyper <= 0 && state.hyper.length < 3) {
        state.nextHyper = 2500;
        const vis = [];
        for (let i = 0; i < n; i++) if (P[i].x > 40 && P[i].x < w - 40 && P[i].y > 80 && P[i].y < h * 0.8) vis.push(i);
        if (vis.length) {
          const seedNode = vis[Math.floor(rand() * vis.length)];
          const k = 2 + Math.floor(rand() * 3);
          const near = nodes
            .map((_, j) => j)
            .filter((j) => j !== seedNode)
            .sort((a, b) => Math.hypot(P[a].x - P[seedNode].x, P[a].y - P[seedNode].y) - Math.hypot(P[b].x - P[seedNode].x, P[b].y - P[seedNode].y))
            .slice(0, k)
            .filter((j) => Math.hypot(P[j].x - P[seedNode].x, P[j].y - P[seedNode].y) < Math.min(maxD * 1.3, 190));
          if (near.length >= 2) state.hyper.push({ members: [seedNode, ...near], age: 0 });
        }
      }
      const life = FADE_MS * 2 + HYPER_HOLD_MS;
      state.hyper = state.hyper.filter((e) => (e.age += dt) < life);
      for (const e of state.hyper) {
        const a = e.age < FADE_MS ? e.age / FADE_MS : e.age > FADE_MS + HYPER_HOLD_MS ? (life - e.age) / FADE_MS : 1;
        if (blobPath(ctx, e.members.map((i) => P[i]), 16)) {
          ctx.fillStyle = white(0.05 * a);
          ctx.fill();
          ctx.strokeStyle = white(0.35 * a);
          ctx.stroke();
        }
        for (const i of e.members) nodes[i].glow = Math.max(nodes[i].glow, 0.45 * a);
      }
    }

    // Message passing: pulses hop along edges for up to 2 hops.
    const fire = (i) => {
      if (t - nodes[i].lastFire < 900) return;
      nodes[i].lastFire = t;
      nodes[i].glow = 1;
      for (const j of adj[i].slice(0, 5)) state.pulses.push({ from: i, to: j, age: 0, hop: 0, k: 1 });
    };
    // Pointer position in this canvas's coordinates, read fresh each frame so scrolling stays accurate.
    const p = pointerRef.current;
    let local = null;
    if (p) {
      const r = ref.current.getBoundingClientRect();
      const x = p.cx - r.left, y = p.cy - r.top;
      if (x >= 0 && y >= 0 && x <= r.width && y <= r.height) local = { x, y };
    }
    if (interactive) {
      if (local && performance.now() - p.at < 120) {
        let best = -1, bd = 70;
        for (let i = 0; i < n; i++) {
          const d = Math.hypot(P[i].x - local.x, P[i].y - local.y);
          if (d < bd) { bd = d; best = i; }
        }
        if (best >= 0) fire(best);
      }
      state.nextAuto -= dt;
      const idle = !p || performance.now() - p.at > 3000;
      if (state.nextAuto <= 0 && idle) {
        state.nextAuto = 4000;
        const vis = [];
        for (let i = 0; i < n; i++) if (P[i].x > 0 && P[i].x < w && P[i].y > 0 && P[i].y < h * 0.8 && adj[i].length) vis.push(i);
        if (vis.length) fire(vis[Math.floor(rand() * vis.length)]);
      }
    }
    const next = [];
    for (const pu of state.pulses) {
      pu.age += dt;
      const k = Math.min(1, pu.age / PULSE_MS);
      const a = P[pu.from], b = P[pu.to];
      const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 7);
      g.addColorStop(0, white(0.9 * pu.k));
      g.addColorStop(1, white(0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, 6.283); ctx.fill();
      if (k < 1) { next.push(pu); continue; }
      nodes[pu.to].glow = Math.max(nodes[pu.to].glow, pu.k);
      if (pu.hop < 2) {
        for (const j of adj[pu.to].filter((j) => j !== pu.from).slice(0, 3)) {
          next.push({ from: pu.to, to: j, age: 0, hop: pu.hop + 1, k: pu.k * 0.6 });
        }
      }
    }
    state.pulses = next.slice(-140);

    // The mouse cursor joins the graph: faint links to its nearest nodes.
    if (linkCursor) {
      const on = local && p.mouse ? 1 : 0;
      state.cursorA = (state.cursorA || 0) + (on - (state.cursorA || 0)) * Math.min(1, dt / 180);
      if (on) state.cursorPos = local;
      if (state.cursorA > 0.01 && state.cursorPos) {
        const c = state.cursorPos, R = 170;
        const near = [];
        for (let i = 0; i < n; i++) {
          const d = Math.hypot(P[i].x - c.x, P[i].y - c.y);
          if (d < R) near.push([i, d]);
        }
        near.sort((x, y) => x[1] - y[1]);
        ctx.lineWidth = 1;
        for (const [i, d] of near.slice(0, 3)) {
          const k = (1 - d / R) * state.cursorA;
          ctx.strokeStyle = white(0.32 * k);
          ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(P[i].x, P[i].y); ctx.stroke();
          nodes[i].glow = Math.max(nodes[i].glow, 0.3 * k);
        }
        ctx.strokeStyle = white(0.45 * state.cursorA);
        ctx.beginPath(); ctx.arc(c.x, c.y, 3.5, 0, 6.283); ctx.stroke();
      }
    }

    // Nodes.
    for (let i = 0; i < n; i++) {
      const q = nodes[i];
      if (q.glow > 0.04) {
        ctx.fillStyle = white(0.1 * q.glow);
        ctx.beginPath(); ctx.arc(P[i].x, P[i].y, q.r * 6, 0, 6.283); ctx.fill();
      }
      ctx.fillStyle = white(0.65 + 0.35 * q.glow);
      ctx.beginPath(); ctx.arc(P[i].x, P[i].y, q.r * (1 + q.glow), 0, 6.283); ctx.fill();
      q.glow *= Math.exp(-dt / 450);
    }
  });

  useEffect(() => {
    if (!interactive && !linkCursor) return;
    const onMove = (e) => {
      pointerRef.current = { cx: e.clientX, cy: e.clientY, at: performance.now(), mouse: e.pointerType === "mouse" };
    };
    const onLeave = () => { pointerRef.current = null; };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [interactive, linkCursor]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={label || "Animated hypergraph: drifting nodes, highlighted hyperedges and message-passing pulses"}
      className={`block h-full w-full ${className}`}
      style={{ opacity: 0 }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Mini visualizations for the research cards                          */
/* ------------------------------------------------------------------ */

// 1-factorization of K6: 5 rounds of 3 disjoint pairs. All 15 pairs = 15 data
// blocks, each stored on 2 of 6 servers; every round touches every server once.
const K6_ROUNDS = Array.from({ length: 5 }, (_, r) => [
  [5, r],
  [(r + 1) % 5, (r + 4) % 5],
  [(r + 2) % 5, (r + 3) % 5],
]);
const K6_BLOCKS = K6_ROUNDS.flat();

function AllocationViz({ className = "h-40" }) {
  const ref = useCanvasLoop((ctx, { w, h, dt, state }) => {
    const COL_MS = 220, HOLD = 1800, OUT = 600;
    const cycle = K6_BLOCKS.length * COL_MS + HOLD + OUT;
    state.c = ((state.c || 0) + dt) % cycle;
    const c = state.c;
    const filled = c / COL_MS;
    const fade = c > cycle - OUT ? (cycle - c) / OUT : 1;

    const left = 26, top = 6, barH = 30;
    const gw = w - left - 4, gh = h - top - barH - 8;
    const gap = 6;
    const cols = K6_BLOCKS.length;
    const cw = (gw - gap * 4) / cols;
    const ch = gh / 6;
    const cell = Math.min(cw, ch) * 0.78;

    ctx.font = `9px ${MONO}`;
    ctx.textBaseline = "middle";
    for (let s = 0; s < 6; s++) {
      ctx.fillStyle = white(0.45);
      ctx.fillText(`S${s + 1}`, 0, top + ch * s + ch / 2);
    }
    K6_BLOCKS.forEach((pair, j) => {
      const round = Math.floor(j / 3);
      const x = left + j * cw + round * gap + (cw - cell) / 2;
      const on = clamp(filled - j, 0, 1);
      for (let s = 0; s < 6; s++) {
        const y = top + ch * s + (ch - cell) / 2;
        const has = pair.includes(s);
        ctx.beginPath();
        ctx.roundRect(x, y, cell, cell, 2);
        if (has && on > 0) {
          const active = filled - j < 1.6 ? 1 : 0;
          ctx.fillStyle = white((0.35 + 0.55 * on + 0.1 * active) * fade);
          ctx.fill();
        } else {
          ctx.strokeStyle = white(0.1);
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    });

    // Communication load bar shrinking onto the converse.
    const progress = clamp(filled / cols, 0, 1);
    const conv = 0.42;
    const load = conv + (1 - conv) * Math.pow(1 - progress, 1.6);
    const by = h - barH + 8;
    ctx.fillStyle = white(0.08);
    ctx.beginPath(); ctx.roundRect(left, by, gw, 5, 3); ctx.fill();
    ctx.fillStyle = white(0.85);
    ctx.beginPath(); ctx.roundRect(left, by, gw * load, 5, 3); ctx.fill();
    const cx = left + gw * conv;
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = white(progress >= 1 ? 0.9 : 0.5);
    ctx.beginPath(); ctx.moveTo(cx, by - 6); ctx.lineTo(cx, by + 11); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = white(0.45);
    ctx.fillText("load", 0, by + 2.5);
    ctx.fillStyle = white(progress >= 1 ? 0.9 : 0.55);
    ctx.fillText("converse", cx + 5, by + 16);
  });
  return (
    <canvas ref={ref} role="img" style={{ opacity: 0 }} className={`block w-full ${className}`}
      aria-label="Fifteen data blocks placed on pairs of six servers, round by round, while the communication load shrinks onto the converse bound" />
  );
}

const ES_NODES = [
  [0.1, 0.22], [0.3, 0.12], [0.16, 0.55], [0.36, 0.5], [0.14, 0.86],
  [0.64, 0.18], [0.88, 0.3], [0.66, 0.62], [0.9, 0.82],
];
const ES_PART_B = new Set([5, 6, 7, 8]);
const ES_EDGES = [
  [0, 1, 3], [2, 3, 4], [1, 3, 5], [3, 5, 7], [5, 6, 7],
  [2, 3, 7], [6, 7, 8], [3, 7, 8], [1, 5, 6], [4, 7, 8],
];
const ES_P = 0.4;
const ES_CUT = ES_EDGES.filter((e) => e.some((i) => ES_PART_B.has(i)) && e.some((i) => !ES_PART_B.has(i)));
const ES_M = ES_CUT.length;
const binom = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; };
const ES_PMF = Array.from({ length: ES_M + 1 }, (_, k) => binom(ES_M, k) * ES_P ** k * (1 - ES_P) ** (ES_M - k));
const ES_TARGET = 200;

function EdgeSamplingViz({ className = "h-40" }) {
  const ref = useCanvasLoop((ctx, { w, h, dt, state, isStatic }) => {
    if (!state.hist) {
      state.hist = new Array(ES_M + 1).fill(0);
      state.shown = new Array(ES_M + 1).fill(0);
      state.n = 0; state.acc = 0; state.hold = 0;
      state.active = ES_EDGES.map(() => false);
      state.rand = mulberry32(11);
    }
    if (isStatic) {
      state.hist = ES_PMF.map((p) => p * ES_TARGET);
      state.n = ES_TARGET;
    } else if (state.hold > 0) {
      state.hold -= dt;
      if (state.hold <= 0) { state.hist.fill(0); state.n = 0; }
    } else {
      state.acc += dt;
      while (state.acc > 60) {
        state.acc -= 60;
        state.active = ES_EDGES.map(() => state.rand() < ES_P);
        const cut = ES_EDGES.filter((e, i) => state.active[i] && ES_CUT.includes(e)).length;
        state.hist[cut]++; state.n++;
        if (state.n >= ES_TARGET) { state.hold = 1500; break; }
      }
    }
    for (let k = 0; k <= ES_M; k++) {
      state.shown[k] += (state.hist[k] - state.shown[k]) * (isStatic ? 1 : Math.min(1, dt / 120));
    }

    // Left: the sampled hypergraph and its 2-way partition.
    const lw = w * 0.44, pad = 10;
    const pt = (i) => ({ x: pad + ES_NODES[i][0] * (lw - 2 * pad), y: 14 + ES_NODES[i][1] * (h - 28) });
    ES_EDGES.forEach((e, i) => {
      if (!state.active[i]) return;
      const isCut = ES_CUT.includes(e);
      if (blobPath(ctx, e.map(pt), 7)) {
        ctx.fillStyle = white(isCut ? 0.09 : 0.04);
        ctx.fill();
        ctx.strokeStyle = white(isCut ? 0.6 : 0.22);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
    const divX = pad + 0.5 * (lw - 2 * pad);
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = white(0.35);
    ctx.beginPath(); ctx.moveTo(divX, 4); ctx.lineTo(divX, h - 4); ctx.stroke();
    ctx.setLineDash([]);
    ES_NODES.forEach((_, i) => {
      const p = pt(i);
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 6.283);
      if (ES_PART_B.has(i)) { ctx.strokeStyle = white(0.9); ctx.lineWidth = 1.2; ctx.fillStyle = "#000"; ctx.fill(); ctx.stroke(); }
      else { ctx.fillStyle = white(0.95); ctx.fill(); }
    });
    ctx.font = `9px ${MONO}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = white(0.45);
    ctx.fillText(`p = ${ES_P}`, 2, h - 2);

    // Right: histogram of the cut size, with the exact Binomial(m, p) law.
    const hx = lw + 18, hw = w - hx - 4, top = 16, bottom = h - 16, hh = bottom - top;
    const bins = ES_M + 1, bw = hw / bins;
    const yMax = Math.max(...ES_PMF) * ES_TARGET * 1.15;
    for (let k = 0; k < bins; k++) {
      const bh = (state.shown[k] / yMax) * hh;
      ctx.fillStyle = white(0.75);
      ctx.beginPath(); ctx.roundRect(hx + k * bw + bw * 0.15, bottom - bh, bw * 0.7, bh, [2, 2, 0, 0]); ctx.fill();
      ctx.fillStyle = white(0.45);
      ctx.fillText(String(k), hx + k * bw + bw / 2 - 3, h - 3);
    }
    ctx.strokeStyle = white(0.25);
    ctx.beginPath(); ctx.moveTo(hx, bottom + 0.5); ctx.lineTo(hx + hw, bottom + 0.5); ctx.stroke();
    if (state.n >= 15) {
      const a = Math.min(1, (state.n - 15) / 40);
      ctx.strokeStyle = white(0.9 * a);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      smoothLine(ctx, ES_PMF.map((p, k) => ({ x: hx + k * bw + bw / 2, y: bottom - ((p * state.n) / yMax) * hh })));
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    const mx = hx + (ES_M * ES_P) * bw + bw / 2;
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = white(0.6);
    ctx.beginPath(); ctx.moveTo(mx, top - 4); ctx.lineTo(mx, bottom); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = white(0.6);
    ctx.fillText("E[cut] = mp", Math.min(mx + 4, w - 64), top - 4);
    ctx.fillStyle = white(0.45);
    const label = `n = ${Math.round(state.n)}`;
    ctx.fillText(label, w - ctx.measureText(label).width - 2, top + 10);
  }, { warmupMs: 200 });
  return (
    <canvas ref={ref} role="img" style={{ opacity: 0 }} className={`block w-full ${className}`}
      aria-label="Hyperedges switch on independently with probability p; a histogram of the resulting cut size builds up and matches the exact binomial law" />
  );
}

function GraphSignalViz({ className = "h-40" }) {
  const ref = useCanvasLoop((ctx, { w, h, dt, state }) => {
    if (!state.pos) {
      const rand = mulberry32(5);
      const pos = [];
      while (pos.length < 12) {
        const p = [0.06 + rand() * 0.88, 0.1 + rand() * 0.7];
        if (pos.every((q) => Math.hypot((q[0] - p[0]) * 2, q[1] - p[1]) > 0.22)) pos.push(p);
      }
      const edges = new Map();
      pos.forEach((p, i) => {
        pos.map((q, j) => [j, Math.hypot((q[0] - p[0]) * 2, q[1] - p[1])])
          .filter(([j]) => j !== i)
          .sort((a, b) => a[1] - b[1])
          .slice(0, 3)
          .forEach(([j]) => edges.set(i < j ? `${i}-${j}` : `${j}-${i}`, { i: Math.min(i, j), j: Math.max(i, j), w: 0.6 }));
      });
      state.pos = pos;
      state.edges = [...edges.values()];
      state.x = new Array(12).fill(0);
      state.inject = 0;
      state.rand = rand;
    }
    const { pos, edges, x } = state;
    state.inject -= dt;
    if (state.inject <= 0) {
      state.inject = 3000;
      const i = Math.floor(state.rand() * 12);
      x[i] = 1;
    }
    // Heat diffusion x ← x − α·L·x, with edge weights adapting to signal similarity.
    const s = dt / 1000;
    const dx = new Array(12).fill(0);
    for (const e of edges) {
      const f = e.w * (x[e.i] - x[e.j]);
      dx[e.i] -= f; dx[e.j] += f;
      const target = Math.exp(-((x[e.i] - x[e.j]) ** 2) / 0.04);
      e.w += (target - e.w) * Math.min(1, s * 0.9);
    }
    for (let i = 0; i < 12; i++) x[i] = Math.max(0, (x[i] + dx[i] * s * 1.8) * (1 - s * 0.12));

    const P = pos.map(([u, v]) => ({ x: u * w, y: v * h }));
    for (const e of edges) {
      ctx.strokeStyle = white(0.06 + 0.4 * e.w);
      ctx.lineWidth = 0.5 + 1.3 * e.w;
      ctx.beginPath(); ctx.moveTo(P[e.i].x, P[e.i].y); ctx.lineTo(P[e.j].x, P[e.j].y); ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const v = clamp(x[i], 0, 1);
      if (v > 0.25) {
        ctx.fillStyle = white(0.12 * v);
        ctx.beginPath(); ctx.arc(P[i].x, P[i].y, 8 + 14 * v, 0, 6.283); ctx.fill();
      }
      ctx.fillStyle = white(0.3 + 0.7 * v);
      ctx.beginPath(); ctx.arc(P[i].x, P[i].y, 2.5 + 5 * v, 0, 6.283); ctx.fill();
    }
    ctx.lineWidth = 1;
    ctx.font = `9px ${MONO}`;
    ctx.fillStyle = white(0.5);
    ctx.fillText("x ← x − αLx", 2, h - 3);
  }, { warmupMs: 1800 });
  return (
    <canvas ref={ref} role="img" style={{ opacity: 0 }} className={`block w-full ${className}`}
      aria-label="A signal on the nodes of a graph diffuses by Laplacian smoothing while edge weights adapt to signal similarity" />
  );
}

/* ------------------------------------------------------------------ */
/* Gap chart — converse vs. achievability, scrubbed by scroll          */
/* ------------------------------------------------------------------ */

const GAP_K = 8;
const converse = (r) => (1 / r) * (1 - r / GAP_K);
const orderOptimal = (r) => 1.65 * converse(r);
const GAP_START = orderOptimal(1) - converse(1);

function GapChart({ progressRef, readoutRef }) {
  const reduced = useReducedMotion();
  const ref = useCanvasLoop((ctx, { w, h, dt, state, isStatic }) => {
    state.draw = Math.min(1, (state.draw || 0) + dt / 1400);
    const target = isStatic || reduced ? 1 : progressRef.current;
    state.p = state.p === undefined ? target : state.p + (target - state.p) * Math.min(1, dt / 120);
    const e = easeInOut(clamp(state.p, 0, 1));
    const drawIn = isStatic ? 1 : easeInOut(state.draw);

    const small = w < 520;
    const L = small ? 40 : 56, R = 16, T = 18, B = small ? 40 : 48;
    const pw = w - L - R, ph = h - T - B, yTop = 1.5;
    const X = (r) => L + ((r - 1) / (GAP_K - 1)) * pw;
    const Y = (v) => T + (1 - v / yTop) * ph;

    ctx.font = `${small ? 10 : 11}px ${MONO}`;
    ctx.textBaseline = "middle";
    for (const v of [0, 0.5, 1, 1.5]) {
      ctx.strokeStyle = white(v === 0 ? 0.3 : 0.06);
      ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(L + pw, Y(v)); ctx.stroke();
      ctx.fillStyle = white(0.55);
      ctx.fillText(v.toFixed(1), L - (small ? 28 : 34), Y(v));
    }
    ctx.strokeStyle = white(0.3);
    ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, T + ph); ctx.stroke();
    for (let r = 1; r <= GAP_K; r++) {
      ctx.fillStyle = white(0.55);
      ctx.fillText(String(r), X(r) - 3, T + ph + 14);
    }
    ctx.fillStyle = white(0.5);
    ctx.fillText("computation load r  (storage per node)", L, T + ph + (small ? 32 : 36));
    ctx.save();
    ctx.translate(12, T + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("communication load", 0, 0);
    ctx.restore();

    const rEnd = 1 + drawIn * (GAP_K - 1);
    const N = 160;
    const sample = (f) => {
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const r = 1 + (i / N) * (GAP_K - 1);
        if (r > rEnd) break;
        pts.push({ x: X(r), y: Y(f(r)) });
      }
      return pts;
    };
    const thisWork = (r) => orderOptimal(r) + (converse(r) - orderOptimal(r)) * e;
    const A = sample(converse), Bc = sample(orderOptimal), C = sample(thisWork);

    if (C.length > 1) {
      ctx.beginPath();
      C.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      for (let i = A.length - 1; i >= 0; i--) ctx.lineTo(A[i].x, A[i].y);
      ctx.closePath();
      ctx.fillStyle = white(0.08);
      ctx.fill();
    }
    const stroke = (pts, width, alpha, dash) => {
      if (pts.length < 2) return;
      ctx.setLineDash(dash || []);
      ctx.lineWidth = width;
      ctx.strokeStyle = white(alpha);
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
      ctx.setLineDash([]);
    };
    stroke(Bc, 1.5, 0.45, [6, 6]);
    stroke(A, 2, 0.95);
    ctx.save();
    ctx.shadowColor = white(0.7);
    ctx.shadowBlur = 14;
    stroke(C, 2.5, 1);
    ctx.restore();
    const merged = e > 0.985;
    for (let r = 1; r <= Math.floor(rEnd); r++) {
      ctx.beginPath();
      ctx.arc(X(r), Y(thisWork(r)), 4, 0, 6.283);
      ctx.fillStyle = merged ? "#fff" : "#000";
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = white(1);
      ctx.stroke();
    }
    ctx.lineWidth = 1;

    if (readoutRef.current) {
      const txt = `gap = ${(GAP_START * (1 - e)).toFixed(3)}`;
      if (readoutRef.current.textContent !== txt) readoutRef.current.textContent = txt;
    }
  }, { warmupMs: 1600 });
  return (
    <canvas ref={ref} role="img" style={{ opacity: 0 }} className="block h-full w-full"
      aria-label="Chart of communication load against computation load: a dashed order-optimal curve sits above the converse; as you scroll, the curve for this work moves down until it lies exactly on the converse" />
  );
}

/* ------------------------------------------------------------------ */
/* Text animation                                                      */
/* ------------------------------------------------------------------ */

function BlurText({ text, className = "", as: Tag = "p", delay = 0, justify = "center" }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); io.disconnect(); }
    }, { threshold: 0.1 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  const words = text.split(" ");
  return (
    <Tag ref={ref} className={className} aria-label={text}
      style={{ display: "flex", flexWrap: "wrap", justifyContent: justify, rowGap: "0.1em" }}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          style={{ display: "inline-block", marginRight: i < words.length - 1 ? "0.28em" : 0 }}
          initial={reduced ? false : { filter: "blur(10px)", opacity: 0, y: 50 }}
          animate={inView ? { filter: ["blur(10px)", "blur(5px)", "blur(0px)"], opacity: [0, 0.5, 1], y: [50, -5, 0] } : undefined}
          transition={{ duration: 0.7, times: [0, 0.5, 1], ease: "easeOut", delay: delay + (i * 100) / 1000 }}
        >
          {word}
        </motion.span>
      ))}
    </Tag>
  );
}

function useRise() {
  const reduced = useReducedMotion();
  return (delay = 0) => ({
    initial: reduced ? false : { filter: "blur(10px)", opacity: 0, y: 20 },
    animate: { filter: "blur(0px)", opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: "easeOut", delay },
  });
}

function useRiseInView() {
  const reduced = useReducedMotion();
  return (delay = 0) => ({
    initial: reduced ? false : { filter: "blur(10px)", opacity: 0, y: 24 },
    whileInView: { filter: "blur(0px)", opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.3 },
    transition: { duration: 0.8, ease: "easeOut", delay },
  });
}

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

const ArrowUpRight = ({ className = "h-5 w-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 17L17 7" /><path d="M7 7h10v10" />
  </svg>
);
const ArrowDown = ({ className = "h-4 w-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 5v14" /><path d="M19 12l-7 7-7-7" />
  </svg>
);
const TouchingCurves = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
    <path d="M3 5c6 0 8 9 11 9s5-9 11-9" />
    <path d="M3 23c6 0 8-9 11-9s5 9 11 9" opacity="0.6" />
    <circle cx="14" cy="14" r="1.6" fill="#fff" />
  </svg>
);
const PaperStack = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
    <rect x="7" y="4" width="15" height="19" rx="2" />
    <path d="M4 8v15a2 2 0 0 0 2 2h12" opacity="0.6" />
    <path d="M11 10h7M11 14h7M11 18h4" />
  </svg>
);
const MaterialIcon = ({ d }) => (
  <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={d} /></svg>
);
const HypergraphIcon = () => (
  <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M5 7.5 12 4l7 3.5-3 9H8z" fill="currentColor" fillOpacity="0.18" strokeLinejoin="round" />
    <circle cx="5" cy="7.5" r="2" fill="currentColor" /><circle cx="12" cy="4" r="2" fill="currentColor" />
    <circle cx="19" cy="7.5" r="2" fill="currentColor" /><circle cx="8" cy="16.5" r="2" fill="currentColor" />
    <circle cx="16" cy="16.5" r="2" fill="currentColor" /><path d="M8 16.5 12 21l4-4.5" />
    <circle cx="12" cy="21" r="1.6" fill="currentColor" />
  </svg>
);
const BrandIcon = ({ d, className = "h-[18px] w-[18px]" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={d} /></svg>
);
const MailIcon = ({ className = "h-[18px] w-[18px]" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
  </svg>
);
const CvIcon = ({ className = "h-[18px] w-[18px]" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" />
  </svg>
);
const SCHOLAR_PATH = "M5.242 13.769L0 9.5 12 0l12 9.5-5.242 4.269C17.548 11.249 14.978 9.5 12 9.5c-2.977 0-5.548 1.748-6.758 4.269zM12 10a7 7 0 1 0 0 14 7 7 0 0 0 0-14z";
const LINKEDIN_PATH = "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z";
const ORCID_PATH = "M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zM7.369 4.378c.525 0 .947.431.947.947s-.422.947-.947.947a.95.95 0 0 1-.947-.947c0-.525.422-.947.947-.947zm-.722 3.038h1.444v10.041H6.647V7.416zm3.562 0h3.9c3.712 0 5.344 2.653 5.344 5.025 0 2.578-2.016 5.025-5.325 5.025h-3.919V7.416zm1.444 1.303v7.444h2.297c3.272 0 4.022-2.484 4.022-3.722 0-2.016-1.284-3.722-4.097-3.722h-2.222z";
const GITHUB_PATH = "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12";
const DNS_PATH = "M20 13H4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h16c.55 0 1-.45 1-1v-6c0-.55-.45-1-1-1zM7 19c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM20 3H4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h16c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1zM7 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z";
const SHARE_PATH = "M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z";

/* ------------------------------------------------------------------ */
/* Content (all sourced from the main site)                            */
/* ------------------------------------------------------------------ */

// Empty on the real site; the off-site preview build sets it to the site's origin
// so links into the rest of the site still resolve.
const SITE_ORIGIN = typeof __SITE_ORIGIN__ === "string" ? __SITE_ORIGIN__ : "";
const site = (href) => (href && href.startsWith("/") ? SITE_ORIGIN + href : href);
const CV_URL = site("/files/javad-maheri-cv.pdf");

// Which page this is, and where the others live, comes from data attributes on
// #root set by each HTML shell (see _includes/lab-shell.html):
//   data-page  "home" | "research"     data-topic  research slug
//   data-base  URL of the lab root     data-home   URL of the home page
//   data-index file appended to page URLs on hosts without directory indexes
const ROOT_EL = document.getElementById("root");
const PAGE = ROOT_EL.dataset.page || "home";
const TOPIC = ROOT_EL.dataset.topic || "";
const BASE = ROOT_EL.dataset.base ?? "";
const HOME = ROOT_EL.dataset.home ?? "./";
const INDEX = ROOT_EL.dataset.index || "";
const homeHref = (id) => (PAGE === "home" ? `#${id}` : `${HOME}#${id}`);
const researchHref = (slug, anchor) => `${BASE}research/${slug}/${INDEX}${anchor ? `#${anchor}` : ""}`;
// External links and the PDF open in a new tab so the page stays put.
const NEW_TAB = { target: "_blank", rel: "noopener noreferrer" };
// Set to "/images/profile.png" once the placeholder there is replaced with a real photo.
const PORTRAIT_URL = null;

const NAV = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "research", label: "Research" },
  { id: "experience", label: "Experience" },
  { id: "publications", label: "Publications" },
  { id: "contact", label: "Contact" },
];

const SCHOLAR_URL = "https://scholar.google.com/citations?user=jg3ifAUAAAAJ&hl=en";
const SOCIALS = [
  { label: "Email", href: "mailto:j.maheri95@gmail.com", icon: <MailIcon /> },
  { label: "Google Scholar", href: SCHOLAR_URL, icon: <BrandIcon d={SCHOLAR_PATH} />, external: true },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/javad-maheri-845049169", icon: <BrandIcon d={LINKEDIN_PATH} />, external: true },
  { label: "ORCID", href: "https://orcid.org/0009-0005-7148-713X", icon: <BrandIcon d={ORCID_PATH} />, external: true },
  { label: "GitHub", href: "https://github.com/JavadMaheri", icon: <BrandIcon d={GITHUB_PATH} />, external: true },
  { label: "CV (PDF)", href: CV_URL, icon: <CvIcon />, external: true },
];

function SocialRow({ size = "h-11 w-11", className = "", only }) {
  const items = only ? SOCIALS.filter((s) => only.includes(s.label)) : SOCIALS;
  return (
    <ul className={`flex flex-wrap items-center justify-center gap-2 ${className}`}>
      {items.map((s) => (
        <li key={s.label}>
          <a
            href={s.href}
            {...(s.external ? NEW_TAB : {})}
            aria-label={s.label}
            title={s.label}
            className={`liquid-glass focus-ring flex ${size} items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white hover:text-black`}
          >
            {s.icon}
          </a>
        </li>
      ))}
    </ul>
  );
}

const NEWS = [
  { when: "Jul 2026", text: "Defended my PhD at EURECOM / Sorbonne Université.", href: homeHref("about") },
  { when: "Jun 2026", text: "New preprint: Fundamental Limits of Hypergraph Edge Partitioning under Independent Edge Sampling — under review at SIAM J. Discrete Mathematics.", href: researchHref("hypergraph-partitioning", "paper-hypergraph-edge-partitioning") },
  { when: "2026", text: "Order Optimal Task Allocation in Distributed Computing via Interweaved Cliques — accepted at ISIT 2026.", href: researchHref("allocation", "paper-interweaved-cliques") },
  { when: "Jan 2026", text: "New preprint: Universal and Asymptotically Optimal Data and Task Allocation in Distributed Computing — under revision at IEEE Transactions on Information Theory.", href: researchHref("allocation", "paper-universal-allocation") },
  { when: "2025", text: "Constructing Hamiltonian Decompositions of Complete k-Uniform Hypergraphs — published at ISIT 2025.", href: researchHref("hypergraph-partitioning", "paper-hamiltonian-decompositions") },
  { when: "2024", text: "Drew against GM Vassilios Kotronias at the ISIT 2024 chess event." },
];

const FACTS = [
  { k: "Based in", v: "Sophia Antipolis, France" },
  { k: "PhD", v: "Communication Systems — EURECOM / Sorbonne Université, 2026" },
  { k: "B.Sc.", v: "Electrical Engineering & Mathematics — Sharif University of Technology, high honors" },
  { k: "Toolbox", v: "Python, PyTorch, NumPy, Spark / GraphX, MATLAB, C/C++" },
  { k: "Languages", v: "English (fluent) · French (B1) · Persian (native)" },
];

const INTERESTS = [
  "Fundamental limits of distributed computing and learning",
  "Combinatorial designs and coded caching",
  "Hypergraph partitioning",
  "Graph neural networks and graph signal processing",
  "Causal inference for spatiotemporal data",
  "Integrated sensing and communication (ISAC)",
];

const HIGHLIGHTS = [
  { big: "7th", small: "of 180,000+ candidates in Iran’s national university entrance exam (2017)" },
  { big: "Funded", small: "PhD position, Huawei France Chair for Future Wireless Networks (2023–2026)" },
  { big: "½–½", small: "Drew against GM Vassilios Kotronias at the ISIT 2024 chess event" },
];

const CARDS = [
  {
    icon: <MaterialIcon d={DNS_PATH} />,
    tags: ["Distributed Computing", "Task-Blind", "Interweaved Cliques", "Matching Converse"],
    title: "Universally Optimal Allocation",
    body: "One task-blind data assignment that is simultaneously optimal for every downstream workload — no re-planning per job.",
    viz: <AllocationViz />,
    caption: "6 servers · 15 blocks · each block on a pair of servers — the edges of K₆, placed round by round",
    slug: "allocation",
  },
  {
    icon: <HypergraphIcon />,
    tags: ["Hypergraphs", "Edge Sampling", "Finite-Size Exact", "Combinatorics"],
    title: "Hypergraph Edge Partitioning",
    body: "What partition quality is exactly achievable when edges are sampled at random — with the finite-size constant, not just the scaling exponent.",
    viz: <EdgeSamplingViz />,
    caption: "Each hyperedge appears with probability p; the cut size follows its exact law, sample by sample",
    slug: "hypergraph-partitioning",
  },
  {
    icon: <MaterialIcon d={SHARE_PATH} />,
    tags: ["GNNs", "Graph Signal Processing", "Laplacian Learning", "Spatiotemporal"],
    title: "Learning on Graphs",
    body: "GNNs, graph signal processing and Laplacian estimation — from market-dependency graphs to scene graphs for safety analytics.",
    viz: <GraphSignalViz />,
    caption: "A signal diffuses over the graph while edge weights adapt to what the data says",
    slug: "graph-learning",
  },
];

const PUBS = [
  {
    year: "2026",
    title: "Fundamental Limits of Hypergraph Edge Partitioning under Independent Edge Sampling",
    authors: ["Javad Maheri", "K. K. Krishnan Namboodiri", "Petros Elia"],
    venue: "SIAM Journal on Discrete Mathematics",
    status: "Under review",
    arxiv: "2606.13491",
    bibtex: "@misc{maheri2026hypergraph,\n  title = {Fundamental Limits of Hypergraph Edge Partitioning under Independent Edge Sampling},\n  author = {Maheri, Javad and Namboodiri, K. K. Krishnan and Elia, Petros},\n  year = {2026},\n  eprint = {2606.13491},\n  archivePrefix = {arXiv},\n  note = {Under review, SIAM Journal on Discrete Mathematics}\n}",
    topic: "hypergraph-partitioning",
    slug: "hypergraph-edge-partitioning",
  },
  {
    year: "2026",
    title: "Universal and Asymptotically Optimal Data and Task Allocation in Distributed Computing",
    authors: ["Javad Maheri", "K. K. Krishnan Namboodiri", "Petros Elia"],
    venue: "IEEE Transactions on Information Theory",
    status: "Under revision",
    arxiv: "2601.05873",
    bibtex: "@misc{maheri2026universal,\n  title = {Universal and Asymptotically Optimal Data and Task Allocation in Distributed Computing},\n  author = {Maheri, Javad and Namboodiri, K. K. Krishnan and Elia, Petros},\n  year = {2026},\n  eprint = {2601.05873},\n  archivePrefix = {arXiv},\n  note = {Under revision, IEEE Transactions on Information Theory}\n}",
    topic: "allocation",
    slug: "universal-allocation",
  },
  {
    year: "2026",
    title: "Order Optimal Task Allocation in Distributed Computing via Interweaved Cliques",
    authors: ["Javad Maheri", "K. K. Krishnan Namboodiri", "Petros Elia"],
    venue: "IEEE International Symposium on Information Theory (ISIT) 2026",
    status: "Conference",
    topic: "allocation",
    slug: "interweaved-cliques",
    bibtex: "@inproceedings{maheri2026interweaved,\n  title = {Order Optimal Task Allocation in Distributed Computing via Interweaved Cliques},\n  author = {Maheri, Javad and Namboodiri, K. K. Krishnan and Elia, Petros},\n  booktitle = {Proc. IEEE International Symposium on Information Theory (ISIT)},\n  year = {2026}\n}",
  },
  {
    year: "2025",
    title: "Constructing Hamiltonian Decompositions of Complete k-Uniform Hypergraphs",
    authors: ["Javad Maheri", "Petros Elia"],
    venue: "IEEE International Symposium on Information Theory (ISIT) 2025",
    status: "Conference",
    topic: "hypergraph-partitioning",
    slug: "hamiltonian-decompositions",
    bibtex: "@inproceedings{maheri2025hamiltonian,\n  title = {Constructing Hamiltonian Decompositions of Complete k-Uniform Hypergraphs},\n  author = {Maheri, Javad and Elia, Petros},\n  booktitle = {Proc. IEEE International Symposium on Information Theory (ISIT)},\n  year = {2025}\n}",
  },
];

const JOURNEY = [
  { when: "2017–2022", where: "Sharif University of Technology", what: "B.Sc. Electrical Engineering & Mathematics — double major, high honors" },
  { when: "2021", where: "MAPNA", what: "Scene-graph GNNs for safety video analytics" },
  { when: "2022", where: "Zarebin", what: "PageRank on Spark / GraphX, graph Laplacian learning" },
  { when: "2023–2026", where: "EURECOM / Sorbonne Université", what: "PhD, Huawei France Chair for Future Wireless Networks" },
  { when: "July 2026", where: "PhD defended", what: "Universally Optimal Combinatorial Schemes for Distributed Computing and Learning", now: true },
];

const ROLES = [
  {
    role: "PhD Researcher",
    org: "EURECOM / Sorbonne Université",
    meta: "Huawei France Chair · Biot, France · Apr 2023 – Jul 2026",
    points: [
      "Built the first universally optimal allocation schemes: one task-blind assignment that is optimal for every downstream workload at once.",
      "Derived matching information-theoretic lower bounds with explicit combinatorial constructions, cutting inter-node communication to its provable minimum on MapReduce-style workloads.",
      "Designed and ran the full experimental program in Python (PyTorch, NumPy).",
    ],
  },
  {
    role: "Data Scientist / ML Engineer",
    org: "Zarebin",
    meta: "Tehran · Mar 2022 – Dec 2022",
    points: [
      "Ran PageRank and personalized PageRank over multi-million-edge graphs on Apache Spark / GraphX with Pregel-style message passing.",
      "Learned market-dependency graphs from raw price series with convex graph Laplacian estimation under smoothness and sparsity constraints.",
      "Benchmarked learned graphs against correlation baselines and delivered the pipeline to the client’s analytics team.",
    ],
  },
  {
    role: "ML Engineer — GNNs for safety video analytics",
    org: "MAPNA",
    meta: "Industrial power generation facility · Tehran · Apr 2021 – Jan 2022",
    points: [
      "Built a scene-graph GNN over people, machinery, PPE and restricted zones to classify safety violations from interactions, not single frames.",
      "Cut false alarms substantially versus the per-frame detector by letting message passing resolve occlusion across overlapping cameras.",
      "Framed camera placement as graph optimization over field-of-view overlaps to improve hazard-zone coverage without new hardware.",
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

function Navbar() {
  const [open, setOpen] = useState(false);
  const navRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const onDown = (e) => navRef.current && !navRef.current.contains(e.target) && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);
  return (
    <nav ref={navRef} className="fixed left-0 right-0 top-4 z-50 flex items-center justify-between px-4 md:px-8 lg:px-16" aria-label="Primary">
      <a href={homeHref("home")} className="focus-ring flex items-center gap-3 rounded-full" aria-label="Javad Maheri — home">
        <span className="liquid-glass flex h-12 w-12 items-center justify-center rounded-full">
          <span className="font-heading text-2xl italic leading-none text-white">jm</span>
        </span>
        <span className="font-heading text-xl italic text-white lg:hidden xl:inline">Javad Maheri</span>
      </a>
      <div className="liquid-glass absolute left-1/2 hidden -translate-x-1/2 items-center rounded-full px-1.5 py-1.5 lg:flex">
        {NAV.map((l) => (
          <a key={l.id} href={homeHref(l.id)} className="focus-ring rounded-full px-3 py-2 font-body text-sm font-medium text-white/90 hover:text-white">
            {l.label}
          </a>
        ))}
        <a href={CV_URL} {...NEW_TAB} className="focus-ring ml-1 flex items-center gap-1 whitespace-nowrap rounded-full bg-white px-4 py-2 font-body text-sm font-medium text-black">
          Download CV <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
      <SocialRow size="h-10 w-10" className="hidden xl:flex" only={["Email", "Google Scholar", "LinkedIn", "GitHub"]} />
      <button
        type="button"
        className="liquid-glass focus-ring flex h-12 w-12 items-center justify-center rounded-full text-white lg:hidden"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((o) => !o)}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 8h16M4 16h16" />}
        </svg>
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          className="liquid-glass-strong absolute left-4 right-4 top-16 flex flex-col gap-1 rounded-[1.5rem] p-3 lg:hidden"
        >
          {NAV.map((l) => (
            <a key={l.id} href={homeHref(l.id)} onClick={() => setOpen(false)} className="rounded-[0.75rem] px-4 py-3 font-body text-base text-white/90">
              {l.label}
            </a>
          ))}
          <a href={CV_URL} {...NEW_TAB} className="mt-1 flex items-center justify-center gap-1 rounded-full bg-white px-4 py-3 font-body text-sm font-medium text-black">
            Download CV <ArrowUpRight className="h-4 w-4" />
          </a>
        </motion.div>
      )}
    </nav>
  );
}

// Right-edge section index drawn as a path graph: one node per section.
function SectionRail() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      let idx = 0;
      NAV.forEach((s, i) => {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.4) idx = i;
      });
      setActive(idx);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center lg:flex" aria-hidden="true">
      {NAV.map((s, i) => (
        <React.Fragment key={s.id}>
          {i > 0 && <span className="h-7 w-px" style={{ background: white(i <= active ? 0.6 : 0.15) }} />}
          <a href={`#${s.id}`} tabIndex={-1} className="group relative flex h-4 w-4 items-center justify-center">
            <motion.span
              className="block rounded-full bg-white"
              animate={{ width: i === active ? 10 : 5, height: i === active ? 10 : 5, opacity: i <= active ? 1 : 0.35 }}
              transition={{ duration: 0.3 }}
            />
            <span className="pointer-events-none absolute right-6 whitespace-nowrap font-mono text-[10px] text-white/0 transition-colors group-hover:text-white/70">
              {s.label}
            </span>
          </a>
        </React.Fragment>
      ))}
    </div>
  );
}

function Hero() {
  const rise = useRise();
  return (
    <section id="home" className="relative flex min-h-[100svh] flex-col overflow-hidden bg-black">
      <div className="absolute left-1/2 top-0 z-0 -translate-x-1/2" style={{ width: "120%", height: "120%" }}>
        <HypergraphField />
      </div>
      <div className="relative z-10 flex flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-10 pt-28 text-center">
          <motion.a {...rise(0.3)} href="#news" className="liquid-glass focus-ring group flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-white/10">
            <span className="rounded-full bg-white px-3 py-1 font-body text-xs font-semibold text-black">New</span>
            <span className="font-body text-xs text-white/90 sm:text-sm">PhD defended — EURECOM / Sorbonne Université, July 2026</span>
            <ArrowDown className="mr-2 h-3.5 w-3.5 text-white/60 transition-colors group-hover:text-white" />
          </motion.a>
          <motion.div {...rise(0.45)} className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-white/70 md:text-sm">
            Information theory · Distributed learning · Graphs
          </motion.div>
          <BlurText
            as="h1"
            text="Javad Maheri"
            delay={0.5}
            className="mt-3 font-heading text-7xl italic leading-[0.85] tracking-[-4px] text-white sm:text-8xl lg:text-[8.5rem]"
          />
          <motion.p {...rise(0.9)} className="mt-6 max-w-3xl font-heading text-2xl italic leading-tight text-white md:text-3xl">
            I prove exact, non-asymptotic limits for distributed computation and learning on graph-structured data — and I build the systems that use them.
          </motion.p>
          <motion.p {...rise(1.05)} className="mt-4 max-w-3xl font-body text-sm font-light leading-snug text-white/85 md:text-base">
            Information theorist and ML engineer · PhD,{" "}
            <a href="https://www.eurecom.fr/" {...NEW_TAB} className="underline decoration-white/30 underline-offset-4 hover:decoration-white">EURECOM</a>
            {" / "}
            <a href="https://www.sorbonne-universite.fr/" {...NEW_TAB} className="underline decoration-white/30 underline-offset-4 hover:decoration-white">Sorbonne Université</a>
            {" "}· Sophia Antipolis, France
          </motion.p>
          <motion.div {...rise(1.15)} className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-4">
            <a href="#about" className="liquid-glass-strong focus-ring flex h-11 items-center gap-2 rounded-full px-5 font-body text-sm font-medium text-white transition-colors hover:bg-white/10">
              Get to know me <ArrowDown />
            </a>
            <span className="hidden h-6 w-px bg-white/20 sm:block" aria-hidden="true" />
            <SocialRow />
          </motion.div>
          <motion.div {...rise(1.35)} className="mt-8 flex w-full flex-wrap items-stretch justify-center gap-4">
            {[
              { icon: <TouchingCurves />, num: "PhD", label: "EURECOM / Sorbonne Université, defended July 2026", href: "#about" },
              { icon: <PaperStack />, num: "4 Papers", label: "ISIT ’25 · ISIT ’26 · IEEE T-IT · SIAM J. DM", href: "#publications" },
              { icon: <MaterialIcon d={SHARE_PATH} />, num: "3 Roles", label: "Research at EURECOM, ML engineering at Zarebin and MAPNA", href: "#experience" },
            ].map((s, i) => (
              <a key={s.num} href={s.href} className={`liquid-glass glass-hover focus-ring group ${i === 2 ? "hidden sm:flex" : "flex"} w-[calc(50%-8px)] max-w-[220px] flex-col justify-between gap-5 rounded-[1.25rem] p-4 text-left transition-transform hover:-translate-y-0.5 sm:w-[220px] sm:p-5`}>
                <div className="flex items-start justify-between">
                  {s.icon}
                  <ArrowDown className="h-4 w-4 text-white/40 transition-colors group-hover:text-white" />
                </div>
                <div>
                  <div className="font-heading text-3xl italic leading-none tracking-[-1px] text-white sm:text-4xl">{s.num}</div>
                  <div className="mt-2 font-body text-xs font-light text-white">{s.label}</div>
                </div>
              </a>
            ))}
          </motion.div>
        </div>
        <motion.a
          {...rise(1.7)}
          href="#research"
          className="focus-ring absolute left-16 top-[calc(100svh-5.5rem)] hidden max-w-[210px] font-mono text-[11px] leading-snug text-white/55 hover:text-white/90 xl:block"
        >
          Move your mouse over the graph: it passes messages between nodes, like a GNN. Why graphs? →
        </motion.a>
        <motion.a
          {...rise(1.7)}
          href="#about"
          aria-label="Scroll to About"
          className="focus-ring absolute right-16 top-[calc(100svh-4.75rem)] hidden flex-col items-center gap-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/55 hover:text-white xl:flex"
        >
          Scroll
          <ScrollChevron />
        </motion.a>
        <motion.div {...rise(1.5)} className="flex flex-col items-center gap-4 px-4 pb-8">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/55">Research & engineering with</span>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 font-heading text-2xl italic tracking-tight text-white md:gap-x-14 md:text-3xl">
            {["EURECOM", "Sorbonne Université", "Sharif", "MAPNA", "Zarebin"].map((n) => <span key={n}>{n}</span>)}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function ScrollChevron() {
  const reduced = useReducedMotion();
  return (
    <motion.svg
      className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      animate={reduced ? undefined : { y: [0, 4, 0] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
    >
      <path d="m6 9 6 6 6-6" />
    </motion.svg>
  );
}

function News() {
  const rise = useRiseInView();
  return (
    <section id="news" className="relative bg-black px-4 pt-24 md:px-16 lg:px-20" aria-labelledby="news-title">
      <motion.div {...rise(0)} className="flex flex-col gap-8 lg:flex-row lg:gap-16">
        <div className="lg:w-[380px] lg:shrink-0">
          <Kicker>// News</Kicker>
          <h2 id="news-title" className="font-heading text-5xl italic leading-[0.9] tracking-[-2px] text-white md:text-6xl">Lately</h2>
        </div>
        <ol className="min-w-0 flex-1 border-t border-white/15">
          {NEWS.map((n) => {
            const body = (
              <>
                <span className="w-20 shrink-0 font-mono text-xs text-white/55 tabular-nums">{n.when}</span>
                <span className="flex-1 font-body text-sm font-light leading-snug text-white/90 md:text-base">{n.text}</span>
                {n.href && <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-white/40 transition-colors group-hover:text-white" />}
              </>
            );
            return (
              <li key={n.text} className="border-b border-white/15">
                {n.href ? (
                  <a href={site(n.href)} {...(n.external ? NEW_TAB : {})} className="focus-ring group flex items-start gap-4 py-4 hover:bg-white/[0.03]">{body}</a>
                ) : (
                  <div className="flex items-start gap-4 py-4">{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      </motion.div>
    </section>
  );
}

function Portrait() {
  return (
    <div className="liquid-glass relative aspect-[4/5] w-full max-w-[380px] overflow-hidden rounded-[1.5rem]">
      {PORTRAIT_URL ? (
        <img src={PORTRAIT_URL} alt="Portrait of Javad Maheri" className="h-full w-full object-cover grayscale" />
      ) : (
        <>
          <div className="absolute inset-0">
            <HypergraphField density={0.35} edgeAlpha={0.22} interactive={false} linkCursor={false} topBias={false} seed={9} label="Small animated hypergraph behind the monogram" />
          </div>
          <div className="relative flex h-full flex-col items-center justify-center">
            <span className="font-heading text-[7rem] italic leading-none text-white">jm</span>
          </div>
        </>
      )}
      <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-2">
        <span className="rounded-full bg-black/50 px-3 py-1 font-body text-xs text-white">Javad Maheri</span>
        <span className="rounded-full bg-black/50 px-3 py-1 font-mono text-[10px] text-white/80">Sophia Antipolis</span>
      </div>
    </div>
  );
}

function About() {
  const rise = useRiseInView();
  return (
    <section id="about" className="relative bg-black px-4 pb-24 pt-28 md:px-16 lg:px-20">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[380px_1fr] lg:gap-16">
        <motion.div {...rise(0)} className="flex justify-center lg:block">
          <Portrait />
        </motion.div>
        <div className="min-w-0">
          <motion.div {...rise(0.05)}>
            <Kicker>// About — who I am</Kicker>
            <h2 className="font-heading text-6xl italic leading-[0.9] tracking-[-3px] text-white md:text-7xl">Hi, I’m Javad.</h2>
          </motion.div>
          <motion.div {...rise(0.15)} className="mt-8 flex max-w-[62ch] flex-col gap-4 font-body text-base font-light leading-relaxed text-white/90 md:text-lg">
            <p>
              I’m a researcher in information theory and machine learning. I defended my PhD in Communication Systems at
              EURECOM / Sorbonne Université in July 2026, supervised by Prof. Petros Elia.
            </p>
            <p>
              My work asks a precise question: what is the best a distributed system can do, exactly? I prove information-theoretic
              lower bounds and build explicit combinatorial schemes that meet them, so the gap closes at every finite size rather than
              only in the limit.
            </p>
            <p>
              Before the PhD I studied Electrical Engineering and Mathematics at Sharif University of Technology, and built graph-based
              ML systems in industry: PageRank on Spark, learned market graphs, and GNNs for industrial safety video.
            </p>
          </motion.div>
          <motion.dl {...rise(0.25)} className="mt-10 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            {FACTS.map((f) => (
              <div key={f.k} className="min-w-0 border-t border-white/15 pt-3">
                <dt className="font-mono text-[11px] uppercase tracking-[0.15em] text-white/55">{f.k}</dt>
                <dd className="mt-1 font-body text-sm text-white">{f.v}</dd>
              </div>
            ))}
          </motion.dl>
        </div>
      </div>

      <div className="mt-20 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div {...rise(0)} className="liquid-glass rounded-[1.5rem] p-6 md:p-8">
          <Kicker>// What I want to work on</Kicker>
          <p className="font-heading text-3xl italic leading-tight text-white md:text-4xl">
            Taking exact limits from distributed computing to the rest of graph-structured learning.
          </p>
          <p className="mt-4 max-w-[60ch] font-body text-sm font-light leading-relaxed text-white/85 md:text-base">
            The same toolkit — matching converses paired with constructions that achieve them — extends to graph neural networks,
            graph signal processing, causal inference and ISAC. Different graphs, the same underlying question.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {INTERESTS.map((t) => (
              <li key={t} className="rounded-full border border-white/15 px-3 py-1 font-body text-xs text-white/70">{t}</li>
            ))}
          </ul>
        </motion.div>
        <motion.div {...rise(0.1)} className="flex flex-col gap-4">
          <Kicker>// A few highlights</Kicker>
          {HIGHLIGHTS.map((h) => (
            <div key={h.big} className="liquid-glass flex items-center gap-5 rounded-[1.25rem] p-5">
              <span className="w-28 shrink-0 font-heading text-4xl italic leading-none text-white md:w-40 md:text-5xl">{h.big}</span>
              <span className="font-body text-sm font-light leading-snug text-white/90">{h.small}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Kicker({ children }) {
  return <div className="mb-6 font-mono text-sm text-white/70">{children}</div>;
}

function Research() {
  const rise = useRiseInView();
  return (
    <section id="research" className="relative min-h-screen overflow-hidden bg-black">
      <div className="absolute inset-0 z-0">
        <HypergraphField density={0.5} edgeAlpha={0.08} hyperedges={false} interactive={false} topBias={false} seed={21} label="Sparse drifting graph in the background" />
      </div>
      <div className="relative z-10 flex min-h-screen flex-col px-4 pb-16 pt-28 md:px-16 lg:px-20">
        <motion.div {...rise(0)}>
          <Kicker>// Research — what I study</Kicker>
          <h2 className="font-heading text-6xl italic leading-[0.9] tracking-[-3px] text-white md:text-7xl lg:text-[6rem]">
            Same question,<br />different graphs
          </h2>
          <p className="mt-6 max-w-xl font-body text-sm font-light leading-snug text-white/90 md:text-base">
            Matching information-theoretic converses, paired with explicit combinatorial constructions that achieve them — applied wherever the data lives on a graph.
          </p>
        </motion.div>
        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {CARDS.map((c, i) => (
            <motion.a key={c.title} href={researchHref(c.slug)} {...rise(0.15 * i)} className="liquid-glass glass-hover focus-ring group flex min-h-[460px] flex-col rounded-[1.25rem] p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-start text-white/85" aria-hidden="true">{c.icon}</div>
                <div className="flex max-w-[75%] flex-wrap justify-end gap-1.5">
                  {c.tags.map((t) => (
                    <span key={t} className="whitespace-nowrap rounded-full border border-white/15 px-3 py-1 font-body text-[11px] text-white/70">{t}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-1 flex-col justify-center py-6">
                {c.viz}
                <p className="mt-3 font-mono text-[10px] leading-snug text-white/50">{c.caption}</p>
              </div>
              <div>
                <h3 className="font-heading text-3xl italic leading-none tracking-[-1px] text-white md:text-4xl">{c.title}</h3>
                <p className="mt-3 max-w-[36ch] font-body text-sm font-light leading-snug text-white/90">{c.body}</p>
                <span className="mt-4 inline-flex items-center gap-1 font-body text-sm font-medium text-white">
                  Explore this research <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}

function GapSection() {
  const sectionRef = useRef(null);
  const readoutRef = useRef(null);
  const progressRef = useRef(0);
  const reduced = useReducedMotion();
  const rise = useRiseInView();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const p = useTransform(scrollYProgress, [0.08, 0.75], [0, 1], { clamp: true });
  useMotionValueEvent(p, "change", (v) => { progressRef.current = v; });
  const zeroOpacity = useTransform(p, [0.9, 1], [0, 1]);
  const zeroScale = useTransform(p, [0.9, 1], [0.85, 1]);

  return (
    <section id="gap" ref={sectionRef} className="relative bg-black" style={{ height: reduced ? "auto" : "240vh" }}>
      <div className={`${reduced ? "" : "sticky top-0 h-[100svh]"} flex flex-col justify-center px-4 pb-6 pt-24 md:px-16 md:pb-8 lg:px-20 [&>*]:shrink-0`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
          <motion.div {...rise(0)}>
            <Kicker>// Exact optimality</Kicker>
            <h2 className="font-heading text-5xl italic leading-[0.9] tracking-[-3px] text-white md:text-7xl lg:text-[6rem]">The gap closes</h2>
          </motion.div>
          <motion.p {...rise(0.15)} className="max-w-md font-body text-sm font-light leading-snug text-white/90 md:text-base">
            Most schemes are order-optimal: the gap to the lower bound shrinks with scale. My constructions meet the converse exactly, at every finite size.
          </motion.p>
        </div>
        <div className="liquid-glass relative mt-6 rounded-[1.5rem] p-4 md:mt-8 md:p-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-2 pr-3 font-mono text-[11px] text-white/80">
              <span className="inline-block h-[2px] w-4 bg-white" /> converse
            </span>
            <span className="flex items-center gap-2 pr-3 font-mono text-[11px] text-white/80">
              <span className="inline-block w-4 border-t border-dashed border-white/60" /> order-optimal
            </span>
            <span className="flex items-center gap-2 pr-3 font-mono text-[11px] text-white/80">
              <span className="inline-block h-[3px] w-4 bg-white shadow-[0_0_8px_white]" /> this work
            </span>
            <span ref={readoutRef} className="ml-auto font-mono text-xs text-white/80" aria-live="off">gap = {GAP_START.toFixed(3)}</span>
          </div>
          <div className="relative h-[clamp(200px,34svh,420px)] w-full md:h-[clamp(240px,38svh,460px)]">
            <GapChart progressRef={progressRef} readoutRef={readoutRef} />
            <motion.div
              style={{ opacity: reduced ? 1 : zeroOpacity, scale: reduced ? 1 : zeroScale }}
              className="pointer-events-none absolute right-2 top-2 rounded-full border border-white/30 bg-black/70 px-4 py-2 font-heading text-2xl italic text-white md:right-6 md:top-4 md:text-3xl"
            >
              gap = 0
            </motion.div>
          </div>
          <p className="mt-2 font-body text-[11px] text-white/50 md:text-xs">Illustrative curves; see the papers for exact results.</p>
        </div>
        <div className="mt-6 hidden flex-wrap gap-3 md:flex">
          {["Matching converses", "Explicit constructions", "Finite-size, not asymptotic"].map((t) => (
            <span key={t} className="rounded-full border border-white/15 px-4 py-1.5 font-body text-sm text-white/70">{t}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Experience() {
  const rise = useRiseInView();
  return (
    <section id="experience" className="relative bg-black px-4 pb-16 pt-28 md:px-16 lg:px-20">
      <motion.div {...rise(0)}>
        <Kicker>// Experience — what I’ve done</Kicker>
        <h2 className="font-heading text-6xl italic leading-[0.9] tracking-[-3px] text-white md:text-7xl lg:text-[6rem]">
          Theory, then<br />systems
        </h2>
      </motion.div>
      <Journey />
      <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {ROLES.map((r, i) => (
          <motion.article
            key={r.org}
            {...rise(0.1 * i)}
            className="liquid-glass flex flex-col rounded-[1.25rem] p-6"
          >
            <div className="font-mono text-[11px] text-white/60">{r.meta}</div>
            <h3 className="mt-3 font-heading text-3xl italic leading-none tracking-[-1px] text-white">{r.org}</h3>
            <div className="mt-2 font-body text-sm font-medium text-white/90">{r.role}</div>
            <ul className="mt-5 flex flex-col gap-3">
              {r.points.map((p) => (
                <li key={p} className="flex gap-3 font-body text-sm font-light leading-snug text-white/85">
                  <span className="mt-[0.45em] block h-1.5 w-1.5 shrink-0 rounded-full bg-white/70" aria-hidden="true" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

// Copies the BibTeX entry; if the clipboard is unavailable, shows it for manual selection.
function BibtexButton({ bibtex, onFallback }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(bibtex).then(done, onFallback);
    } else {
      onFallback();
    }
  };
  return (
    <button type="button" onClick={copy} className="liquid-glass focus-ring rounded-full px-3 py-1 font-mono text-xs text-white transition-colors hover:bg-white/10" aria-live="polite">
      {copied ? "Copied ✓" : "BibTeX"}
    </button>
  );
}

function PubRow({ p, i, onHome = true }) {
  const rise = useRiseInView();
  const [showBib, setShowBib] = useState(false);
  return (
    <motion.div {...rise(0.08 * i)} id={`paper-${p.slug}`} className="liquid-glass scroll-mt-28 rounded-[1.25rem] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
        <div className="font-heading text-4xl italic leading-none text-white md:w-24">{p.year}</div>
        <div className="min-w-0 flex-1">
          {onHome || p.arxiv ? (
            <a
              href={onHome ? researchHref(p.topic, `paper-${p.slug}`) : `https://arxiv.org/abs/${p.arxiv}`}
              {...(onHome ? {} : NEW_TAB)}
              className="focus-ring font-body text-base font-medium leading-snug text-white hover:underline md:text-lg"
            >
              {p.title}
            </a>
          ) : (
            <span className="font-body text-base font-medium leading-snug text-white md:text-lg">{p.title}</span>
          )}
          <div className="mt-1 font-body text-sm font-light text-white/70">
            {p.authors.map((a, j) => (
              <React.Fragment key={a}>
                {j > 0 && ", "}
                <span className={a === "Javad Maheri" ? "text-white" : ""}>{a}</span>
              </React.Fragment>
            ))}
          </div>
          <div className="mt-1 font-body text-sm italic text-white/70">{p.venue}</div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 md:max-w-[300px] md:justify-end">
          <span className="rounded-full border border-white/25 px-3 py-1 font-body text-xs text-white/80">{p.status}</span>
          {p.arxiv && (
            <a href={`https://arxiv.org/pdf/${p.arxiv}`} {...NEW_TAB} className="liquid-glass focus-ring flex items-center gap-1 rounded-full px-3 py-1 font-mono text-xs text-white transition-colors hover:bg-white/10">
              PDF <ArrowUpRight className="h-3 w-3" />
            </a>
          )}
          {p.arxiv && (
            <a href={`https://arxiv.org/abs/${p.arxiv}`} {...NEW_TAB} className="liquid-glass focus-ring flex items-center gap-1 rounded-full px-3 py-1 font-mono text-xs text-white transition-colors hover:bg-white/10">
              arXiv:{p.arxiv} <ArrowUpRight className="h-3 w-3" />
            </a>
          )}
          <BibtexButton bibtex={p.bibtex} onFallback={() => setShowBib(true)} />
        </div>
      </div>
      {showBib && (
        <pre className="mt-4 overflow-x-auto rounded-[0.75rem] bg-white/5 p-4 font-mono text-[11px] leading-relaxed text-white/85 select-all">{p.bibtex}</pre>
      )}
    </motion.div>
  );
}

function Publications() {
  const rise = useRiseInView();
  return (
    <section id="publications" className="relative bg-black px-4 pb-24 pt-28 md:px-16 lg:px-20">
      <motion.div {...rise(0)}>
        <Kicker>// Publications</Kicker>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-heading text-6xl italic leading-[0.9] tracking-[-3px] text-white md:text-7xl lg:text-[6rem]">Papers</h2>
          <a href={SCHOLAR_URL} {...NEW_TAB} className="liquid-glass focus-ring flex items-center gap-2 rounded-full px-4 py-2 font-body text-sm text-white transition-colors hover:bg-white/10">
            <BrandIcon d={SCHOLAR_PATH} className="h-4 w-4" /> Full list on Google Scholar <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </motion.div>
      <div className="mt-14 flex flex-col gap-4">
        {PUBS.map((p, i) => <PubRow key={p.title} p={p} i={i} />)}
      </div>
    </section>
  );
}

// Timeline drawn as a path graph that traces itself in on scroll.
function Journey() {
  const reduced = useReducedMotion();
  const ys = [26, 54, 26, 54, 26];
  const xs = [10, 30, 50, 70, 90];
  const d = xs.reduce((acc, x, i) => {
    if (!i) return `M ${x * 10} ${ys[i]}`;
    const px = xs[i - 1] * 10;
    return `${acc} C ${px + 100} ${ys[i - 1]}, ${x * 10 - 100} ${ys[i]}, ${x * 10} ${ys[i]}`;
  }, "");
  const view = { once: true, amount: 0.4 };
  return (
    <div className="mt-12">
      {/* Desktop: horizontal graph */}
      <div className="relative hidden md:block">
        <div className="relative h-20">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 80" preserveAspectRatio="none" aria-hidden="true">
            <motion.path
              d={d}
              fill="none"
              stroke="white"
              strokeOpacity="0.5"
              strokeWidth="1.5"
              initial={reduced ? false : { pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={view}
              transition={{ duration: 1.8, ease: "easeInOut" }}
            />
          </svg>
          {xs.map((x, i) => (
            <span key={i} className="absolute block h-3 w-3 -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${(ys[i] / 80) * 100}%` }}>
            <motion.span
              className="relative block h-3 w-3 rounded-full bg-white"
              initial={reduced ? false : { scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={view}
              transition={{ delay: 0.3 + i * 0.35, duration: 0.4 }}
            >
              {JOURNEY[i].now && !reduced && (
                <motion.span
                  className="absolute inset-0 rounded-full bg-white"
                  animate={{ scale: [1, 3], opacity: [0.5, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                />
              )}
            </motion.span>
            </span>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-5 gap-4">
          {JOURNEY.map((j, i) => (
            <motion.div
              key={j.when}
              className="liquid-glass rounded-[1.25rem] p-4"
              initial={reduced ? false : { opacity: 0, y: 16, filter: "blur(8px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={view}
              transition={{ delay: 0.4 + i * 0.35, duration: 0.6 }}
            >
              <JourneyBody j={j} />
            </motion.div>
          ))}
        </div>
      </div>
      {/* Mobile: vertical graph */}
      <div className="relative md:hidden">
        <motion.span
          className="absolute bottom-4 left-[7px] top-4 w-px origin-top bg-white/40"
          initial={reduced ? false : { scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 1.6, ease: "easeInOut" }}
        />
        <div className="flex flex-col gap-4">
          {JOURNEY.map((j, i) => (
            <motion.div
              key={j.when}
              className="relative pl-8"
              initial={reduced ? false : { opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ delay: 0.1 * i, duration: 0.5 }}
            >
              <span className="absolute left-[2px] top-5 block h-3 w-3 rounded-full bg-white" />
              <div className="liquid-glass rounded-[1.25rem] p-4"><JourneyBody j={j} /></div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function JourneyBody({ j }) {
  return (
    <>
      <div className="font-mono text-[11px] text-white/60">{j.when}</div>
      <div className="mt-2 font-heading text-2xl italic leading-none text-white">{j.where}</div>
      <div className="mt-2 font-body text-xs font-light leading-snug text-white/85">{j.what}</div>
    </>
  );
}

function Contact() {
  const rise = useRiseInView();
  return (
    <section id="contact" className="relative flex min-h-[90svh] flex-col overflow-hidden bg-black">
      <div className="absolute inset-0 z-0 opacity-50">
        <HypergraphField density={0.7} seed={3} topBias={false} interactive={false} label="Drifting hypergraph in the background" />
      </div>
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <Kicker>// Contact</Kicker>
        <BlurText as="h2" text="Let’s talk graphs" className="font-heading text-6xl italic leading-[0.85] tracking-[-3px] text-white md:text-7xl lg:text-[6rem]" />
        <motion.p {...rise(0.4)} className="mt-6 max-w-xl font-body text-sm font-light text-white/90 md:text-base">
          Questions about my work or an idea for a collaboration? Write to me.
        </motion.p>
        <motion.p {...rise(0.5)} className="mt-2 font-mono text-xs text-white/60">Javad Maheri · Sophia Antipolis, France · EURECOM / Sorbonne Université</motion.p>
        <motion.div {...rise(0.6)} className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href="mailto:j.maheri95@gmail.com" className="liquid-glass-strong focus-ring flex items-center gap-2 rounded-full px-5 py-2.5 font-body text-sm font-medium text-white">
            j.maheri95@gmail.com <ArrowUpRight />
          </a>
        </motion.div>
        <motion.div {...rise(0.7)} className="mt-6">
          <SocialRow only={["Google Scholar", "LinkedIn", "ORCID", "GitHub", "CV (PDF)"]} />
        </motion.div>
      </div>
      <footer className="relative z-10 pb-6 text-center font-body text-xs text-white/40">© 2026 Javad Maheri</footer>
    </section>
  );
}

function App() {
  useHashScroll();
  return (
    <main className="bg-black font-body text-white">
      <Navbar />
      <SectionRail />
      <Hero />
      <News />
      <About />
      <Research />
      <GapSection />
      <Experience />
      <Publications />
      <Contact />
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Research pages                                                      */
/* ------------------------------------------------------------------ */

const TOPIC_ORDER = ["allocation", "hypergraph-partitioning", "graph-learning"];

const TOPICS = {
  allocation: {
    kicker: "Distributed computing",
    title: "Universally Optimal Allocation",
    lead: "One task-blind data assignment that is optimal for every downstream workload at once.",
    tags: ["Distributed Computing", "Task-Blind", "Interweaved Cliques", "Matching Converse"],
    viz: (cls) => <AllocationViz className={cls} />,
    vizCaption: "Illustration: 6 servers and 15 data blocks, each stored on a pair of servers (the edges of K₆), placed round by round. The bar shows communication load falling to the converse.",
    question: {
      heading: "How should data be placed when you don’t know the job?",
      paras: [
        "In distributed computing, data and tasks are spread across many machines, and the machines exchange intermediate results to finish a job. That exchange is often the bottleneck.",
        "Data placement is usually tuned to one workload and re-planned for the next. I ask for more: a single task-blind allocation that is optimal for every downstream computation at once, with optimality proven exactly rather than up to constants.",
      ],
    },
    approach: [
      { title: "A combinatorial lens", body: "Task and data allocation can be cast as a hypergraph coloring and covering-design problem, which turns a systems question into a question about structured set systems." },
      { title: "Interweaved cliques", body: "Structured overlays of clique decompositions across compute nodes give allocation schemes that are optimal across every downstream task, rather than tuned to one workload at a time." },
      { title: "Designs where cliques run out", body: "Where such constructions do not exist directly, Steiner-type systems and their near-resolvable relatives supply the scaffolding, in the same lineage of ideas as coded caching’s placement–delivery tradeoff." },
      { title: "Matching converses", body: "Information-theoretic lower bounds that the constructions meet, cutting inter-node communication to its provable minimum on MapReduce-style workloads." },
    ],
    gap: true,
  },
  "hypergraph-partitioning": {
    kicker: "Combinatorics & probability",
    title: "Hypergraph Edge Partitioning",
    lead: "What partition quality is exactly achievable when a hypergraph’s edges appear at random?",
    tags: ["Hypergraphs", "Edge Sampling", "Finite-Size Exact", "Combinatorics"],
    viz: (cls) => <EdgeSamplingViz className={cls} />,
    vizCaption: "Illustration: each hyperedge is kept independently with probability p. The histogram of the resulting cut size builds up sample by sample and matches its exact binomial law.",
    question: {
      heading: "Exact answers for random hypergraphs",
      paras: [
        "Take a hypergraph and a random model that keeps each of its edges independently. How well can the sampled edges be partitioned, and what is the exact finite-size constant rather than only the scaling exponent?",
        "Working at that precision rules out the usual heuristics. The claim is a matching converse, so the combinatorics has to be exact.",
      ],
    },
    approach: [
      { title: "Independent edge sampling", body: "A hypergraph plus a random model over its edges: each edge is kept or dropped independently, so partition quality becomes a random quantity with an exact law." },
      { title: "Exact combinatorics", body: "Enumerative and constructive arguments instead of concentration-of-measure heuristics, because the goal is a bound that is tight at finite size, not only asymptotically." },
      { title: "Structure in complete hypergraphs", body: "Related work constructs Hamiltonian decompositions of complete k-uniform hypergraphs: explicit structure inside the most symmetric hypergraphs." },
    ],
  },
  "graph-learning": {
    kicker: "Machine learning",
    title: "Learning on Graphs",
    lead: "Graph neural networks, graph signal processing, and learning the graph itself from data.",
    tags: ["GNNs", "Graph Signal Processing", "Laplacian Learning", "Spatiotemporal"],
    viz: (cls) => <GraphSignalViz className={cls} />,
    vizCaption: "Illustration: a signal on the nodes diffuses through the graph Laplacian, while edge weights adapt to how similar their endpoints are.",
    question: {
      heading: "When the data is a graph",
      paras: [
        "Markets, cameras on an industrial site and wireless networks all produce data that lives on a graph. Learning well from it means using that structure, and often learning the structure itself.",
        "This is where my industry work started, and where I want to take the exact-limits toolkit next.",
      ],
    },
    approach: [
      { title: "Graph signal processing", body: "Signals on nodes, filtered and smoothed through the graph Laplacian. The animation above is one diffusion step after another." },
      { title: "Learning the structure", body: "Estimating the graph itself under smoothness and sparsity priors, instead of assuming it from raw correlations." },
      { title: "Message passing", body: "GNNs that aggregate information over neighbours, for example to resolve occlusion and viewpoint ambiguity across overlapping cameras." },
    ],
    practice: [
      { org: "Zarebin", meta: "Tehran · 2022", title: "Learning the graph from data", body: "Convex graph Laplacian estimation under smoothness and sparsity constraints to infer market-dependency graphs from raw price series, plus PageRank and personalized PageRank over multi-million-edge graphs on Spark / GraphX." },
      { org: "MAPNA", meta: "Tehran · 2021–2022", title: "Scene-graph GNNs for safety", body: "People, machinery, PPE and restricted zones as nodes, spatial and temporal relations as edges: classifying safety violations from interactions, and treating camera placement as graph optimization." },
    ],
    next: {
      text: "The same toolkit, matching converses paired with constructions that achieve them, extends to graph neural networks, graph signal processing, causal inference and integrated sensing and communication.",
      items: ["Graph neural networks and graph signal processing", "Causal inference for spatiotemporal data", "Integrated sensing and communication (ISAC)"],
      foundations: "Coursework at Sharif: Graph Signal Processing 20/20 · Theory of Machine Learning 20/20 · Deep Learning 19.1/20",
    },
  },
};

const TAG_CLASS = "rounded-full border border-white/15 px-3 py-1 font-body text-xs text-white/70";

// Converse-vs-achievability chart that closes as the panel scrolls through view.
function InlineGapChart() {
  const ref = useRef(null);
  const readoutRef = useRef(null);
  const progressRef = useRef(0);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const p = useTransform(scrollYProgress, [0.2, 1], [0, 1], { clamp: true });
  useMotionValueEvent(p, "change", (v) => { progressRef.current = v; });
  return (
    <div ref={ref} className="liquid-glass rounded-[1.5rem] p-4 md:p-8">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] text-white/80">
        <span className="flex items-center gap-2"><span className="inline-block h-[2px] w-4 bg-white" /> converse</span>
        <span className="flex items-center gap-2"><span className="inline-block w-4 border-t border-dashed border-white/60" /> order-optimal</span>
        <span className="flex items-center gap-2"><span className="inline-block h-[3px] w-4 bg-white shadow-[0_0_8px_white]" /> this work</span>
        <span ref={readoutRef} className="ml-auto text-white/80">gap = {(reduced ? 0 : GAP_START).toFixed(3)}</span>
      </div>
      <div className="h-[clamp(220px,40svh,420px)]">
        <GapChart progressRef={progressRef} readoutRef={readoutRef} />
      </div>
      <p className="mt-2 font-body text-[11px] text-white/50 md:text-xs">Illustrative curves; the gap closes as you scroll. See the papers for exact results.</p>
    </div>
  );
}

function SectionHead({ kicker, title, className = "" }) {
  return (
    <div className={className}>
      <Kicker>{kicker}</Kicker>
      <h2 className="font-heading text-4xl italic leading-[0.95] tracking-[-2px] text-white md:text-5xl">{title}</h2>
    </div>
  );
}

// Pages render after load, so the browser's own jump to #anchor finds nothing;
// jump once the target exists.
function useHashScroll() {
  useEffect(() => {
    if (!window.location.hash) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    const timer = setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ block: "start" });
    }, 350);
    return () => clearTimeout(timer);
  }, []);
}

function ResearchPage({ slug }) {
  const t = TOPICS[slug] || TOPICS.allocation;
  const rise = useRiseInView();
  const enter = useRise();
  const idx = TOPIC_ORDER.indexOf(slug);
  const papers = PUBS.filter((p) => p.topic === slug);
  const others = TOPIC_ORDER.filter((s) => s !== slug);

  useHashScroll();

  return (
    <main className="bg-black font-body text-white">
      <Navbar />

      <section className="relative overflow-hidden px-4 pb-12 pt-32 md:px-16 lg:px-20">
        <div className="absolute inset-0 z-0 opacity-60">
          <HypergraphField density={0.45} edgeAlpha={0.08} hyperedges={false} interactive={false} topBias={false} seed={31 + idx} label="Sparse drifting graph in the background" />
        </div>
        <div className="relative z-10">
          <motion.a {...enter(0.1)} href={homeHref("research")} className="focus-ring inline-flex items-center gap-2 rounded-full py-2 font-body text-sm text-white/70 hover:text-white">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
            All research
          </motion.a>
          <motion.div {...enter(0.2)} className="mt-6">
            <Kicker>{`// Research ${idx + 1} of ${TOPIC_ORDER.length} — ${t.kicker}`}</Kicker>
          </motion.div>
          <BlurText
            as="h1"
            text={t.title}
            justify="flex-start"
            delay={0.25}
            className="max-w-5xl font-heading text-6xl italic leading-[0.88] tracking-[-3px] text-white md:text-7xl lg:text-[6.5rem]"
          />
          <motion.p {...enter(0.6)} className="mt-6 max-w-3xl font-heading text-2xl italic leading-tight text-white/90 md:text-3xl">{t.lead}</motion.p>
          <motion.ul {...enter(0.75)} className="mt-6 flex flex-wrap gap-2">
            {t.tags.map((tag) => <li key={tag} className={TAG_CLASS}>{tag}</li>)}
          </motion.ul>
        </div>
      </section>

      <section className="px-4 md:px-16 lg:px-20">
        <motion.figure {...enter(0.9)} className="liquid-glass rounded-[1.5rem] p-5 md:p-8">
          <div className="mx-auto h-[clamp(200px,34svh,340px)] max-w-4xl">{t.viz("h-full")}</div>
          <figcaption className="mt-4 max-w-3xl font-mono text-[11px] leading-snug text-white/55">{t.vizCaption}</figcaption>
        </motion.figure>
      </section>

      <section className="px-4 pt-24 md:px-16 lg:px-20">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[380px_1fr] lg:gap-16">
          <motion.div {...rise(0)}><SectionHead kicker="// The question" title={t.question.heading} /></motion.div>
          <motion.div {...rise(0.1)} className="flex max-w-[62ch] flex-col gap-4 font-body text-base font-light leading-relaxed text-white/90 md:text-lg lg:pt-10">
            {t.question.paras.map((para) => <p key={para}>{para}</p>)}
          </motion.div>
        </div>
      </section>

      <section className="px-4 pt-24 md:px-16 lg:px-20">
        <motion.div {...rise(0)}><SectionHead kicker="// The approach" title="How I work on it" /></motion.div>
        <div className={`mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 ${t.approach.length === 3 ? "lg:grid-cols-3" : ""}`}>
          {t.approach.map((s, i) => (
            <motion.div key={s.title} {...rise(0.08 * i)} className="liquid-glass rounded-[1.25rem] p-6">
              <h3 className="font-heading text-3xl italic leading-none tracking-[-1px] text-white">{s.title}</h3>
              <p className="mt-3 font-body text-sm font-light leading-relaxed text-white/85">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {t.gap && (
        <section className="px-4 pt-24 md:px-16 lg:px-20">
          <motion.div {...rise(0)} className="mb-8"><SectionHead kicker="// Exact optimality" title="The gap closes" /></motion.div>
          <InlineGapChart />
        </section>
      )}

      {papers.length > 0 && (
        <section className="px-4 pt-24 md:px-16 lg:px-20">
          <motion.div {...rise(0)}><SectionHead kicker="// Papers" title={papers.length === 1 ? "The paper" : "The papers"} /></motion.div>
          <div className="mt-10 flex flex-col gap-4">
            {papers.map((p, i) => <PubRow key={p.slug} p={p} i={i} onHome={false} />)}
          </div>
        </section>
      )}

      {t.practice && (
        <section className="px-4 pt-24 md:px-16 lg:px-20">
          <motion.div {...rise(0)}><SectionHead kicker="// In practice" title="Where I’ve built it" /></motion.div>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            {t.practice.map((r, i) => (
              <motion.article key={r.org} {...rise(0.08 * i)} className="liquid-glass rounded-[1.25rem] p-6">
                <div className="font-mono text-[11px] text-white/60">{r.meta}</div>
                <h3 className="mt-3 font-heading text-3xl italic leading-none tracking-[-1px] text-white">{r.org}</h3>
                <div className="mt-2 font-body text-sm font-medium text-white/90">{r.title}</div>
                <p className="mt-3 font-body text-sm font-light leading-relaxed text-white/85">{r.body}</p>
              </motion.article>
            ))}
          </div>
        </section>
      )}

      {t.next && (
        <section className="px-4 pt-24 md:px-16 lg:px-20">
          <motion.div {...rise(0)} className="liquid-glass rounded-[1.5rem] p-6 md:p-10">
            <Kicker>// Where I want to take it</Kicker>
            <p className="max-w-3xl font-heading text-3xl italic leading-tight text-white md:text-4xl">{t.next.text}</p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {t.next.items.map((item) => <li key={item} className={TAG_CLASS}>{item}</li>)}
            </ul>
            <p className="mt-6 font-mono text-[11px] text-white/55">{t.next.foundations}</p>
          </motion.div>
        </section>
      )}

      <section className="px-4 pb-8 pt-24 md:px-16 lg:px-20" aria-labelledby="more-research">
        <motion.div {...rise(0)}>
          <Kicker>// Keep exploring</Kicker>
          <h2 id="more-research" className="sr-only">More research</h2>
        </motion.div>
        <div className="mt-2 grid grid-cols-1 gap-6 md:grid-cols-2">
          {others.map((s, i) => {
            const o = TOPICS[s];
            return (
              <motion.a
                key={s}
                href={researchHref(s)}
                {...rise(0.08 * i)}
                className="liquid-glass glass-hover focus-ring group flex flex-col rounded-[1.25rem] p-6 transition-transform hover:-translate-y-0.5"
              >
                <div className="font-mono text-[11px] text-white/55">{`Research ${TOPIC_ORDER.indexOf(s) + 1} — ${o.kicker}`}</div>
                <h3 className="mt-3 font-heading text-3xl italic leading-none tracking-[-1px] text-white md:text-4xl">{o.title}</h3>
                <p className="mt-3 max-w-[48ch] font-body text-sm font-light leading-snug text-white/85">{o.lead}</p>
                <span className="mt-5 inline-flex items-center gap-1 font-body text-sm font-medium text-white">
                  Explore this research <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </motion.a>
            );
          })}
        </div>
      </section>

      <ContactBand />
    </main>
  );
}

// Compact closing band for inner pages.
function ContactBand() {
  const rise = useRiseInView();
  return (
    <section className="px-4 pb-10 pt-16 md:px-16 lg:px-20">
      <motion.div {...rise(0)} className="flex flex-col items-start justify-between gap-6 border-t border-white/15 pt-10 md:flex-row md:items-center">
        <div>
          <div className="font-heading text-4xl italic leading-none text-white md:text-5xl">Let’s talk graphs</div>
          <p className="mt-3 font-body text-sm font-light text-white/80">Questions about this work or an idea for a collaboration? Write to me.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a href="mailto:j.maheri95@gmail.com" className="liquid-glass-strong focus-ring flex h-11 items-center gap-2 rounded-full px-5 font-body text-sm font-medium text-white transition-colors hover:bg-white/10">
            j.maheri95@gmail.com <ArrowUpRight />
          </a>
          <SocialRow only={["Google Scholar", "LinkedIn", "ORCID", "GitHub", "CV (PDF)"]} />
        </div>
      </motion.div>
      <footer className="mt-10 font-body text-xs text-white/40">© 2026 Javad Maheri</footer>
    </section>
  );
}

createRoot(ROOT_EL).render(PAGE === "research" ? <ResearchPage slug={TOPIC} /> : <App />);
