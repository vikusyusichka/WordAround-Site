/* Ensures every locale has every key the English file has (filling gaps with
   the English string), and drops keys English no longer has. Run after adding
   new en keys so no locale silently loses a string.

   The locale list comes from src/lib/languages.ts (the 30 interface languages),
   so a newly added language gets a file seeded from English on the first run
   and can then be translated in place. */
const fs = require('fs');
const path = require('path');

const en = JSON.parse(fs.readFileSync('src/locales/en/common.json', 'utf8'));

/* Read the codes straight out of the registry — one source of truth, no second
   list to keep in step. */
const registry = fs.readFileSync('src/lib/languages.ts', 'utf8');
const codes = [...registry.matchAll(/code: '([a-z-]+)'/g)]
  .map((m) => m[1])
  .filter((c) => c !== 'en');

const sync = (source, target) => {
  const out = {};
  let added = 0, removed = 0;
  for (const k of Object.keys(source)) {
    if (typeof source[k] === 'string') {
      if (typeof target?.[k] === 'string') out[k] = target[k];
      else { out[k] = source[k]; added++; }
    } else {
      const r = sync(source[k], target?.[k] ?? {});
      out[k] = r.out; added += r.added; removed += r.removed;
    }
  }
  /* Plural forms English doesn't have (uk `_few`/`_many`, lv `_zero`, …) are
     kept: they are extra categories of a key English does have, not stale. */
  for (const k of Object.keys(target ?? {})) {
    if (k in source) continue;
    const base = k.replace(/_(zero|one|two|few|many|other)$/, '');
    /* English carries `key`, or `key_one`/`key_other` — either way the extra
       category belongs to a key English does have. */
    const known =
      base !== k &&
      (typeof source[base] === 'string' ||
        Object.keys(source).some((s) => s === base || s.startsWith(`${base}_`)));
    if (known) out[k] = target[k];
    else removed++;
  }
  return { out, added, removed };
};

let seeded = 0;
for (const loc of codes) {
  const file = path.join('src/locales', loc, 'common.json');
  const exists = fs.existsSync(file);
  if (!exists) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    seeded++;
  }
  const target = exists ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const { out, added, removed } = sync(en, target);
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
  const untranslated = added;
  console.log(
    `${loc}: ${exists ? '' : '(seeded) '}+${untranslated} filled from English, -${removed} stale`,
  );
}
if (seeded) console.log(`\n${seeded} new locale file(s) seeded from English — translate in place.`);
