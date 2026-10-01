import { EventPage } from "@/components/event-page";
export default async function Page({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  return <EventPage address={(await params).address} />;
}
