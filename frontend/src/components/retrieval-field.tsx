"use client";

import { useEffect, useRef } from "react";

type Node = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  depth: number;
};

type Rgb = [number, number, number];

function toRgb(value: string, fallback: Rgb): Rgb {
  const v = value.trim();
  if (v.startsWith("#")) {
    const hex = v.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    if (full.length === 6) {
      const n = Number.parseInt(full, 16);
      if (!Number.isNaN(n)) {
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      }
    }
  }
  const m = v.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  return fallback;
}

function readTheme() {
  const cs = getComputedStyle(document.documentElement);
  return {
    ink: toRgb(cs.getPropertyValue("--ink"), [26, 24, 21]),
    accent: toRgb(cs.getPropertyValue("--accent"), [194, 65, 12]),
  };
}

export function RetrievalField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let nodes: Node[] = [];
    let raf = 0;
    let theme = readTheme();

    const seed = () => {
      const count = Math.max(46, Math.min(88, Math.round((width * height) / 16000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        r: Math.random() * 1.4 + 0.6,
        depth: Math.random(),
      }));
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const { x: px, y: py, active } = pointer.current;
      const radius = Math.min(width, height) * 0.42;
      const [ir, ig, ib] = theme.ink;
      const [ar, ag, ab] = theme.accent;

      for (const node of nodes) {
        const dx = node.x - px;
        const dy = node.y - py;
        const dist = Math.hypot(dx, dy);
        const hot = active ? Math.max(0, 1 - dist / radius) : 0;

        if (hot > 0.08) {
          ctx.strokeStyle = `rgba(${ar},${ag},${ab},${hot * 0.5})`;
          ctx.lineWidth = 0.6 + hot * 0.8;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(node.x, node.y);
          ctx.stroke();
        }

        const base = 0.16 + node.depth * 0.22;
        const alpha = Math.min(0.9, base + hot * 0.8);
        const size = node.r + hot * 2.2;
        ctx.fillStyle =
          hot > 0.3
            ? `rgba(${ar},${ag},${ab},${alpha})`
            : `rgba(${ir},${ig},${ib},${alpha})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      if (active) {
        ctx.fillStyle = `rgba(${ar},${ag},${ab},0.9)`;
        ctx.beginPath();
        ctx.arc(px, py, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const step = () => {
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
      }
      draw();
      raf = requestAnimationFrame(step);
    };

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      pointer.current = { x, y, active: inside };
    };

    const onLeave = () => {
      pointer.current.active = false;
    };

    resize();
    if (reduce) {
      draw();
    } else {
      raf = requestAnimationFrame(step);
    }

    const observer = new ResizeObserver(() => {
      resize();
      if (reduce) draw();
    });
    observer.observe(canvas);

    const themeObserver = new MutationObserver(() => {
      theme = readTheme();
      if (reduce) draw();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />;
}
