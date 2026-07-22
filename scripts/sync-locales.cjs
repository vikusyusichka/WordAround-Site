/* Ensures every locale has every key the English file has (filling gaps with
   the English string), and drops keys English no longer has. Run after adding
   new en keys so no locale silently loses a string. */
const fs = require('fs');
const en = JSON.parse(fs.readFileSync('src/locales/en/common.json', 'utf8'));

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
  for (const k of Object.keys(target ?? {})) if (!(k in source)) removed++;
  return { out, added, removed };
};

for (const loc of ['uk', 'pl', 'de']) {
  const file = `src/locales/${loc}/common.json`;
  const target = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { out, added, removed } = sync(en, target);
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
  console.log(`${loc}: +${added} filled, -${removed} stale`);
}
