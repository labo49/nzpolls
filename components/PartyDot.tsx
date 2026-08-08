/**
 * A party's color dot, rendered as two CSS-toggled spans rather than one
 * JS-picked color -- NZ First's near-black/near-white pair means a single
 * fixed color is invisible on one of the two page themes (found via a dark
 * mode screenshot: the light color is literally #111111, invisible on the
 * dark surface). Works in server components since it's pure CSS, no
 * matchMedia needed.
 */
export default function PartyDot({ color }: { color: { light: string; dark: string } }) {
  return (
    <>
      <span
        aria-hidden
        className="inline-block h-2 w-2 shrink-0 rounded-full dark:hidden"
        style={{ backgroundColor: color.light }}
      />
      <span
        aria-hidden
        className="hidden h-2 w-2 shrink-0 rounded-full dark:inline-block"
        style={{ backgroundColor: color.dark }}
      />
    </>
  );
}
