import type { Metadata } from "next";
import { DemoGuide } from "@/components/demo-guide";

export const metadata: Metadata = { title: "Try the demo" };

export default function Page() {
  return <DemoGuide />;
}
