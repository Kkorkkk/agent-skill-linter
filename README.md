# Agent Skill Linter

[![CI](https://github.com/Kkorkkk/agent-skill-linter/actions/workflows/ci.yml/badge.svg)](https://github.com/Kkorkkk/agent-skill-linter/actions/workflows/ci.yml)

Scan agent skills, prompts, and tool specs for risky permissions or vague instructions.

## Install

```bash
npx agent-skill-linter examples/skill.md
npm install -g agent-skill-linter
agent-skill-linter examples/skill.md
```

## Quick start

```bash
npm install
npm test
node src/index.js examples/skill.md
node src/index.js examples/skill.md --json
node src/index.js . --sarif > skill-lint.sarif
```

## What it checks

The linter scans files or directories for broad filesystem access, auto-approval language, destructive commands, hardcoded-looking secrets, prompt-injection gaps, sensitive-data transmission, financial/medical actions, shell execution, and other agent safety smells.

It scans prompt/config files plus JavaScript and TypeScript sources, while skipping common build folders and limiting recursion/file size to avoid runaway scans.

Unreadable files are skipped and missing targets produce a clear CLI error instead of a raw filesystem stack trace.

## Limits

This is a static policy linter. It catches suspicious wording and obvious secret shapes; it does not prove a skill is safe.

## Status

Experimental 0.1 CLI. The tool is small on purpose, with no runtime dependencies. Review generated commands, code, and reports before using them in production workflows.
