# Agent Skill Linter

Scan agent skills, prompts, and tool specs for risky permissions or vague instructions.

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

## Limits

This is a static policy linter. It catches suspicious wording and obvious secret shapes; it does not prove a skill is safe.
