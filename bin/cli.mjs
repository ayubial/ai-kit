#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);

const opts = {
  target: "all", // claude | antigravity | all
  dir: ".",
  figmaKey: "",
  runMcp: false,
  runAgents: true,
  force: false,
  dryRun: false,
};

function printHelp() {
  console.log(`
ai-kit — Team AI Workflow & MCP Setup (Claude Code + Antigravity CLI)

Usage:
  npx github:ayubial/ai-kit [options]

Options:
  --target <claude|antigravity|all>  Assistant to configure (default: all)
  --dir <path>                       Target project directory (default: .)
  --figma-key <key>                  Figma token (enables Playwright + Figma MCP)
  --mcp                              Also configure MCP servers (Playwright, + Figma if key given)
  --mcp-only                         Only configure MCP servers (skip project files)
  --agents-only                      Only install project agents/skills (skip MCP)
  --force                            Overwrite existing files and replace MCP servers
  --dry-run                          Preview changes without writing files
  -h, --help                         Show this help message

Examples:
  # Install project agents + skills in current repo
  npx github:ayubial/ai-kit

  # Full setup (user-global MCP + project-local agents/skills)
  npx github:ayubial/ai-kit --figma-key YOUR_FIGMA_KEY

  # Preview what will be installed
  npx github:ayubial/ai-kit --dry-run
`);
}

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "-h" || a === "--help") {
    printHelp();
    process.exit(0);
  } else if (a === "--target") {
    opts.target = args[++i] ?? "";
  } else if (a === "--dir") {
    opts.dir = args[++i] ?? "";
  } else if (a === "--figma-key") {
    opts.figmaKey = args[++i] ?? "";
    opts.runMcp = true;
  } else if (a === "--mcp") {
    opts.runMcp = true;
  } else if (a === "--mcp-only") {
    opts.runMcp = true;
    opts.runAgents = false;
  } else if (a === "--agents-only") {
    opts.runMcp = false;
    opts.runAgents = true;
  } else if (a === "--force") {
    opts.force = true;
  } else if (a === "--dry-run") {
    opts.dryRun = true;
  } else {
    console.error(`Unknown option: ${a}`);
    printHelp();
    process.exit(1);
  }
}

if (!["claude", "antigravity", "all"].includes(opts.target)) {
  console.error(`Invalid --target "${opts.target}". Use claude, antigravity, or all.`);
  process.exit(1);
}

const projectDir = path.resolve(opts.dir);
if (opts.runAgents && !fs.existsSync(projectDir)) {
  console.error(`Error: target directory does not exist: ${projectDir}`);
  process.exit(1);
}

function writeTemplate(relPath, content) {
  const dest = path.join(projectDir, relPath);
  const exists = fs.existsSync(dest);
  if (exists && !opts.force) {
    console.log(`Skipped (exists): ${relPath}`);
    return;
  }
  if (opts.dryRun) {
    console.log(`[dry-run] Would ${exists ? "overwrite" : "create"}: ${relPath}`);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content.trimStart(), "utf8");
  console.log(`${exists ? "Updated" : "Installed"}: ${relPath}`);
}

