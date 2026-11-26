# Team AI Coding Setup & Workflow Guide (Claude Code, Antigravity, Codex, Copilot, OpenCode)

Welcome! This guide sets up your AI coding assistant so it writes code that actually matches our codebase, tests its own work, and doesn't waste time guessing.

### Supported Harnesses
- **Claude Code** (`.claude/agents/`, `.claude/commands/`, `.claude/skills/`)
- **Antigravity CLI** (`.agents/agents/`, `.agents/skills/`)
- **OpenAI Codex CLI** (`.codex/config.toml`, `.codex/agents/`, `.agents/skills/`)
- **GitHub Copilot** (`.github/agents/*.agent.md`, `.github/prompts/*.prompt.md`, `.github/skills/`)
- **OpenCode** (`.opencode/agents/`, `.opencode/commands/`, `.opencode/skills/`)

### What You Get
1. **Browser, Design & Docs Tools (installed once / via skill):**
   - **Playwright (MCP):** Lets the AI open your running app in a real browser and run E2E tests.
   - **Figlens (Offline `.fig` Skill + optional MCP):** Lets the AI read saved local `.fig` files (`File > Save local copy`) directly via `@runkids/figlens` — no Figma account, Dev Mode seat, or API token required.
   - **Internal Atlassian (`internal-atlassian-mcp`):** Lets the AI read internal Confluence pages (requirements, TSDs, API contracts) using your Atlassian username/password (prompted during `--mcp` install, stored only in your local user MCP config).
2. **Your AI Team (installed inside each project repo):**
   - **Grill-Me (`/grill-me`):** Asks you clarifying questions *before* coding so the AI doesn't build the wrong thing.
   - **Architect (`architect`):** Reads the repo rules, plans small slices, and checks the final code.
   - **Coder (`coder`):** Writes the actual code (and unit/integration tests if requested) and runs the project's type-checks, lint, and tests.
   - **Tester (`tester`):** Writes and runs **Playwright E2E tests** (`.spec.ts`) for web/UI flows (optional for backend/CLI repos; for unit tests, delegate to `coder`).
   - **Retro (`/retro`):** Saves lessons learned so the AI doesn't repeat the same mistake twice.

> **Language support:** `grill-me`, `architect`, `coder`, and `retro` are **programming-language agnostic** — they inspect your repo's `AGENTS.md` / `CLAUDE.md` / `.github/copilot-instructions.md` and manifests (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, etc.) and run whatever test/check commands your project uses. Only `tester` (Playwright E2E) and the optional MCPs are web/UI-specific.

---

## Step 1: Check Prerequisites

Open your terminal and check you have **Node.js 20 or newer**:

```bash
node -v
```

