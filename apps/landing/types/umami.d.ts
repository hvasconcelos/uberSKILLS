interface UmamiTracker {
  track: (event: string, data?: Record<string, string | number>) => void;
}

interface Window {
  umami?: UmamiTracker;
}
