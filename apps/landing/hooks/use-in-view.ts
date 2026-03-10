"use client";

import { useEffect, useRef, useState } from "react";

export function useInView(options?: IntersectionObserverInit & { umamiEvent?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  const umamiEvent = options?.umamiEvent;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setInView(true);
        if (umamiEvent) {
          window.umami?.track(umamiEvent);
        }
        observer.disconnect();
      }
    }, options);

    observer.observe(el);
    return () => observer.disconnect();
  }, [options, umamiEvent]);

  return { ref, inView };
}
