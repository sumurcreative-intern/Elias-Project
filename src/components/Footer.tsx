import Link from 'next/link';

const links = ['Syarat', 'Privasi', 'Cookies'];

export default function Footer() {
  return (
    <footer
      data-animate="footer"
      className="w-full bg-bg-white px-4 py-12 md:px-[30px] md:pt-16 laptop:px-20"
    >
      <div className="flex flex-col gap-8">
        <div className="h-px bg-neutral-200" />
        {/* Mobile: links above the copyright, centered */}
        <div className="flex flex-col-reverse items-center gap-4 text-md text-neutral-500 md:flex-row md:gap-8">
          <p className="text-center md:min-w-0 md:flex-[1_0_0] md:text-left">
            © 2026 Elias. Hak cipta dilindungi.
          </p>
          <nav aria-label="Tautan footer" className="flex gap-4 whitespace-nowrap">
            {links.map((link) => (
              <Link key={link} href="#" className="transition-colors hover:text-txt-black">
                {link}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
