#!/usr/bin/env node
import { readFileSync } from "node:fs";

const rules = [
  { id: "broad-filesystem", severity: "high", pattern: /full disk|entire filesystem|read all files|write anywhere/i, advice: "Constrain filesystem scope." },
  { id: "auto-approve", severity: "medium", pattern: /always approve|bypass permissions|do not ask/i, advice: "Require explicit approval for destructive or external actions." },
  { id: "secret-handling", severity: "high", pattern: /api key|token|password/i, advice: "State how secrets are stored and redacted." },
  { id: "prompt-injection", severity: "medium", pattern: /ignore previous instructions|system prompt/i, advice: "Add injection handling boundaries." }
];

export function lintText(text) {
  return rules.flatMap((rule) => {
    const match = text.match(rule.pattern);
    return match ? [{ id: rule.id, severity: rule.severity, excerpt: match[0], advice: rule.advice }] : [];
  });
}

export function renderMarkdown(findings) {
  if (!findings.length) return "# Agent Skill Linter\n\nNo risky patterns found.\n";
  return ["# Agent Skill Linter", "", ...findings.map((finding) => `- **${finding.severity}** ${finding.id}: ${finding.advice} (matched "${finding.excerpt}")`)].join("\n") + "\n";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: agent-skill-linter file.md [--json]");
    process.exit(1);
  }
  const findings = lintText(readFileSync(file, "utf8"));
  console.log(process.argv.includes("--json") ? JSON.stringify(findings, null, 2) : renderMarkdown(findings));
  process.exit(findings.some((finding) => finding.severity === "high") ? 2 : 0);
}
