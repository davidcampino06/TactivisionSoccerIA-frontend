/** TactiVision mark: a ball framed by detection brackets. */
export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="logo-mark">
      <g fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round">
        <path d="M3 11V3h8M29 3h8v8M37 29v8h-8M11 37H3v-8" />
      </g>
      <circle cx="20" cy="20" r="10.5" fill="var(--chalk)" />
      <path d="M20 14.2l5.1 3.7-1.95 6h-6.3l-1.95-6z" fill="var(--pitch-deep)" />
      <g stroke="var(--pitch-deep)" strokeWidth="1.3" strokeLinecap="round">
        <path d="M20 14.2V9.6M25.1 17.9l4.3-1.4M23.15 23.9l2.7 3.6M16.85 23.9l-2.7 3.6M14.9 17.9l-4.3-1.4" />
      </g>
    </svg>
  );
}
