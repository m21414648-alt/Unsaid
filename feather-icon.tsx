import type { SVGProps } from 'react';

export default function FeatherIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M20.5 3.5c-4-1-8.6 1-11.4 4.7C6.4 11.8 6 15.2 7.2 17.1c2 .8 5.3-.1 8.2-3.1 3.6-3.6 5.7-7.4 5.1-10.5Z"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      />
      <path d="M3 21 16.5 7.5M9 15l4 .1M12 12l.1-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}