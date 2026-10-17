import type { Metadata } from "next";
import { FinderApp } from "@/components/finder-app";

export const metadata: Metadata = { title: "Find your name | Community Name Finder" };

export default function FindPage() {
  return <FinderApp />;
}
