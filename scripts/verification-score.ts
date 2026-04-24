import { execSync } from "node:child_process";

type Check = {
  name: string;
  command: string;
  weight: number;
};

const checks: Check[] = [
  { name: "TypeScript", command: "npm run check", weight: 25 },
  { name: "Unit Tests", command: "npm run test:unit", weight: 30 },
  { name: "Build", command: "npm run build", weight: 20 },
  { name: "Smoke QA", command: "npm run qa:smoke", weight: 25 },
];

let score = 0;

for (const check of checks) {
  process.stdout.write(`\n[verify] ${check.name}...\n`);
  execSync(check.command, { stdio: "inherit" });
  score += check.weight;
}

process.stdout.write(`\nVerification score: ${score}/100\n`);
if (score < 98) {
  process.exitCode = 1;
}
