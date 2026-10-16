import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { MySqlContainer } from "@testcontainers/mysql";
import type { TestProject } from "vitest/node";

const require = createRequire(import.meta.url);

export default async function setup(project: TestProject) {
  const container = await new MySqlContainer("mysql:8")
    .withDatabase("amazon_test")
    .start();
  const databaseUrl = container.getConnectionUri(true);

  pushSchema(databaseUrl);
  project.provide("databaseUrl", databaseUrl);

  return async () => {
    await container.stop();
  };
}

function pushSchema(databaseUrl: string) {
  execFileSync(
    process.execPath,
    [
      require.resolve("prisma/build/index.js"),
      "db",
      "push",
      "--skip-generate",
    ],
    { env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: "inherit" }
  );
}
