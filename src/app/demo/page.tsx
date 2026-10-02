import type { Metadata } from "next";
import { DemoResale } from "@/components/demo-resale";

export const metadata: Metadata = { title: "Try the demo" };

export default function Page() {
  return <DemoResale />;
}
