import test from "node:test";
import assert from "node:assert/strict";
import { lintText, renderMarkdown } from "../src/index.js";

test("finds risky permission wording", () => {
  const findings = lintText("Always approve tools and read all files with api key access.");
  assert.equal(findings.length >= 2, true);
  assert.match(renderMarkdown(findings), /high/);
});
