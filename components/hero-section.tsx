import type { ComponentProps } from "react";
import { NameSearch } from "@/components/name-search";

export function HeroSection(props: ComponentProps<typeof NameSearch>) {
  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(153,69,255,0.28),transparent_70%)]" />
      <div aria-hidden className="pointer-events-none absolute -right-24 top-24 -z-10 size-72 rounded-full bg-[#14F195]/[0.07] blur-3xl" />
      <div className="mx-auto flex max-w-7xl flex-col items-center px-4 pb-10 pt-14 text-center sm:px-6 sm:pt-20">
        <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl">
          Thousands of names. One community.{" "}
          <span className="bg-gradient-to-r from-[#B98CFF] via-[#9945FF] to-[#14F195] bg-clip-text text-transparent">Find yours.</span>
        </h1>
        <p className="mt-5 max-w-xl text-pretty text-base text-white/60 sm:text-lg">
          Search the community wall, discover your name, and capture your moment.
        </p>
        <div className="mt-9 flex w-full justify-center">
          <NameSearch {...props} />
        </div>
      </div>
    </section>
  );
}
