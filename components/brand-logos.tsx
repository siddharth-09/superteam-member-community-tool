/** Solana-inspired three-bar mark (original drawing, not the official asset). */
export function SolanaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="sol-g" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#9945FF" />
          <stop offset="1" stopColor="#14F195" />
        </linearGradient>
      </defs>
      <path fill="url(#sol-g)" d="M7 0h31a1 1 0 0 1 .7 1.7L33 7.4a2 2 0 0 1-1.4.6H1a1 1 0 0 1-.7-1.7L5.6.6A2 2 0 0 1 7 0Z" />
      <path fill="url(#sol-g)" d="M7 12h31a1 1 0 0 1 .7 1.7L33 19.4a2 2 0 0 1-1.4.6H1a1 1 0 0 1-.7-1.7l5.3-5.7A2 2 0 0 1 7 12Z" />
      <path fill="url(#sol-g)" d="M33 24H2a1 1 0 0 0-.7 1.7L7 31.4a2 2 0 0 0 1.4.6H39a1 1 0 0 0 .7-1.7l-5.3-5.7A2 2 0 0 0 33 24Z" />
    </svg>
  );
}

export function SuperteamMark({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg bg-[#9945FF] font-black tracking-tighter text-white ${className ?? ""}`}
      aria-hidden
    >
      st
    </span>
  );
}
