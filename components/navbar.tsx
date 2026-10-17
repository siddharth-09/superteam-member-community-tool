import Link from "next/link";
import { SolanaMark, SuperteamMark } from "@/components/brand-logos";

export function Navbar() {
  const repo = process.env.NEXT_PUBLIC_GITHUB_URL;
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#0B0B10]/80 backdrop-blur-xl">
      <nav aria-label="Main" className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#14F195]/70">
          <SolanaMark className="h-5 w-6 shrink-0" />
          <span className="text-white/20" aria-hidden>×</span>
          <SuperteamMark className="size-6 shrink-0 text-xs" />
          <span className="hidden truncate text-sm font-semibold tracking-tight text-white sm:inline">Community Name Finder</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[#14F195]/25 bg-[#14F195]/[0.07] px-2.5 py-1 text-[11px] font-medium text-[#14F195]">
            Built for the community
          </span>
          {repo ? (
            <a
              href={repo}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View the project on GitHub"
              className="inline-flex size-8 items-center justify-center rounded-lg text-white/70 outline-none transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-[#14F195]/70"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
                <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
              </svg>
            </a>
          ) : null}
        </div>
      </nav>
    </header>
  );
}
