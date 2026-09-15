#!/usr/bin/env node
/**
 * ERP supplementary design workflow reminder (4 skills + overlay).
 */
const HELP = `Usage: supplementary-design.mjs [--target inventory|schedule|settings] [--help]

Prints the ERP workflow for extract-design-system, vercel-composition-patterns,
sleek-design-mobile-apps, and emil-design-eng. Read supplementary-design-erp overlay first.
`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(HELP);
  process.exit(0);
}

const targetIdx = args.indexOf('--target');
const target = targetIdx >= 0 && args[targetIdx + 1] ? args[targetIdx + 1] : 'all';

const paths = {
  inventory: 'src/app/[locale]/inventory (modals: InventoryModalHeader, useInventoryMotion)',
  schedule: 'src/app/[locale]/schedule (safe-area modals, pastel cards off-limits)',
  settings: 'src/app/[locale]/settings (SETTINGS_* tokens)',
  all: 'inventory + schedule + settings + docs/erp-design-tokens.md',
};

console.log('\nSupplementary design workflow (BLACKANDBREW ERP)\n');
console.log('Overlay (mandatory): .cursor/skills/supplementary-design-erp/SKILL.md');
console.log('Token reference:     docs/erp-design-tokens.md\n');
console.log(`Target focus: ${paths[target] ?? paths.all}\n`);

const steps = [
  ['extract-design-system', 'ERP mode: inventory local tokens only; no URL scrape without approval'],
  ['vercel-composition-patterns', 'Compound modal/FAB/shell; no spreadsheet/hub splits'],
  ['sleek-design-mobile-apps', process.env.SLEEK_API_KEY ? 'Sleek OK: reference only' : 'No SLEEK_API_KEY: use chrome-modern-web-guidance for mobile'],
  ['emil-design-eng', 'toFramerPhaseVariants on panels; no grid cell motion'],
];

for (const [name, note] of steps) {
  console.log(`  ${name}`);
  console.log(`    ${note}`);
}

console.log('\nPre-ship: npm run skill:run design-review -- --target <path>');
console.log('OK: supplementary-design checklist printed.\n');
