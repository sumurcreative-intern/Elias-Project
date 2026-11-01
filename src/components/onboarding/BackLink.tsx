import Link from 'next/link';
import { CaretLeft } from '@phosphor-icons/react/ssr';

type BackLinkProps = {
  href: string;
  label?: string;
  /** "lg" keeps the tablet size on mobile too */
  size?: 'responsive' | 'lg';
};

export default function BackLink({ href, label = 'Kembali ke tahap sebelumnya', size = 'responsive' }: BackLinkProps) {
  return (
    <Link
      data-animate="form-item"
      href={href}
      className={`group flex w-fit items-center text-txt-black ${
        size === 'lg' ? 'gap-2.5 text-xl' : 'gap-1.5 text-lg md:gap-2.5 md:text-xl'
      }`}
    >
      <CaretLeft size={28} className="text-stone transition-transform group-hover:-translate-x-0.5" />
      {label}
    </Link>
  );
}
