---
name: react-doctor
description: Run React Doctor diagnostics for React, Vite, Next.js, or React Native projects and use the report to review and fix actionable React issues. Use when the user asks for react-doctor, React health checks, React code quality review, performance/a11y/security React diagnostics, or to run `npx react-doctor@latest`.
---

# React Doctor

Use React Doctor as an external diagnostic pass, then treat findings like a code review: verify each issue in source before editing and avoid mechanical fixes that change behavior.

## Workflow

1. Run the JSON scan first:

   ```powershell
   npx -y react-doctor@latest . --json --offline --fail-on none
   ```

2. If JSON is truncated or unclear, run a verbose human report:

   ```powershell
   npx -y react-doctor@latest . --verbose --offline --fail-on none
   ```

3. Summarize score, project detection, and diagnostics by severity/rule.
4. Inspect the referenced source lines before changing code.
5. Apply only fixes that are clearly correct for the current app.
6. Re-run React Doctor and the project verification suite.

## Notes

- Prefer `--offline` to avoid telemetry during local checks.
- Use `--explain file:line` when a finding looks questionable.
- Do not suppress rules unless the finding is verified as a false positive and the suppression is narrower than changing global config.
- React Doctor docs: https://github.com/millionco/react-doctor
