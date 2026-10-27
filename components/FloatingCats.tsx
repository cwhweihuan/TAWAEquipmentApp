"use client";

import { useMemo } from "react";

/* ──────────────────────────────────────────────────────────────────────────
 * Pixel-art backdrop: chunky little cats (glasses, laptops, headphones) and
 * neon math symbols drifting over a near-black navy sky.
 *
 * Every sprite is a tiny character grid. Each grid is rendered ONCE into an
 * SVG <symbol>; floaters just <use> it, so 50 floaters cost ~50 DOM nodes
 * instead of thousands of <rect>s.
 * ────────────────────────────────────────────────────────────────────────── */

type Grid = string[];
type Palette = Record<string, string>;

/* ---- cat palettes (legend: c body, d shade, k ink, p blush, g glasses,
 *      w highlight, l laptop lid, s laptop base, h headphones) ---- */
const CREAM: Palette = {
  c: "#f6e7d2",
  d: "#d9bf9f",
  k: "#2a2140",
  p: "#f7a6c4",
  g: "#5ee3ff",
  w: "#ffffff",
  l: "#2e2b4a",
  s: "#4a4778",
  h: "#c084fc",
};
const GREY: Palette = { ...CREAM, c: "#c9c7d6", d: "#9e9cb3" };
const WHITE: Palette = { ...CREAM, c: "#fbfafe", d: "#d6d3e8" };

/* ---- cat sprites ---- */
const CAT_GLASSES: Grid = [
  "..c........c..",
  ".cc........cc.",
  ".ccc......ccc.",
  ".cccccccccccc.",
  "cccccccccccccc",
  "cgggccccccgggc",
  "cgkwgccccgwkgc",
  "cgkkggggggkkgc",
  "cgggccccccgggc",
  "ccpccckkcccpcc",
  ".cccccccccccc.",
  ".cccccccccccc.",
  ".cccccccccccc.",
  ".ccc.cccc.ccc.",
  ".ddd.dddd.ddd.",
];

const CAT_LAPTOP: Grid = [
  "...cc......cc...",
  "..ccc......ccc..",
  "..cccccccccccc..",
  ".cccccccccccccc.",
  ".cgggccccccgggc.",
  ".cgkwgccccgwkgc.",
  ".cgkkggggggkkgc.",
  ".cgggccccccgggc.",
  ".ccpccckkcccpcc.",
  "cccccccccccccccc",
  "cllllllllllllllc",
  "cllllllppllllllc",
  "cllllllllllllllc",
  "ssssssssssssssss",
];

const CAT_HEADPHONES: Grid = [
  "..c........c..",
  ".cchhhhhhhhcc.",
  ".ccchcccchccc.",
  ".cccccccccccc.",
  "hhcccccccccchh",
  "hhckkcccckkchh",
  "hhcwkcccckwchh",
  "hhcccccccccchh",
  "ccpccckkcccpcc",
  ".cccccccccccc.",
  ".cccccccccccc.",
  ".ccc.cccc.ccc.",
  ".ddd.dddd.ddd.",
];

