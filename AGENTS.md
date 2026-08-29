<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Florus Project Standing Rules

## Documentation Standards

1. **Fixed documentation set**: Only README.md, ARCHITECTURE.md, TROUBLESHOOTING.md, and PROGRESS.md are allowed. Do NOT create standalone report files (CHECKPOINT_X_REPORT.md, VERIFICATION.md, SUMMARY.md, etc.). Fold all completion reports and test results into PROGRESS.md as concise bullet summaries.

2. **PROGRESS.md format**: Brief bullets covering what was built, key decisions, files created/modified, and test results. No full file dumps, no reproduced SQL blocks longer than a few lines, no verbose step-by-step narratives.

## Script Hygiene

3. **One-off scripts are throwaway**: Verification and test scripts (test-*.ts, verify-*.ts, cleanup-*.ts) must be deleted once their output has been reported. Only keep genuinely reusable operational tooling in scripts/ (seed-admin.ts, reset-test-data.ts, etc.).
