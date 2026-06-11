"use client";

import { useMemo } from "react";

/** Theme-matched heart colors: rose accents + a touch of lavender (saturated
 *  enough to still read as soft blobs behind frosted-glass surfaces). */
const COLORS = ["#ff6fae", "#f0469a", "#ff8cbf", "#9b78ee"];

/**
 * Deterministic pseudo-random in [0,1) from an index + salt. Using a stable
 * function (rather than Math.random) keeps the server and client markup
 * identical, so there's no hydration mismatch and no need for an effect.
 */
function seeded(i: number, salt: number): number {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * A gentle floating-hearts backdrop. Fixed behind all content
 * (-z-10, pointer-events:none) so it never blocks clicks or text selection.
 * Honors the OS "reduce motion" setting via CSS (see globals.css).
 */
export function FloatingHearts({
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
  const hearts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: r2(seeded(i, 1) * 102 - 2), // vw
        size: Math.round(18 + seeded(i, 2) * 26), // px — bigger so they read through frosted glass
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
      className="heart-layer pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      {hearts.map((h) => (
        <span
          key={h.id}
          className={`float-heart float-heart--${mode}`}
          style={
            {
              left: `${h.left}vw`,
              width: h.size,
              height: h.size,
              opacity: h.opacity,
              "--dur": `${h.dur}s`,
              "--delay": `${h.delay}s`,
              "--sway": `${h.sway}px`,
            } as React.CSSProperties
          }
        >
          <svg viewBox="0 0 24 24" width="100%" height="100%" fill={h.color} xmlns="http://www.w3.org/2000/svg">
            <path d="M12 21s-7.5-4.9-10-9.2C.4 8.9 1.6 5.4 4.6 4.4c2-.7 4.2 0 5.4 1.7L12 8l2-1.9c1.2-1.7 3.4-2.4 5.4-1.7 3 1 4.2 4.5 2.6 7.4-2.5 4.3-10 9.2-10 9.2z" />
          </svg>
        </span>
      ))}
    </div>
  );
}
