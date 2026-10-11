// Fails when an agent doc is over its size budget. Run from the repository root.
// Budgets: SERP's Docs Are Maps standard (serpcompany/serp,
// docs/engineering/standards/agent-harness/docs-are-maps.md). Copied verbatim into each
// repository's .github/scripts/ by the serp-agent-docs skill; per-repository allowances live in
// .github/agent-docs-allowances.json.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";

const WRAP_WIDTH = 100;
const MAP_BUDGET = 120;
const LEAF_BUDGET = 300;
const MAP_NAMES = ["README.md", "AGENTS.md", "CLAUDE.md"];
const ALLOWANCES_FILE = ".github/agent-docs-allowances.json";

// Docs already over budget when the check was added. Each may shrink, but never grow.
const ALLOWANCES = existsSync(ALLOWANCES_FILE) ? JSON.parse(readFileSync(ALLOWANCES_FILE, "utf8")) : {};

const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "--",
    ":(glob)**/AGENTS.md", ":(glob)**/CLAUDE.md", "README.md", ":(glob)docs/**/*.md"],
  { encoding: "utf8" },
)
  .split("\n")
  .filter((path, index, all) => path && existsSync(path) && all.indexOf(path) === index);

const wrappedLines = (text) =>
  text
    .replace(/\r?\n$/, "")
    .split(/\r?\n/)
    .reduce((sum, line) => sum + Math.max(1, Math.ceil([...line].length / WRAP_WIDTH)), 0);

const failures = [];
const notices = [];
// On a PR, a doc that shrank must lower its allowance so it can't grow back; elsewhere it's a notice.
const strict = process.env.GITHUB_EVENT_NAME === "pull_request";

for (const path of files) {
  const size = wrappedLines(readFileSync(path, "utf8"));
  const budget = MAP_NAMES.includes(basename(path)) ? MAP_BUDGET : LEAF_BUDGET;
  const allowance = ALLOWANCES[path];

  if (allowance === undefined) {
    if (size > budget) {
      failures.push(`${path}: ${size} lines, budget ${budget}. Split it by topic into leaves linked from a map.`);
    }
  } else if (size <= budget) {
    failures.push(`${path}: ${size} lines now fits its budget of ${budget}. Delete its allowance in ${ALLOWANCES_FILE}.`);
  } else if (size > allowance) {
    failures.push(`${path}: ${size} lines, allowance ${allowance}. It may shrink but not grow; split it by topic.`);
  } else if (size < allowance) {
    (strict ? failures : notices).push(`${path}: ${size} lines, allowance ${allowance}. Lower it to ${size} in ${ALLOWANCES_FILE}.`);
  }
}

for (const path of Object.keys(ALLOWANCES)) {
  if (!files.includes(path)) failures.push(`${path}: has an allowance but no longer exists. Delete it from ${ALLOWANCES_FILE}.`);
}

notices.forEach((notice) => console.log(notice));

if (failures.length > 0) {
  failures.forEach((failure) => console.error(failure));
  console.error(
    `\nSizes are lines wrapped at ${WRAP_WIDTH} characters. Maps (AGENTS.md, CLAUDE.md, README.md) get ${MAP_BUDGET}, ` +
      `other docs ${LEAF_BUDGET}: https://github.com/serpcompany/serp/blob/main/docs/engineering/standards/agent-harness/docs-are-maps.md`,
  );
  process.exit(1);
}

console.log(`${files.length} agent docs within budget.`);
