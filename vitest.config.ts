import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "node",
      clearMocks: true,
      unstubEnvs: true,
      unstubGlobals: true,
      projects: [
        {
          extends: true,
          test: {
            name: "unit",
            include: ["tests/unit/**/*.test.ts"],
          },
        },
        {
          extends: true,
          test: {
            name: "integration",
            include: ["tests/integration/**/*.test.ts"],
            globalSetup: ["tests/integration/globalSetup.ts"],
            setupFiles: ["tests/integration/setup.ts"],
            pool: "forks",
            poolOptions: { forks: { singleFork: true } },
            testTimeout: 30_000,
            hookTimeout: 120_000,
          },
        },
      ],
      coverage: {
        provider: "v8",
        include: ["src/**/*.ts"],
        exclude: [
          "src/index.ts",
          "src/**/dtos/**",
          "src/**/interfaces/**",
          "src/**/types/**",
          "src/declarations.d.ts",
        ],
        reporter: ["text", "html"],
        thresholds: {
          lines: 100,
          functions: 100,
          statements: 100,
          branches: -4,
        },
      },
    },
  }),
);