*(If it's below `v20`, install Node 20+ via `nvm` or the Node.js website.)*

Make sure you also have at least one assistant installed:
- **Claude Code** (`claude --version`),
- **Antigravity CLI** (`agy --version`),
- **OpenAI Codex CLI** (`codex --version`),
- **GitHub Copilot** (`copilot --version` or VS Code Copilot), or
- **OpenCode** (`opencode --version`)

---

## Step 2: Run the Setup Command

Open your terminal, `cd` into your project folder, and run **one** of these commands:

### Option A: Full setup (First time on a new laptop)
Installs the Playwright, offline Figlens, and `internal-atlassian-mcp` MCPs globally + adds the AI team & skills to your current project. It will prompt you for your Atlassian/Confluence MCP URL, username, and password (password input is hidden; leave the URL blank to skip `internal-atlassian-mcp`):

```bash
npx github:ayubial/ai-kit --mcp
```

### Option B: Project setup only (Recommended if you already have MCPs or only want skills)
Installs the AI agents, commands, and skills (including the `figlens` CLI skill) into the current project:

```bash
npx github:ayubial/ai-kit
```

### Option C: Install for specific assistant(s)
By default, `ai-kit` sets up **all** supported assistants (`claude`, `antigravity`, `codex`, `copilot`, `opencode`). Use `--target` to pick one or a comma-separated list:

```bash
# Antigravity only (project agents + skills)
npx github:ayubial/ai-kit --target antigravity

# Claude Code only (with Playwright + Figlens MCP)
npx github:ayubial/ai-kit --target claude --mcp

# Codex CLI only (project agents + skills)
npx github:ayubial/ai-kit --target codex

# GitHub Copilot only (agents + prompts + skills)
npx github:ayubial/ai-kit --target copilot

# OpenCode only (agents + commands + skills)
npx github:ayubial/ai-kit --target opencode

# Multiple targets together
npx github:ayubial/ai-kit --target codex,copilot,opencode --mcp
```

### Want to preview first without changing anything?
```bash
npx github:ayubial/ai-kit --dry-run
```

### Want to update an existing project to the latest version?
Add `--force` to overwrite old agent files:
```bash
npx github:ayubial/ai-kit --force
```

---

## Step 3: Verify Everything Works

1. **Restart** your terminal / AI assistant in the project folder.
2. **Check MCP tools (if you ran `--mcp`):**
   - **Claude Code:** run `claude mcp list` → you should see `playwright`, `figlens`, and `internal-atlassian-mcp`.
   - **Antigravity:** type `/mcp` → you should see `playwright`, `figlens`, and `internal-atlassian-mcp`.
   - **Codex CLI:** run `codex mcp list` (or `/mcp` inside a session) → you should see `playwright`, `figlens`, and `internal-atlassian-mcp`.
   - **GitHub Copilot:** type `/mcp` in Copilot CLI (or check `~/.copilot/mcp-config.json`) → you should see `playwright`, `figlens`, and `internal-atlassian-mcp`.
   - **OpenCode:** run `opencode mcp list` (or check `~/.config/opencode/opencode.json`) → you should see `playwright`, `figlens`, and `internal-atlassian-mcp`.
3. **Check Agents:**
   - **Claude Code:** type `/architect` or `/grill-me` inside a session.
   - **Antigravity:** type `@architect`, `@coder`, `@tester`, or `/grill-me`.
   - **Codex CLI:** reference `@architect` / `@coder` / `@tester` or invoke skills (`$grill-me`, `$architect-workflow`, `$retro`).
   - **GitHub Copilot:** use `/agent` (or `@architect`, `@coder`, `@tester`) and `/grill-me` / `/architect` / `/retro`.
   - **OpenCode:** use `@architect` / `@coder` / `@tester` and `/grill-me` / `/architect` / `/retro`.

---

## Step 4: How to Use It (Daily Workflow)

> **Golden Rule:** Don't ask the AI to build a huge feature in one giant prompt. Follow the **4-Step Loop** below — it's faster and produces way fewer bugs.

### Step 4.1 — Clarify First (`grill-me` — Auto-Triggers or Manual)
Before writing any code, let the AI interview you so edge cases (loading states, errors, API shapes) are clear.

`grill-me` **auto-triggers** when you share a Confluence URL, API contract, `.fig` design file, or a feature request with unstated edge cases—or you can invoke it explicitly:

- **Claude Code / GitHub Copilot / OpenCode:** `/grill-me Add a "Cancel Order" button on the order detail page`
- **Antigravity:** Just paste your feature / Confluence / `.fig` (or say `Use the grill-me skill: ...`)
- **Codex CLI:** `$grill-me Add a "Cancel Order" button on the order detail page`

| Prompt type | Auto-triggers `grill-me`? | Example |
| :--- | :--- | :--- |
| **Confluence URL + `.fig` file** | **Yes** | `Implement this: https://.../wiki/... and .agents/designs/checkout.fig` |
| **`.fig` design file** | **Yes** | `Build the promo modal from .agents/designs/promo.fig in apps/web` |
| **New feature with open edge cases** | **Yes** | `Add a "Cancel Order" button on the order detail page` |
| **Existing spec file** | **No** (goes to `architect`) | `Implement Slice 1 from .agents/specs/cancel-order.md` |
| **Clear bug fix or small refactor** | **No** (goes to `architect`/`coder`) | `Fix null check on user.phone in src/utils/format.ts line 42` |

Answer the AI's questions. At the end, it will save a short plan in `.agents/specs/<feature>.md`.

> **Small or unambiguous task?** You can skip `/grill-me` and go straight to `architect` if the requirements are already crystal clear (e.g., a straightforward bug fix, refactor, or single small slice with no open design questions). Still use `/grill-me`—even on small tasks—when there are unstated edge cases (UI states, error handling, permissions, API shapes) or when starting from a `.fig` design or Confluence link.

---

### Step 4.2 — Build & Verify Slice by Slice (`architect` → `coder` → `tester`)
If your feature needs browser/E2E testing, **start your app's dev server first** (e.g. `npm run dev`) in another terminal tab. The `tester` agent will not start the server for you.

Then run:

- **Claude Code:**
  ```text
  /architect Implement Slice 1 from .agents/specs/<feature>.md.
  After coder finishes and checks pass, have tester write and run a Playwright test
  at <e2e-test-path> against http://localhost:<port>.
  ```

- **Antigravity:**
  ```text
  @architect implement Slice 1 from .agents/specs/<feature>.md following the repo guidelines.
  Delegate coding to @coder and Playwright E2E testing (port :<port>) to @tester.
  ```

- **Codex CLI:**
  ```text
  $architect-workflow Implement Slice 1 from .agents/specs/<feature>.md.
  Delegate coding to @coder and Playwright E2E testing (port :<port>) to @tester.
  ```

- **GitHub Copilot:**
  ```text
  /architect Implement Slice 1 from .agents/specs/<feature>.md.
  Delegate coding to @coder and Playwright E2E testing (port :<port>) to @tester.
  ```

- **OpenCode:**
  ```text
  /architect Implement Slice 1 from .agents/specs/<feature>.md.
  Delegate coding to @coder and Playwright E2E testing (port :<port>) to @tester.
  ```

**What happens behind the scenes:**
1. `architect` reads `AGENTS.md` / `CLAUDE.md` / `.github/copilot-instructions.md` and writes a strict contract.
2. `coder` edits the files, runs type-checks/lint, and reports back.
3. `architect` checks `git diff` to make sure nothing outside scope was touched.
4. `tester` writes and runs the Playwright test (up to 2 fix cycles if it fails).

---

### Step 4.3 — Start from Confluence & Offline Figma (`.fig`) (Optional)
1. In Figma, click **File → Save local copy...** and save the `.fig` file locally (e.g. `.agents/designs/feature.fig`, and add `*.fig` to `.gitignore` so large binary files aren't committed).
2. Pass your Confluence requirement/API contract URLs and `.fig` path directly in chat (`grill-me` auto-triggers on Confluence URLs / `.fig` files, or you can invoke `/grill-me` / `$grill-me` explicitly):
   ```text
   /grill-me
   Requirement: <Confluence URL>
   API Contract: <Confluence URL>
   Design: .agents/designs/feature.fig (Frame: <frame name or node-id>)
   Target: <target-path>
   ```
   The assistant will fetch the Confluence docs (if Confluence MCP is configured), inspect the `.fig` file offline via `figlens`, cross-check against the codebase, ask only about unresolved gaps, and save `.agents/specs/<feature>.md` for `architect`.

---

### Step 4.4 — Save Lessons Learned (`/retro`)
Did the AI make a silly mistake (like importing from the wrong folder or using an old helper)? Once your feature works, run:

- **Claude Code:** `/retro`
- **Antigravity:** `Run the retro skill on this session`
- **Codex CLI:** `$retro`
- **GitHub Copilot:** `/retro`
- **OpenCode:** `/retro`

It will propose a 1–2 line update to `AGENTS.md` (or `docs/agents/`) so **everyone on the team** benefits next time.

---

## Troubleshooting

| Problem | How to fix it |
| :--- | :--- |
| **`npx` asks to install or hangs** | Check you are on Node >= 20 (`node -v`) and connected to your office VPN/proxy if required. |
| **MCP tool shows "Failed"** | Restart your AI assistant completely. |
| **`figlens` can't find a frame or `.fig` file** | Verify the `.fig` path exists (exported via Figma **File → Save local copy...**) and run `npx @runkids/figlens tree <file.fig> --depth 2`. |
| **`tester` says "connection refused"** | You forgot to start your app's dev server (`npm run dev`) before running `tester`. |
| **Agents don't appear** | Make sure you opened your assistant inside the project root (the folder containing `.claude/`, `.agents/`, `.codex/`, `.github/`, or `.opencode/`). |
