"use client";

import { useInView } from "@/hooks/use-in-view";

export function SectionTracker({ event }: { event: string }) {
  const { ref } = useInView({ threshold: 0.1, umamiEvent: event });
  return <div ref={ref} className="absolute inset-0 pointer-events-none" aria-hidden="true" />;
}
