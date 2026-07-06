# AgentSkillOS — BLACKANDBREW ERP

Project-local skill lifecycle management. Runbooks live in `.agent-skills/skills/` and are executed via the terminal runner — isolated from Next.js dependencies and third-party `.agents/skills/`.

## Quick commands

| Task | Command |
|------|---------|
| List skills | `npm run skill:list` |
| Run a skill | `npm run skill:run <id>` |
| Validate registry | `npm run skill:validate` |
| AgentSkillOS Web UI | `npm run asos:ui` |
| Rebuild skill tree | `npm run asos:build` |

## Directory layout

```
.agent-skills/
├── skills/           # Project runbooks (SKILL.md + scripts/)
├── templates/        # Boilerplate for new skills
├── registry.json     # Skill index for skill-runner
├── scripts/          # skill-runner.mjs, asos-runner.mjs
├── asos/             # AgentSkillOS config (not gitignored config/)
├── patches/          # Vendor patch for black_and_brew skill group
└── vendor/AgentSkillOS/  # Git submodule (upstream)
```

## Add a new skill (4 steps)

1. **Copy boilerplate**
   ```powershell
   Copy-Item -Recurse .agent-skills/templates/skill-boilerplate .agent-skills/skills/my-new-skill
   # Rename SKILL.md.template → SKILL.md, scripts/run.mjs.template → scripts/run.mjs
   ```

2. **Register** — add an entry to `.agent-skills/registry.json`

3. **Validate & test**
   ```powershell
   npm run skill:validate
   npm run skill:run my-new-skill
   ```

4. **Sync agent context** — add a row to `AGENTS.md` PROJECT SKILLS table; optional `npm run asos:build` if using AgentSkillOS retrieval

## Python / AgentSkillOS setup (one-time)

```powershell
py -3 -m venv .agent-skills/.venv
.agent-skills/.venv/Scripts/pip install -e .agent-skills/vendor/AgentSkillOS
Copy-Item .agent-skills/asos/.env.example .agent-skills/asos/.env
# Edit .agent-skills/asos/.env with LLM API keys
```

Prerequisites for full orchestration: Python 3.10+, [Claude Code CLI](https://github.com/anthropics/claude-code), LLM API key.

After submodule update, re-apply vendor patch:

```powershell
git apply .agent-skills/patches/constants-black-and-brew.patch
```

(Run from `.agent-skills/vendor/AgentSkillOS/`)

## Relationship to other skill systems

| Location | Purpose |
|----------|---------|
| `.agents/skills/` | Third-party curated skills (`npx skills add`) |
| `.cursor/skills/` | Project Cursor skills (e.g. chrome-modern-web-guidance) |
| `.agent-skills/skills/` | **This system** — project runbooks you or agents author |
| `SKILLS_INVENTORY.md` | Domain/business skill documentation |

Terminal runner (`skill:run`) works without Claude Code or LLM keys. Web UI and tree build require `.agent-skills/asos/.env`.