function commandExists(cmd) {
  try {
    execFileSync(process.platform === "win32" ? "where" : "which", [cmd], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function setupMcpClaude() {
  if (!commandExists("claude")) {
    console.log("Claude Code CLI ('claude') not found — skipping Claude MCP.");
    return;
  }
  const addServer = (name, cmdArgs) => {
    let exists = false;
    try {
      execFileSync("claude", ["mcp", "get", name], { stdio: "ignore" });
      exists = true;
    } catch {}
    if (exists && !opts.force) {
      console.log(`Claude MCP: ${name} already installed, skipped`);
      return;
    }
    if (opts.dryRun) {
      console.log(`[dry-run] Would configure Claude MCP: ${name}`);
      return;
    }
    try {
      execFileSync("claude", ["mcp", "remove", "-s", "user", name], { stdio: "ignore" });
    } catch {}
    execFileSync("claude", ["mcp", "add", "-s", "user", name, "--", ...cmdArgs], { stdio: "inherit" });
  };

  addServer("playwright", ["npx", "-y", "@playwright/mcp@latest"]);
  if (opts.figmaKey) {
    addServer("figma-free-context", [
      "npx",
      "-y",
      "figma-developer-mcp",
      `--figma-api-key=${opts.figmaKey}`,
      "--stdio",
    ]);
  } else {
    console.log("Claude MCP: figma-free-context skipped (pass --figma-key to enable)");
  }
}

function setupMcpAntigravity() {
  const cfgPath = path.join(os.homedir(), ".gemini", "config", "mcp_config.json");
  const data = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, "utf8")) : {};
  data.mcpServers = data.mcpServers || {};

  const want = {
    playwright: {
      command: "npx",
      args: ["-y", "@playwright/mcp@latest"],
      disabled: false,
    },
  };
  if (opts.figmaKey) {
    want["figma-free-context"] = {
      command: "npx",
      args: ["-y", "figma-developer-mcp", `--figma-api-key=${opts.figmaKey}`, "--stdio"],
    };
  } else {
    console.log("Antigravity MCP: figma-free-context skipped (pass --figma-key to enable)");
  }

  for (const [name, conf] of Object.entries(want)) {
    if (name in data.mcpServers && !opts.force) {
      console.log(`Antigravity MCP: ${name} already installed, skipped`);
    } else if (opts.dryRun) {
      console.log(`[dry-run] Would configure Antigravity MCP: ${name}`);
    } else {
      data.mcpServers[name] = conf;
      console.log(`Antigravity MCP: configured ${name}`);
    }
  }

  if (!opts.dryRun) {
    fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
    fs.writeFileSync(cfgPath, JSON.stringify(data, null, 2), "utf8");
    if (process.platform !== "win32") fs.chmodSync(cfgPath, 0o600);
    console.log(`Antigravity MCP saved: ${cfgPath}`);
  }
}

// ============================================================================
// Shared Prompt Bodies (Project-Agnostic + Matt Pocock Workflow Improvements)
// ============================================================================

const ARCHITECT_BODY = `
# Agent System Instructions

You are the Lead Software Architect. Your role is to align on requirements, design vertical-slice implementation contracts matching the repository's conventions, delegate implementation to \`coder\` and E2E verification to \`tester\`, and verify the result.

## Core Directives

1. **Mandatory Project Discovery:** Before planning, inspect repository guidelines (\`AGENTS.md\`, \`CLAUDE.md\`, \`README.md\`) and manifests (\`package.json\`, \`tsconfig.json\`, \`pyproject.toml\`, etc.). If a spec file exists (e.g. \`.agents/specs/<feature>.md\`), read it first.
2. **Vertical Slicing (Stay in the Smart Zone):** For medium/large features, break work into small, independent vertical slices (UI + state/API + verification per slice) rather than one giant pass.
3. **No Direct Code Editing:** Do not edit application files directly. Write specs/contracts and delegate. Use terminal commands only for read-only discovery (\`rg\`, \`git diff\`, \`git status\`) and verification (type-check, lint, test, build).
4. **Draft the Implementation Contract:** When delegating to \`coder\`, specify:
   - Exact file paths to create or modify.
   - Public interfaces, types/schemas, state/API boundaries, and edge-case behavior.
   - Project conventions and backward-compatibility rules from \`AGENTS.md\` / \`CLAUDE.md\`.
   - Exact verification commands to run before finishing.
5. **Delegation:**
   - Delegate implementation to \`coder\` with the complete contract. Reuse the same \`coder\` via messaging for follow-up fixes instead of spawning a new one.
   - Delegate E2E/browser verification to \`tester\` when requested or when UI flows change. If running \`coder\` and \`tester\` in parallel, specify deterministic mock data, \`data-testid\` selectors, route, and port.
6. **Verification:** Once \`coder\` finishes:
   - Inspect \`git diff\` against your contract (scope, conventions, backward compatibility, shared consumers).
   - Run the project's verification commands and confirm zero errors.
   - If verification or \`tester\` fails, send the exact failure output back to \`coder\` and re-verify (maximum 2 fix cycles).
7. **Final Report:** Summarize the plan, files changed (with clickable paths), and observed verification results.
`;

const CODER_BODY = `
# Agent System Instructions

You are a precision Software Engineer. Implement features, refactors, state logic, and API integrations strictly matching the architect's contract and the repository's conventions.

## Core Directives

1. **Source of Truth:** Inspect \`AGENTS.md\`, \`CLAUDE.md\`, and nearby files before writing code so changes match local tech stack, architecture, naming, and style conventions.
2. **Respect Boundaries:** Follow the architect's contract and existing module/package boundaries. Do not invent unrequested abstractions or add unapproved dependencies.
3. **Scope Control:** Modify only the files required by the contract. Keep changes clean and free of placeholders.
4. **Mandatory Verification:** Run the verification commands specified by the architect (type-check, lint, unit tests) before concluding.

## Output Format (Strict — Save Context Tokens)

Do NOT echo full file contents or raw code blocks back to the architect (the architect inspects \`git diff\` directly).
Reply ONLY with:
- **Changed files:** bullet list of exact file paths created/modified.
- **Verification:** exact command(s) run and PASS/FAIL status.
- **Failures (if any):** raw error output only if a check still fails.
`;

const TESTER_BODY = `
# Agent System Instructions

You are the Lead Automation Tester. Write and execute deterministic Playwright E2E tests from specifications while keeping execution fast and token usage minimal.

## Core Directives

1. **Strict Scope & Token Budget (No Scavenger Hunts):**
   - Inspect **only** the target files explicitly listed in the prompt (at most 2–4 file reads), plus \`playwright.config.*\` if needed for \`testDir\` and \`baseURL\`.
   - **NEVER** scan the filesystem (\`find /\`, \`ls ~/.npm\`, \`grep\` across \`node_modules\`), inspect \`.env*\` secrets, or read unrelated files.
   - Write the \`.spec.ts\` file immediately after reading the target files.
2. **Target Isolation:** Only create/update test files in the path specified by the architect or user.
3. **Auth & Network State:** Reuse the project's auth storage state when applicable, or mock network/auth responses deterministically using \`page.route(...)\`.
4. **Deterministic Tests:** Prefer \`data-testid\`, accessible roles, and \`id\`. Avoid arbitrary \`waitForTimeout\` or soft assertions.
5. **Fast Execution Routine:**
   - Always pass \`--no-install\` (\`npx --no-install playwright test <file> --reporter=list\`).
   - Check once if \`localhost:<port>\` is listening (\`ss -tln | grep :<port>\` or equivalent) before running browser tests.
   - **If dev server is NOT running:** Do NOT run builds or start servers. Validate the spec syntax and report the exact command the user can run once the server is up.
   - **Maximum 2 execution attempts** per task (1 fix-and-rerun cycle). After the 2nd run, stop and report the exact failure output.
   - **Stop immediately on environment failures:** auth 400/429, connection refused, missing browser binary, missing env var, or blank/crashed page.
   - **Never log secrets:** Log status codes and cookie names only.
`;

const GRILL_ME_BODY = `
# Grill-Me: Pre-Coding Alignment & Vertical-Slice Spec

Do NOT write application code yet. Your job is to interview the user relentlessly until every requirement, edge case, API contract, and UI state is crystal clear, then save a concise vertical-slice spec.

## Process

1. Read \`AGENTS.md\` / \`CLAUDE.md\` and inspect the target area briefly to understand existing patterns.
2. Ask focused questions (in batches of 3–5, numbered) covering:
   - Exact user flow and acceptance criteria
   - Edge cases (empty, loading, error, unauthorized, mobile vs desktop)
   - Data/API contract and shared-module impact
   - Verification expectations (type-check, E2E route/port)
3. Once all unknowns are resolved, write a short Markdown spec to \`.agents/specs/<kebab-feature-name>.md\` containing:
   - Goal & non-goals
   - Vertical slices (each slice = smallest end-to-end testable increment)
   - Exact acceptance criteria per slice
4. Tell the user the spec path and suggest running \`architect\` on Slice 1.
`;

const RETRO_BODY = `
# Retro: Compounding Team Knowledge

Review the current session's changes (\`git diff\`, \`git status\`) and any bugs, misunderstandings, or verification failures that happened along the way.

## Process

1. Identify 1–3 concrete, repeatable lessons (e.g., a missing repo rule, a tricky mock pattern, a boundary that was violated).
2. Propose exact, minimal edits to \`AGENTS.md\` or \`docs/agents/*.md\` (not generic advice — only repo-specific facts that prevent future mistakes).
3. Ask the user for confirmation before applying the doc update.
`;

// ============================================================================
// Installers
// ============================================================================

function installAntigravityAgents() {
  const base = ".agents";
  writeTemplate(`${base}/agents/architect/agent.md`, `---
name: architect
description: High-level system architect. Inspects repo guidelines, designs vertical-slice contracts, delegates coding to coder and E2E to tester, and verifies via git diff and checks.
model: gemini-4-hydrogen-high
tools:
  - send_message
  - read_file
  - run_command
  - invoke_subagent
---
${ARCHITECT_BODY}`);

  writeTemplate(`${base}/agents/coder/agent.md`, `---
name: coder
description: Precision implementation engineer. Implements architect contracts matching repo conventions and returns a compact file + verification summary.
model: gemini-4-hydrogen-low
subagent: true
tools:
  - send_message
  - read_file
  - write_file
  - edit_file
  - run_command
---
${CODER_BODY}`);

  writeTemplate(`${base}/agents/tester/agent.md`, `---
name: tester
description: Specialized E2E tester. Writes and runs deterministic Playwright specs with strict token/retry budgets.
model: gemini-4-hydrogen-low
subagent: true
tools:
  - read_file
  - write_file
  - edit_file
  - run_command
  - send_message
---
${TESTER_BODY}`);

  writeTemplate(`${base}/skills/grill-me/SKILL.md`, `---
name: grill-me
description: Interview the developer before coding to resolve edge cases and produce a vertical-slice spec in .agents/specs/.
---
${GRILL_ME_BODY}`);

  writeTemplate(`${base}/skills/architect-workflow/SKILL.md`, `---
name: architect-workflow
description: Run the architect workflow (inspect repo guidelines -> delegate vertical slice to coder -> verify git diff & checks -> optional tester E2E).
---
Follow \`.agents/agents/architect/agent.md\` as your instructions for this task.
`);

  writeTemplate(`${base}/skills/retro/SKILL.md`, `---
name: retro
description: Run a quick post-task retrospective and update AGENTS.md or docs/agents/ with repeatable lessons.
---
${RETRO_BODY}`);
}

function installClaudeAgents() {
  const base = ".claude";
  writeTemplate(`${base}/agents/architect.md`, `---
name: architect
description: High-level system architect. Inspects repo guidelines, designs vertical-slice contracts, delegates coding to coder and E2E to tester, and verifies via git diff and checks.
model: sonnet
effort: high
tools: Read, Bash, Agent(coder, tester), SendMessage
---
${ARCHITECT_BODY}`);

  writeTemplate(`${base}/agents/coder.md`, `---
name: coder
description: Precision implementation engineer. Implements architect contracts matching repo conventions and returns a compact file + verification summary.
model: sonnet
effort: low
tools: Read, Write, Edit, Bash
---
${CODER_BODY}`);

  writeTemplate(`${base}/agents/tester.md`, `---
name: tester
description: Specialized E2E tester. Writes and runs deterministic Playwright specs with strict token/retry budgets.
model: sonnet
effort: low
tools: Read, Write, Edit, Bash
---
${TESTER_BODY}`);

  writeTemplate(`${base}/commands/grill-me.md`, `---
description: Interview me on requirements and edge cases before coding, then write a vertical-slice spec
argument-hint: <feature idea or path to TSD>
model: opus
effort: medium
---
${GRILL_ME_BODY}

Topic:
$ARGUMENTS`);

  writeTemplate(`${base}/commands/architect.md`, `---
description: Run the architect workflow (plan -> delegate to coder -> verify) in the main session
argument-hint: <task description or path to .agents/specs/<file>.md>
model: opus
effort: medium
---
Follow \`.claude/agents/architect.md\` as your instructions for this task (read it first). Do not edit application files yourself — delegate implementation to \`coder\` (and \`tester\` when requested) and verify via \`git diff\` and project checks.

Task:
$ARGUMENTS`);

  writeTemplate(`${base}/commands/retro.md`, `---
description: Capture repeatable lessons from this task into AGENTS.md or docs/agents/
model: sonnet
effort: low
---
${RETRO_BODY}`);
}

// ============================================================================
// Execute
// ============================================================================

if (opts.runMcp) {
  if (opts.target === "claude" || opts.target === "all") setupMcpClaude();
  if (opts.target === "antigravity" || opts.target === "all") setupMcpAntigravity();
}

if (opts.runAgents) {
  if (opts.target === "antigravity" || opts.target === "all") installAntigravityAgents();
  if (opts.target === "claude" || opts.target === "all") installClaudeAgents();
}

console.log("\nDone.");
if (opts.runMcp && !opts.dryRun) {
  console.log("Restart your AI assistant, then verify MCP with: claude mcp list (Claude) or /mcp (Antigravity).");
}