/* ---- neon symbol sprites (single colour "x" = currentColor) ---- */
const HEART: Grid = [".xx.xx.", "xxxxxxx", "xxxxxxx", ".xxxxx.", "..xxx..", "...x..."];
const STAR: Grid = [
  "....x....",
  "....x....",
  "...xxx...",
  "xxxxxxxxx",
  ".xxxxxxx.",
  "..xxxxx..",
  "..xx.xx..",
  ".xx...xx.",
];
const PAW: Grid = [".x...x.", "xxx.xxx", ".x.x.x.", "..xxx..", ".xxxxx.", ".xxxxx.", "..xxx.."];
const DIAMOND: Grid = [
  "..xxxxx..",
  ".x.x.x.x.",
  "xxxxxxxxx",
  ".xxxxxxx.",
  "..xxxxx..",
  "...xxx...",
  "....x....",
];
const PI: Grid = [
  ".xxxxxxxx",
  "xxxxxxxxx",
  "..xx..xx.",
  "..xx..xx.",
  "..xx..xx.",
  "..xx..xx.",
  ".xx...xx.",
  ".xx...xx.",
];
const SIGMA: Grid = [
  "xxxxxxx",
  "xxxxxxx",
  "xx.....",
  ".xx....",
  "..xx...",
  ".xx....",
  "xx.....",
  "xxxxxxx",
  "xxxxxxx",
];
const INTEGRAL: Grid = [
  "...xx",
  "..xxx",
  "..xx.",
  "..xx.",
  "..xx.",
  "..xx.",
  "..xx.",
  "..xx.",
  "..xx.",
  "xxx..",
  "xx...",
];
const SQRT_X: Grid = [
  "....xxxxxxxx",
  "....x.......",
  "...x..x...x.",
  "x..x...x.x..",
  "xx.x....x...",
  ".xxx...x.x..",
  "..xx..x...x.",
  "...x........",
];
const INFINITY: Grid = [".xxx...xxx.", "x...x.x...x", "x....x....x", "x...x.x...x", ".xxx...xxx."];
const PLUS: Grid = ["..x..", "..x..", "xxxxx", "..x..", "..x.."];
const CROSS: Grid = ["x...x", ".x.x.", "..x..", ".x.x.", "x...x"];
const TRIANGLE: Grid = [
  "....x....",
  "...x.x...",
  "...x.x...",
  "..x...x..",
  "..x...x..",
  ".x.....x.",
  ".x.....x.",
  "xxxxxxxxx",
];
const CIRCLE: Grid = ["..xxx..", ".x...x.", "x.....x", "x.....x", "x.....x", ".x...x.", "..xxx.."];
const SPARKLE: Grid = ["..x..", ".xxx.", "xxxxx", ".xxx.", "..x.."];

/* ---- a 5-row micro font so formulas render as pixel text too ---- */
const FONT: Record<string, Grid> = {
  E: ["xxx", "x..", "xxx", "x..", "xxx"],
  G: [".xxx", "x...", "x.xx", "x..x", ".xxx"],
  a: ["....", ".xx.", "...x", ".xxx", "x..x"],
  b: ["x..", "x..", "xxx", "x.x", "xxx"],
  c: ["...", ".xx", "x..", "x..", ".xx"],
  m: [".....", "xx.x.", "x.x.x", "x.x.x", "x.x.x"],
  x: ["...", "...", "x.x", ".x.", "x.x"],
  y: ["x.x", "x.x", "xxx", "..x", "xx."],
  "=": ["...", "xxx", "...", "xxx", "..."],
  "+": ["...", ".x.", "xxx", ".x.", "..."],
  "²": ["xx.", "..x", ".x.", "xxx", "..."],
};
function textGrid(s: string): Grid {
  const rows = ["", "", "", "", ""];
  for (const ch of s) {
    const g = FONT[ch];
    if (!g) continue;
    for (let r = 0; r < 5; r++) rows[r] += (rows[r] ? "." : "") + g[r];
  }
  return rows;
}

/* ---- sprite registry ---- */
type Sprite = { id: string; grid: Grid; palette?: Palette; kind: "cat" | "neon" };
const NEON: Palette = { x: "currentColor" };
const SPRITES: Sprite[] = [
  { id: "cat-glasses-cream", grid: CAT_GLASSES, palette: CREAM, kind: "cat" },
  { id: "cat-glasses-grey", grid: CAT_GLASSES, palette: GREY, kind: "cat" },
  { id: "cat-laptop-cream", grid: CAT_LAPTOP, palette: CREAM, kind: "cat" },
  { id: "cat-laptop-white", grid: CAT_LAPTOP, palette: WHITE, kind: "cat" },
  { id: "cat-laptop-grey", grid: CAT_LAPTOP, palette: GREY, kind: "cat" },
  { id: "cat-headphones-white", grid: CAT_HEADPHONES, palette: WHITE, kind: "cat" },
  { id: "cat-headphones-cream", grid: CAT_HEADPHONES, palette: CREAM, kind: "cat" },
  { id: "heart", grid: HEART, kind: "neon" },
  { id: "star", grid: STAR, kind: "neon" },
  { id: "paw", grid: PAW, kind: "neon" },
  { id: "diamond", grid: DIAMOND, kind: "neon" },
  { id: "pi", grid: PI, kind: "neon" },
  { id: "sigma", grid: SIGMA, kind: "neon" },
  { id: "integral", grid: INTEGRAL, kind: "neon" },
  { id: "sqrt-x", grid: SQRT_X, kind: "neon" },
  { id: "infinity", grid: INFINITY, kind: "neon" },
  { id: "plus", grid: PLUS, kind: "neon" },
  { id: "cross", grid: CROSS, kind: "neon" },
  { id: "triangle", grid: TRIANGLE, kind: "neon" },
  { id: "circle", grid: CIRCLE, kind: "neon" },
  { id: "sparkle", grid: SPARKLE, kind: "neon" },
  { id: "emc2", grid: textGrid("E=mc²"), kind: "neon" },
  { id: "ymxb", grid: textGrid("y=mx+b"), kind: "neon" },
  { id: "pythag", grid: textGrid("a²+b²=c²"), kind: "neon" },
  { id: "gg", grid: textGrid("GG"), kind: "neon" },
  { id: "x2", grid: textGrid("x²"), kind: "neon" },
];

