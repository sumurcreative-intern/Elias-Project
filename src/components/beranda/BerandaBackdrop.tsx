import Image from 'next/image';

// The Figma glows: ellipses at 5–6% opacity behind a 250px blur, which is
// costly to draw. Each is a radial gradient instead, on the ellipse's box
// grown by the blur (250px a side), fading out the way the blur does. Offsets
// are from the 1440px frame's left edge, centred on wider screens
const glows = [
  { left: -814, top: -896, color: 'rgb(252 60 47 / 0.05)' },
  { left: 855, top: 95, color: 'rgb(58 57 97 / 0.06)' },
  { left: -814, top: 1552, color: 'rgb(252 60 47 / 0.05)' },
];

/**
 * Beranda's backdrop: dashed rings rising from behind the header and soft
 * red and indigo glows down the page. AppShell clips what spills past the
 * sides. The rings turn once every four minutes, stopping for reduced motion;
 * the glows hold still.
 */
export default function BerandaBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {glows.map(({ left, top, color }) => (
        <div
          key={`${left},${top}`}
          className="absolute h-[1870px] w-[1490px]"
          style={{
            left: `calc(50% - 720px + ${left}px)`,
            top,
            background: `radial-gradient(closest-side, ${color} 30%, transparent)`,
          }}
        />
      ))}
      <Image
        src="/images/beranda/rings.svg"
        alt=""
        width={1441}
        height={1441}
        className="absolute top-[-710px] left-[calc(50%-720px)] max-w-none motion-safe:animate-backdrop-spin"
      />
    </div>
  );
}
