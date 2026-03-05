import path from "node:path";
import type { NextConfig } from "next";

/** Native/Node-only packages that must not be bundled by webpack. */
const DB_EXTERNALS =
  /^(@libsql\/|libsql|better-sqlite3|bun:sqlite|drizzle-orm\/libsql|drizzle-orm\/bun-sqlite|drizzle-orm\/better-sqlite3)/;

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: [
    "@uberskills/ui",
    "@uberskills/db",
    "@uberskills/skill-engine",
    "@uberskills/types",
  ],
  serverExternalPackages: [
    "@libsql/client",
    "@libsql/hrana-client",
    "better-sqlite3",
    "libsql",
    "archiver",
  ],
  // biome-ignore lint/suspicious/noExplicitAny: webpack config types not available
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    if (isServer) {
      // Bun's node_modules layout (node_modules/.bun/<pkg>@<ver>/) prevents
      // Next.js serverExternalPackages from matching native database packages.
      // This custom externals function catches them regardless of resolution path.
      const prev = config.externals;
      config.externals = [
        ...(Array.isArray(prev) ? prev : prev ? [prev] : []),
        // biome-ignore lint/suspicious/noExplicitAny: webpack externals callback API
        (ctx: any, cb: any) => {
          if (ctx.request && DB_EXTERNALS.test(ctx.request)) {
            return cb(null, `commonjs ${ctx.request}`);
          }
          cb();
        },
      ];
    }
    return config;
  },
};

export default nextConfig;
