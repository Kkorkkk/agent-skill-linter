#!/usr/bin/env node
import { lstatSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const rules = [
  { id: "broad-filesystem", severity: "high", pattern: /full disk|entire filesystem|read all files|write anywhere/i, advice: "Constrain filesystem scope." },
  { id: "auto-approve", severity: "medium", pattern: /always approve|bypass permissions|do not ask|dontAsk|bypassPermissions/i, advice: "Require explicit approval for destructive or external actions." },
  { id: "hardcoded-secret", severity: "high", pattern: /(sk-[A-Za-z0-9_-]{20,}|xai-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,}|api[_-]?key\s*[:=]\s*['"][A-Za-z0-9_-]{16,})/i, advice: "Remove hardcoded secrets and rotate them if real." },
  { id: "secret-policy-missing", severity: "low", pattern: /\b(api key|token|password)\b/i, advice: "Mention secret storage and redaction when a skill handles credentials." },
  { id: "prompt-injection", severity: "medium", pattern: /ignore previous instructions|system prompt|developer message/i, advice: "Add prompt-injection boundaries and source trust rules." },
  { id: "destructive-command", severity: "high", pattern: /rm -rf|git reset --hard|drop database|delete all/i, advice: "Gate destructive actions behind explicit approval." },
  { id: "network-transmit", severity: "medium", pattern: /upload|send to|post to|webhook|external api/i, advice: "State what data leaves the machine and why." },
  { id: "private-data", severity: "medium", pattern: /contacts|photos|emails|calendar|location|medical|financial/i, advice: "Define privacy boundaries and user confirmation requirements." },
  { id: "credential-persistence", severity: "medium", pattern: /save password|store token|write credentials/i, advice: "Use secure storage and avoid plain-text persistence." },
  { id: "shell-execution", severity: "medium", pattern: /execSync|child_process|shell command|bash -c/i, advice: "Document command trust boundaries and quoting rules." },
  { id: "browser-control", severity: "low", pattern: /click|type into|browser automation|computer use/i, advice: "Clarify when UI actions need confirmation." },
  { id: "unbounded-scan", severity: "medium", pattern: /recursive scan|scan everything|all directories/i, advice: "Add depth, size, and ignore limits." },
  { id: "third-party-content", severity: "medium", pattern: /email link|message link|uploaded document|web page says/i, advice: "Treat third-party instructions as untrusted." },
  { id: "financial-action", severity: "high", pattern: /trade|send money|wire transfer|buy stock|sell stock/i, advice: "Do not execute financial transactions on behalf of the user." },
  { id: "medical-action", severity: "high", pattern: /diagnose|prescribe|patient record|medical care/i, advice: "Add high-stakes medical safety boundaries." }
];

export function lintText(text, file = "input") {
  const findings = [];
  const lines = text.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    for (const rule of rules) {
      const match = line.match(rule.pattern);
      if (match) {
        findings.push({ id: rule.id, severity: rule.severity, file, line: index + 1, excerpt: match[0], advice: rule.advice });
      }
    }
  }
  return findings;
}

function walk(target, options = {}, depth = 0, files = []) {
  const maxDepth = options.maxDepth ?? 8;
  const maxFiles = options.maxFiles ?? 500;
  const seen = options.seen ?? new Set();
  if (files.length >= maxFiles) return files;
  let stat;
  try {
    stat = lstatSync(target);
  } catch {
    return files;
  }
  if (stat.isSymbolicLink()) return files;
  if (stat.isFile()) return [target];
  if (depth >= maxDepth) return files;
  try {
    const real = realpathSync(target);
    if (seen.has(real)) return files;
    seen.add(real);
  } catch {
    return files;
  }
  let entries;
  try {
    entries = readdirSync(target, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (["node_modules", ".git", "dist", "coverage"].includes(entry.name)) continue;
    const full = path.join(target, entry.name);
    if (entry.isDirectory()) walk(full, { ...options, seen }, depth + 1, files);
    else if (/\.(md|txt|json|ya?ml|mjs|cjs|js|ts)$/i.test(entry.name)) files.push(full);
    if (files.length >= maxFiles) break;
  }
  return files;
}

export function scanPath(target) {
  try {
    statSync(target);
  } catch (error) {
    throw new Error(`Cannot scan ${target}: ${error.message}`);
  }
  return walk(target).flatMap((file) => {
    try {
      const stat = statSync(file);
      if (stat.size > 500_000) return [];
      return lintText(readFileSync(file, "utf8"), file);
    } catch {
      return [];
    }
  });
}

export function renderMarkdown(findings) {
  if (!findings.length) return "# Agent Skill Linter\n\nNo risky patterns found.\n";
  return ["# Agent Skill Linter", "", ...findings.map((finding) => `- **${finding.severity}** ${finding.id} ${finding.file}:${finding.line}: ${finding.advice} (matched "${finding.excerpt}")`)].join("\n") + "\n";
}

export function renderSarif(findings) {
  return JSON.stringify({
    version: "2.1.0",
    runs: [{
      tool: { driver: { name: "agent-skill-linter", rules: rules.map((rule) => ({ id: rule.id, shortDescription: { text: rule.advice } })) } },
      results: findings.map((finding) => ({
        ruleId: finding.id,
        level: finding.severity === "high" ? "error" : finding.severity === "medium" ? "warning" : "note",
        message: { text: finding.advice },
        locations: [{ physicalLocation: { artifactLocation: { uri: finding.file }, region: { startLine: finding.line } } }]
      }))
    }]
  }, null, 2);
}

export function parseCliArgs(args) {
  const file = args.find((arg) => !arg.startsWith("--"));
  if (!file) throw new Error("Usage: agent-skill-linter file-or-directory [--json] [--sarif]");
  return { file, json: args.includes("--json"), sarif: args.includes("--sarif") };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { file, json, sarif } = parseCliArgs(process.argv.slice(2));
    const findings = scanPath(file);
    console.log(sarif ? renderSarif(findings) : json ? JSON.stringify(findings, null, 2) : renderMarkdown(findings));
    process.exit(findings.some((finding) => finding.severity === "high") ? 2 : 0);
  } catch (error) {
    console.error(`agent-skill-linter: ${error.message}`);
    process.exit(2);
  }
}
