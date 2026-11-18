# Team AI Coding Setup & Workflow Guide (Claude Code + Antigravity CLI)

Welcome! This guide sets up your AI coding assistant so it writes code that actually matches our codebase, tests its own work, and doesn't waste time guessing.

### What You Get
1. **Browser & Design Tools (MCPs — installed once on your laptop):**
   - **Playwright:** Lets the AI open your running app in a real browser and run E2E tests.
   - **Figma (optional):** Lets the AI read Figma frames directly from a link.
2. **Your AI Team (installed inside each project repo):**
   - **Grill-Me (`/grill-me`):** Asks you clarifying questions *before* coding so the AI doesn't build the wrong thing.
   - **Architect (`architect`):** Reads the repo rules, plans small slices, and checks the final code.
   - **Coder (`coder`):** Writes the actual code and runs type-checks/lint.
   - **Tester (`tester`):** Writes and runs Playwright E2E tests.
   - **Retro (`/retro`):** Saves lessons learned so the AI doesn't repeat the same mistake twice.

---

## Step 1: Check Prerequisites

Open your terminal and check you have **Node.js 20 or newer**:

```bash
node -v
```

*(If it's below `v20`, install Node 20+ via `nvm` or the Node.js website.)*

Make sure you also have at least one assistant installed:
- **Claude Code** (`claude --version`), or
- **Antigravity CLI** (`agy --version`)

### Optional: Get a Figma Token (only if you build UI from Figma links)
1. Open Figma → **Settings** → **Security** → **Personal access tokens**.
2. Click **Generate new token** (read-only is enough) and copy it.
3. **Never paste this token in chat or commit it to Git.**

---

## Step 2: Run the Setup Command

Open your terminal, `cd` into your project folder, and run **one** of these commands:

### Option A: Full setup (First time on a new laptop)
Installs the browser/Figma tools globally + adds the AI team to your current project:

```bash
npx github:ayubial/ai-kit --figma-key YOUR_FIGMA_KEY
```
*(No Figma key? Run `npx github:ayubial/ai-kit --mcp` to install just the Playwright browser tool + project agents.)*

### Option B: Project setup only (You already ran Option A on another project)
Installs only the AI agents/commands into the current project:

```bash
npx github:ayubial/ai-kit
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
2. **Check MCP tools:**
   - **Claude Code:** run `claude mcp list` → you should see `playwright` (and `figma-free-context` if you added a key).
   - **Antigravity:** type `/mcp` → you should see `playwright` (and `figma-free-context`).
3. **Check Agents:**
   - **Claude Code:** type `/architect` or `/grill-me` inside a session.
   - **Antigravity:** type `@architect`, `@coder`, `@tester`, or `/grill-me`.

---

## Step 4: How to Use It (Daily Workflow)

> **Golden Rule:** Don't ask the AI to build a huge feature in one giant prompt. Follow the **4-Step Loop** below — it's faster and produces way fewer bugs.

### Step 4.1 — Clarify First (`/grill-me`)
Before writing any code, let the AI interview you so edge cases (loading states, errors, API shapes) are clear.

- **Claude Code:** `/grill-me Add a "Cancel Order" button on the order detail page`
- **Antigravity:** `Use the grill-me skill: Add a "Cancel Order" button on the order detail page`

Answer the AI's questions. At the end, it will save a short plan in `.agents/specs/<feature>.md`.

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

**What happens behind the scenes:**
1. `architect` reads `AGENTS.md` / `CLAUDE.md` and writes a strict contract.
2. `coder` edits the files, runs type-checks/lint, and reports back.
3. `architect` checks `git diff` to make sure nothing outside scope was touched.
4. `tester` writes and runs the Playwright test (up to 2 fix cycles if it fails).

---

### Step 4.3 — Build UI from a Figma Link (Optional)
1. In Figma, right-click the frame → **Copy link to selection**.
2. Ask your assistant:
   ```text
   /grill-me Build this Figma design in <target-path>: <paste Figma link>
   ```
   Then hand the resulting spec to `architect`.

---

### Step 4.4 — Save Lessons Learned (`/retro`)
Did the AI make a silly mistake (like importing from the wrong folder or using an old helper)? Once your feature works, run:

- **Claude Code:** `/retro`
- **Antigravity:** `Run the retro skill on this session`

It will propose a 1–2 line update to `AGENTS.md` (or `docs/agents/`) so **everyone on the team** benefits next time.

---

## Troubleshooting

| Problem | How to fix it |
| :--- | :--- |
| **`npx` asks to install or hangs** | Check you are on Node >= 20 (`node -v`) and connected to your office VPN/proxy if required. |
| **MCP tool shows "Failed"** | Restart your AI assistant completely. |
| **Figma returns nothing or 403** | Your Figma token expired or lacks read access. Generate a new one and re-run with `--force --figma-key NEW_KEY`. |
| **`tester` says "connection refused"** | You forgot to start your app's dev server (`npm run dev`) before running `tester`. |
| **Agents don't appear** | Make sure you opened Claude/Antigravity inside the project root (the folder containing `.claude/` or `.agents/`). |
| **Pasted Figma key in chat by mistake** | Delete the token in Figma Settings immediately, create a new one, and re-run with `--force --figma-key NEW_KEY`. |
