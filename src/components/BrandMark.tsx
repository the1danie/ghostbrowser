import type { SVGProps } from 'react';

type BrandMarkProps = SVGProps<SVGSVGElement>;

export default function BrandMark({ className, ...props }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="NebulaBrowse logo"
      role="img"
      {...props}
    >
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#131A33" stroke="#4F46E5" strokeOpacity="0.35" />
      <circle cx="24" cy="24" r="12.5" stroke="#4F46E5" strokeWidth="2.5" strokeOpacity="0.8" />
      <circle cx="24" cy="24" r="2.2" fill="#7DD3FC" fillOpacity="0.95" />
      <path d="M16 31V17" stroke="#E5E7EB" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M16 17L32 31" stroke="#7DD3FC" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M32 31V17" stroke="#E5E7EB" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}
