// Usage: node to-sql.js <rules.txt> > replace-rules.sql
// Prints one transaction that replaces the whole SearchRule table.
import fs from "node:fs";
const rules = fs.readFileSync(process.argv[2], "utf8").split("\n").map((r) => r.trim()).filter(Boolean);
const values = rules.map((r) => `('${r.replace(/'/g, "''")}', NOW(2))`).join(",\n");

process.stdout.write(
  "SET NAMES utf8mb4;\nSTART TRANSACTION;\n\nDELETE FROM `SearchRule`;\n\n" +
    "INSERT INTO `SearchRule` (`value`, `createdAt`) VALUES\n" +
    values +
    ";\n\nCOMMIT;\n"
);