const NEON_COLORS = ["#ff5fb4", "#4ee6ff", "#b57bff", "#ffe066", "#6ef2b5", "#7b9bff"];

/** Deterministic pseudo-random in [0,1); keeps server and client markup identical. */
function seeded(i: number, salt: number): number {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Turn a character grid into run-length-merged <rect>s. */
function gridRects(grid: Grid, palette: Palette) {
  const rects: React.ReactNode[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === ".") {
        x++;
        continue;
      }
      let w = 1;
      while (row[x + w] === ch) w++;
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={w} height={1} fill={palette[ch] ?? "currentColor"} />);
      x += w;
    }
  });
  return rects;
}

function SpriteDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        {SPRITES.map((s) => (
          <symbol
            key={s.id}
            id={`px-${s.id}`}
            viewBox={`0 0 ${s.grid[0].length} ${s.grid.length}`}
            shapeRendering="crispEdges"
          >
            {gridRects(s.grid, s.palette ?? NEON)}
          </symbol>
        ))}
      </defs>
    </svg>
  );
}

/**
 * Pixel cats + neon math drifting slowly upward, fixed behind all content
 * (-z-10, pointer-events:none). Honors "reduce motion" via CSS (globals.css).
 */
export function FloatingCats({
  count = 64,
  mode = "rise",
}: {
  count?: number;
  mode?: "rise" | "fall";
}) {
  const base = 30; // baseline drift period in seconds — slow, like a screensaver
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const floaters = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        // roughly 1 in 3 floaters is a cat, the rest are neon doodles
        const isCat = seeded(i, 8) < 0.34;
        const pool = SPRITES.filter((s) => s.kind === (isCat ? "cat" : "neon"));
        const sprite = pool[Math.floor(seeded(i, 7) * pool.length)];
        const w = sprite.grid[0].length;
        const h = sprite.grid.length;
        // cats render at ~3–4.5 px per cell, doodles at ~2.6–4 px per cell
        const cell = isCat ? 3 + seeded(i, 2) * 1.5 : 2.6 + seeded(i, 2) * 1.4;
        return {
          id: i,
          sprite,
          left: r2(seeded(i, 1) * 102 - 2), // vw
          width: Math.round(w * cell),
          height: Math.round(h * cell),
          dur: r2(base * 0.7 + seeded(i, 3) * base * 0.7), // s
          delay: r2(-seeded(i, 4) * base), // s
          sway: Math.round(seeded(i, 5) * 120 - 60), // px
          opacity: r2(isCat ? 0.85 + seeded(i, 6) * 0.15 : 0.55 + seeded(i, 6) * 0.4),
          color: NEON_COLORS[Math.floor(seeded(i, 9) * NEON_COLORS.length)],
        };
      }),
    [count]
  );

  return (
    <div className="cat-layer pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <SpriteDefs />
      {floaters.map((f) => (
        <span
          key={f.id}
          className={`float-cat float-cat--${mode} float-cat--${f.sprite.kind}`}
          style={
            {
              left: `${f.left}vw`,
              width: f.width,
              height: f.height,
              opacity: f.opacity,
              color: f.color,
              "--dur": `${f.dur}s`,
              "--delay": `${f.delay}s`,
              "--sway": `${f.sway}px`,
            } as React.CSSProperties
          }
        >
          <svg
            viewBox={`0 0 ${f.sprite.grid[0].length} ${f.sprite.grid.length}`}
            width="100%"
            height="100%"
            shapeRendering="crispEdges"
          >
            <use href={`#px-${f.sprite.id}`} />
          </svg>
        </span>
      ))}
    </div>
  );
}
