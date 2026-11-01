import Image from 'next/image';

type LogoProps = {
  darkMode?: boolean;
  priority?: boolean;
};

/** The source PNG is a 1080×1080 canvas; Figma crops it into a 69×60 frame. */
export default function Logo({ darkMode = false, priority = false }: LogoProps) {
  return (
    <span className="relative block h-[60px] w-[69px] shrink-0 overflow-hidden">
      <Image
        src={darkMode ? '/images/logo-dark.png' : '/images/logo.png'}
        alt="Elias"
        width={1080}
        height={1080}
        priority={priority}
        className="absolute top-[-26.22%] left-[-15.94%] h-[152.44%] w-[132.56%] max-w-none"
      />
    </span>
  );
}
