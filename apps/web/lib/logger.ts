import pino from "pino";

const BANNER = `
▄▄ ▄▄ ▄▄▄▄  ▄▄▄▄▄ ▄▄▄▄  ▄█████ ██ ▄█▀ ██ ██     ██     ▄█████
██ ██ ██▄██ ██▄▄  ██▄█▄ ▀▀▀▄▄▄ ████   ██ ██     ██     ▀▀▀▄▄▄
▀███▀ ██▄█▀ ██▄▄▄ ██ ██ █████▀ ██ ▀█▄ ██ ██████ ██████ █████▀

  made with \u2764\uFE0F  by Helder Vasconcelos
`;

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: ["apiKey", "openrouterApiKey", "authorization"],
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      singleLine: true,
      translateTime: "HH:MM:ss.l",
      ignore: "pid,hostname",
    },
  },
});

const globalForBanner = globalThis as unknown as { __uberskillsBannerShown?: boolean };
if (!globalForBanner.__uberskillsBannerShown) {
  globalForBanner.__uberskillsBannerShown = true;
  console.log(BANNER);
}

export function routeLogger(method: string, path: string): pino.Logger {
  return logger.child({ route: `${method} ${path}` });
}

export default logger;
