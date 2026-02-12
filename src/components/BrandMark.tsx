import type { SVGProps } from 'react';

type BrandMarkProps = SVGProps<SVGSVGElement>;

export default function BrandMark({ className, ...props }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="GhostBrowser logo"
      role="img"
      {...props}
    >
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#131A33" stroke="#4F46E5" strokeOpacity="0.35" />
      <path
        d="M24 10.5C17.1 10.5 11.5 16.1 11.5 23V35.2C11.5 35.9 12.3 36.3 12.9 35.9L15.9 33.8L19.2 36.1C19.6 36.4 20.2 36.4 20.6 36.1L24 33.7L27.4 36.1C27.8 36.4 28.4 36.4 28.8 36.1L32.1 33.8L35.1 35.9C35.7 36.3 36.5 35.9 36.5 35.2V23C36.5 16.1 30.9 10.5 24 10.5Z"
        fill="#E5E7EB"
        fillOpacity="0.97"
        stroke="#7C8BFF"
        strokeWidth="1.4"
      />
      <circle cx="19.5" cy="23.5" r="2.1" fill="#1B2447" />
      <circle cx="28.5" cy="23.5" r="2.1" fill="#1B2447" />
      <path d="M20 29.2C20.8 30.3 22.2 31 24 31C25.8 31 27.2 30.3 28 29.2" stroke="#4F46E5" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
