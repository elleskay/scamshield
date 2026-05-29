import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"],
    setupFiles: ["test/setup.ts"],
    // No globalSetup reset here: the repo-root `test:spec` orchestrator resets the
    // shared coverage file once, before running both the app (jest) and API
    // (vitest) suites. Resetting here would wipe the app's recorded results.
  },
  // NestJS DI needs emitDecoratorMetadata (design:paramtypes), which esbuild
  // (vitest's default transform) does not emit. SWC does.
  plugins: [swc.vite()],
});
