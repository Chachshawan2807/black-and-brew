# New Skill Checklist

1. Copy `templates/skill-boilerplate` → `skills/<your-skill-id>/`
2. Rename `SKILL.md.template` → `SKILL.md` and fill frontmatter
3. Rename `scripts/run.mjs.template` → `scripts/run.mjs`
4. Add entry to `.agent-skills/registry.json`
5. Run `npm run skill:validate`
6. Run `npm run skill:run <your-skill-id>`
7. Update `AGENTS.md` PROJECT SKILLS table (optional but recommended for agents)
