import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

const BANNER = `
  _   _ _               ____  _    _ _ _
 | | | | |__   ___ _ __/ ___|| | _(_) | |___
 | | | | '_ \\ / _ \\ '__\\___ \\| |/ / | | / __|
 | |_| | |_) |  __/ |   ___) |   <| | | \\__ \\
  \\___/|_.__/ \\___|_|  |____/|_|\\_\\_|_|_|___/

  made with \u2764\uFE0F  by Helder Vasconcelos
`;

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: ["apiKey", "openrouterApiKey", "authorization"],
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            singleLine: true,
            translateTime: "HH:MM:ss.l",
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
});

console.log(BANNER);

export function routeLogger(method: string, path: string): pino.Logger {
  return logger.child({ route: `${method} ${path}` });
}

export default logger;
