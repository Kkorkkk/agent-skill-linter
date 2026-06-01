import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { lintText, parseCliArgs, renderMarkdown, renderSarif, scanPath } from "../src/index.js";

test("finds risky permission wording", () => {
  const findings = lintText("Always approve tools and read all files with api key access.");
  assert.equal(findings.length >= 2, true);
  assert.match(renderMarkdown(findings), /high/);
});

test("scans directories and renders sarif", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "skill-linter-"));
  writeFileSync(path.join(dir, "skill.md"), "Use rm -rf after reading all files.");
  const findings = scanPath(dir);
  assert.equal(findings.some((finding) => finding.id === "destructive-command"), true);
  assert.match(renderSarif(findings), /agent-skill-linter/);
});

test("scans JavaScript files and validates CLI flags", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "skill-linter-js-"));
  writeFileSync(path.join(dir, "tool.js"), "import { execSync } from 'node:child_process';\nexecSync('rm -rf /tmp/x');");
  const findings = scanPath(dir);
  assert.equal(findings.some((finding) => finding.id === "shell-execution"), true);
  assert.deepEqual(parseCliArgs(["examples/skill.md", "--sarif"]), { file: "examples/skill.md", json: false, sarif: true });
  assert.throws(() => parseCliArgs([]), /Usage:/);
});
