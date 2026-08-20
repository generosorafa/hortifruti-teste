import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { preview } from "vite";

const server = await preview({
  configLoader: "runner",
  logLevel: "warn",
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
});

const playwrightCli = fileURLToPath(new URL("../node_modules/@playwright/test/cli.js", import.meta.url));
const tests = spawn(process.execPath, [playwrightCli, "test"], {
  env: process.env,
  stdio: "inherit",
});

const exitCode = await new Promise((resolve, reject) => {
  tests.once("error", reject);
  tests.once("exit", (code) => resolve(code ?? 1));
});

server.httpServer.closeAllConnections?.();
await new Promise((resolve) => server.httpServer.close(resolve));
process.exitCode = exitCode;
