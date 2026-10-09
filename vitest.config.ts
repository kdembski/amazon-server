import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "node",
      include: ["tests/unit/**/*.test.ts"],
      clearMocks: true,
      unstubEnvs: true,
      unstubGlobals: true,
      coverage: {
        provider: "v8",
        include: ["src/**/*.ts"],
        exclude: [
          "src/index.ts",
          "src/dtos/**",
          "src/interfaces/**",
          "src/types/**",
          "src/declarations.d.ts",
        ],
        reporter: ["text", "html"],
      },
    },
  })
);
