import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import dotenv from "dotenv";
import type { TestProject } from "vitest/node";

const require = createRequire(import.meta.url);

export default function setup(project: TestProject) {
  // Does not override variables already set in the shell; a missing file is
  // not an error.
  dotenv.config({ path: ".env.test.local" });

  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Put mysql://user:password@host:3306/amazon_test " +
        "in .env.test.local or in the shell before running npm run test:integration."
    );
  }

  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");
  if (!databaseName.endsWith("_test")) {
    throw new Error(
      `Refusing to reset "${databaseName}": the integration database name must end ` +
        "with _test, because prisma db push --force-reset drops every table in it."
    );
  }

  pushSchema(databaseUrl);
  project.provide("databaseUrl", databaseUrl);
}

function pushSchema(databaseUrl: string) {
  execFileSync(
    process.execPath,
    [
      require.resolve("prisma/build/index.js"),
      "db",
      "push",
      "--force-reset",
      "--accept-data-loss",
      "--skip-generate",
    ],
    { env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: "inherit" }
  );
}
