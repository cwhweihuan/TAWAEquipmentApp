"use client";

import { useMemo } from "react";

/** Theme-matched cat colors: rose accents + a touch of lavender (saturated
 *  enough to still read as soft blobs behind frosted-glass surfaces). */
const COLORS = ["#ff6fae", "#f0469a", "#ff8cbf", "#9b78ee"];
/** Dark plum for eyes / nose / whiskers so the face reads on every body color. */
const INK = "#3a2436";

/**
 * Deterministic pseudo-random in [0,1) from an index + salt. Using a stable
 * function (rather than Math.random) keeps the server and client markup
 * identical, so there's no hydration mismatch and no need for an effect.
 */
function seeded(i: number, salt: number): number {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** A cute cat face (round head, pointy ears, whiskers) in a 24×24 viewBox. */
function CatFace({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      {/* ears */}
      <path d="M4 10.5 L3.6 2.6 L10.2 6.4 Z" fill={color} />
      <path d="M20 10.5 L20.4 2.6 L13.8 6.4 Z" fill={color} />
      {/* inner ears */}
      <path d="M5.6 9.2 L5.4 5 L8.6 7 Z" fill="#fff" opacity="0.45" />
      <path d="M18.4 9.2 L18.6 5 L15.4 7 Z" fill="#fff" opacity="0.45" />
      {/* head */}
      <ellipse cx="12" cy="13.5" rx="9" ry="8.2" fill={color} />
      {/* eyes */}
      <ellipse cx="8.8" cy="12.6" rx="1.2" ry="1.6" fill={INK} opacity="0.85" />
      <ellipse cx="15.2" cy="12.6" rx="1.2" ry="1.6" fill={INK} opacity="0.85" />
      <circle cx="9.2" cy="12" r="0.4" fill="#fff" />
      <circle cx="15.6" cy="12" r="0.4" fill="#fff" />
      {/* nose + mouth */}
      <path d="M11 15.2 h2 l-1 1.1 z" fill={INK} opacity="0.8" />
      <path
        d="M10.4 17.1 q0.8 0.9 1.6 0 q0.8 0.9 1.6 0"
        fill="none"
        stroke={INK}
        strokeWidth="0.6"
        strokeLinecap="round"
        opacity="0.8"
      />
      {/* whiskers */}
      <g stroke={INK} strokeWidth="0.55" strokeLinecap="round" opacity="0.6">
        <path d="M2.6 13.6 L7 14.4" />
        <path d="M2.6 16.4 L7 15.6" />
        <path d="M21.4 13.6 L17 14.4" />
        <path d="M21.4 16.4 L17 15.6" />
      </g>
    </svg>
  );
}

/**
 * A gentle floating-cats backdrop. Fixed behind all content
 * (-z-10, pointer-events:none) so it never blocks clicks or text selection.
 * Honors the OS "reduce motion" setting via CSS (see globals.css).
 */
export function FloatingCats({
  count = 34,
  mode = "rise",
}: {
  count?: number;
  mode?: "rise" | "fall";
}) {
  const base = 16; // baseline animation period in seconds
  // Round every value to a short, fixed precision. Math.sin can differ in its
  // last bits across JS engines (server Node vs the browser), so full-precision
  // floats would serialize differently and trip a hydration mismatch; rounding
  // makes the server and client markup byte-identical.
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const cats = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: r2(seeded(i, 1) * 102 - 2), // vw
        size: Math.round(22 + seeded(i, 2) * 28), // px — bigger so they read through frosted glass
        dur: r2(base * 0.7 + seeded(i, 3) * base * 0.7), // s
        delay: r2(-seeded(i, 4) * base), // s
        sway: Math.round(seeded(i, 5) * 160 - 80), // px
        opacity: r2(0.6 + seeded(i, 6) * 0.35),
        color: COLORS[Math.floor(seeded(i, 7) * COLORS.length)],
      })),
    [count]
  );

  return (
    <div
      className="cat-layer pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      {cats.map((c) => (
        <span
          key={c.id}
          className={`float-cat float-cat--${mode}`}
          style={
            {
              left: `${c.left}vw`,
              width: c.size,
              height: c.size,
              opacity: c.opacity,
              "--dur": `${c.dur}s`,
              "--delay": `${c.delay}s`,
              "--sway": `${c.sway}px`,
            } as React.CSSProperties
          }
        >
          <CatFace color={c.color} />
        </span>
      ))}
    </div>
  );
}
