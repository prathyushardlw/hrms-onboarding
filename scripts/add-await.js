const fs = require('fs');
const path = require('path');

function getAllTs(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...getAllTs(full));
    else if (entry.name.endsWith('.ts')) results.push(full);
  }
  return results;
}

const files = [
  ...getAllTs('src/app/api'),
  ...getAllTs('src/app/r'),
  'src/lib/seed.ts',
];

// Replace (await )?store.method → await store.method
// This normalises already-awaited calls too, so no double-await
const storeRe = /(await )?((?:companies|users|templates|docRules|onboardings|auditLogs|jobs|candidates|interviews|offers|employees)Store\.(?:getAll|getById|create|update|delete|find)\b)/g;
const auditRe = /(await )?((?:logAuditEvent|getAuditLogs|generateEmployeeId)\()/g;

let changed = 0;
for (const f of files) {
  let c = fs.readFileSync(f, 'utf8');
  const orig = c;
  c = c.replace(storeRe, (_, _aw, m) => 'await ' + m);
  c = c.replace(auditRe, (_, _aw, m) => 'await ' + m);
  if (c !== orig) {
    fs.writeFileSync(f, c);
    changed++;
    console.log('Updated:', path.relative('.', f));
  }
}
console.log(`\nDone. Changed ${changed} / ${files.length} files.`);

