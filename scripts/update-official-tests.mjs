/* Finds the official, free practice tests published by the exam owners and
   writes them to src/lib/exams/officialTests.json — the catalog the Exams
   pages show. No AI: it reads the owners' own web pages, follows only links
   on their own domains, and keeps a link only if it still opens (a PDF must
   really be a PDF).

   Run:  node scripts/update-official-tests.mjs
   A GitHub Action runs it every week and commits the result when something
   changed, which redeploys the site.

   If a source cannot be read (site down, layout changed), the tests found
   for it last time are kept and the source is marked as not checked, so one
   bad week never empties the catalog. */

import { readFile, writeFile } from 'node:fs/promises';

const OUT = new URL('../src/lib/exams/officialTests.json', import.meta.url);
const UA = 'Mozilla/5.0 (compatible; WordAroundCatalog/1.0; +https://wordaround-site.pages.dev)';

/* Where each owner publishes its free samples. `parse` turns the page into tests. */
const SOURCES = [
  {
    id: 'ielts-academic',
    examId: 'ielts',
    variantIds: ['academic'],
    owner: 'ielts.org',
    url: 'https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test',
    parse: parseIeltsPage,
  },
  {
    id: 'ielts-general',
    examId: 'ielts',
    variantIds: ['general'],
    owner: 'ielts.org',
    url: 'https://ielts.org/take-a-test/preparation-resources/sample-test-questions/general-training-test',
    parse: parseIeltsPage,
  },
  {
    id: 'dele',
    examId: 'dele',
    variantIds: [],
    owner: 'Instituto Cervantes',
    url: 'https://cervantes.org/es/examenes/dele',
    parse: parseCervantesPage,
  },
];

/* Links are only followed on the owners' domains. */
const TRUSTED_HOSTS = [/(^|\.)ielts\.org$/, /^(demo-)?ielts\.inspera\.com$/, /(^|\.)cervantes\.(es|org)$/];

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
const text = (html) =>
  decode(html.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();

const trusted = (url) => {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && TRUSTED_HOSTS.some((re) => re.test(hostname));
  } catch {
    return false;
  }
};

/** The most recent plausible year in a string, or null. */
export const yearIn = (s) => {
  const years = [...String(s).matchAll(/(?<!\d)(20[0-4]\d)(?!\d)/g)].map((m) => Number(m[1]));
  return years.length ? Math.max(...years) : null;
};

const SKILLS = [
  ['listening', /listening|auditiva/i],
  ['reading', /reading|lectura/i],
  ['writing', /writing|escrit/i],
  ['speaking', /speaking|oral/i],
];
const skillOf = (label) => SKILLS.find(([, re]) => re.test(label))?.[0] ?? null;

export const linkKind = (label, url) => {
  if (/answer key|claves/i.test(label)) return 'answers';
  if (/transcript|transcripci/i.test(label)) return 'transcript';
  if (/example responses|band scores|examiner comments/i.test(label)) return 'examples';
  if (/\.(mp3|wav|m4a)(\?|$)/i.test(url) || /audio/i.test(label)) return 'audio';
  if (/inspera\.com\/player/.test(url)) return 'online';
  return /\.pdf(\?|$)/i.test(url) ? 'pdf' : 'page';
};

const cleanTitle = (title) =>
  title
    .replace(/^(Academic |General Training )?((Listening|Reading|Writing|Speaking)\s+)?Sample tasks?\s*[-–]?\s*/i, '')
    .replace(/^./, (c) => c.toUpperCase()) || title;

const slug = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

/* ielts.org: two tabbed blocks, each shown twice (desktop tabs, then a
   mobile copy — only the desktop copy is read).
   - "practice experience": FULL practice tests in the official test player
     (Listening 40 questions, Reading 40 questions, Writing), one per tab;
   - "sample tasks": one short task per question type, each an <h4> followed
     by its links (online task, answer key, transcript).
   Only playable tasks and documents are kept, not "find out more" pages. */
export function parseIeltsPage(html, source) {
  const tests = [];
  for (const match of html.matchAll(/tabbed-content-panel d-lg-block/g)) {
    const panelEnd = html.indexOf('d-lg-none', match.index);
    const panel = html.slice(match.index, panelEnd > 0 ? panelEnd : undefined);
    const labels = Object.fromEntries(
      [...panel.matchAll(/data-for-tab="(\d+)">([^<]+)<\/button>/g)].map((m) => [m[1], decode(m[2]).trim()]),
    );
    /* The practice-experience block names its tabs "Listening test", "Academic
       Reading test"…; the sample-task block just "Listening", "Speaking"… */
    const full = Object.keys(labels).length > 0 && Object.values(labels).every((label) => /\btest$/i.test(label));
    const tabs = [...panel.matchAll(/class="tabbed-content-panel__content[^"]*" data-tab="(\d+)">/g)];
    tabs.forEach((tab, i) => {
      const tabLabel = labels[tab[1]] ?? '';
      const skill = skillOf(tabLabel);
      if (!skill) return;
      const body = panel.slice(tab.index, tabs[i + 1]?.index ?? panel.length);
      const onPaper = /on paper/i.test(tabLabel);
      /* A tab that names a module belongs to that module only. */
      const variantIds = /academic/i.test(tabLabel)
        ? ['academic']
        : /general training/i.test(tabLabel)
          ? ['general']
          : source.variantIds;
      const linksIn = (chunk) =>
        [...chunk.matchAll(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
          .map((m) => ({ url: decode(m[1]), label: text(m[2]) }))
          .filter((l) => trusted(l.url))
          .map((l) => ({ kind: linkKind(l.label, l.url), label: l.label, url: l.url }))
          .filter((l) => l.kind !== 'page');

      if (full) {
        const links = linksIn(body);
        if (links.length === 0) return;
        tests.push({
          id: `${source.examId}-full-${skill}-${variantIds.join('-')}${onPaper ? '-paper' : ''}`,
          examId: source.examId,
          variantIds,
          skill,
          kind: 'full',
          title: tabLabel,
          description: [...body.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => text(m[1])).join(' '),
          year: yearIn(links.map((l) => `${l.url} ${l.label}`).join(' ')),
          owner: source.owner,
          sourceUrl: source.url,
          links,
        });
        return;
      }

      const chunks = body.includes('<h4>')
        ? body.split('<h4>').slice(1).map((chunk) => {
            const close = chunk.indexOf('</h4>');
            return { heading: text(chunk.slice(0, close)), html: chunk.slice(close + 5) };
          })
        : [{ heading: tabLabel, html: body }];
      const items = [];
      for (const chunk of chunks) {
        const links = linksIn(chunk.html);
        const description = text((chunk.html.match(/<p>([\s\S]*?)<\/p>/) ?? ['', ''])[1]);
        /* Listening and reading list one playable task per question type; when
           two sit under one heading, each online task starts its own item. */
        if (skill === 'listening' || skill === 'reading') {
          let current = null;
          for (const link of links) {
            if (link.kind === 'online' || !current) {
              current = { heading: link.kind === 'online' ? link.label : chunk.heading, description, links: [] };
              items.push(current);
            }
            current.links.push(link);
          }
        } else if (links.length > 0) {
          items.push({ heading: chunk.heading, description, links });
        }
      }
      for (const { heading, description, links } of items) {
        const title = cleanTitle(heading);
        tests.push({
          id: `${source.examId}-${skill}-${slug(title)}-${variantIds.join('-')}${onPaper ? '-paper' : ''}`,
          examId: source.examId,
          variantIds,
          skill,
          kind: 'sample',
          title: onPaper ? `${title} (on paper)` : title,
          description,
          year: yearIn(links.map((l) => `${l.url} ${l.label}`).join(' ')),
          owner: source.owner,
          sourceUrl: source.url,
          links,
        });
      }
    });
  }
  if (tests.length === 0) throw new Error('no tests found — page layout changed');
  return tests;
}

/* cervantes.org: model exams are PDF links whose text or file name mentions
   a model ("modelo") and a DELE level. The exams site is being rebuilt, so
   this often finds nothing — which is reported, not hidden. */
export function parseCervantesPage(html, source) {
  const links = [...html.matchAll(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
    .map((m) => ({ url: new URL(decode(m[1]), source.url).toString(), label: text(m[2]) }))
    .filter((l) => trusted(l.url) && /\.pdf(\?|$)/i.test(l.url) && /modelo|examen/i.test(`${l.label} ${l.url}`));
  const byLevel = new Map();
  for (const link of links) {
    const level = /\b(A1|A2|B1|B2|C1|C2)\b/i.exec(`${link.label} ${link.url}`)?.[1]?.toUpperCase();
    if (!level) continue;
    const key = `${level}-${yearIn(link.url + link.label) ?? 'x'}`;
    const entry = byLevel.get(key) ?? { level, links: [] };
    entry.links.push(link);
    byLevel.set(key, entry);
  }
  return [...byLevel.values()].map(({ level, links: group }) => ({
    id: `dele-${level.toLowerCase()}-${yearIn(group.map((l) => l.url).join(' ')) ?? 'model'}`,
    examId: 'dele',
    variantIds: [level.toLowerCase()],
    skill: null,
    kind: 'full',
    title: `DELE ${level} — modelo de examen`,
    description: '',
    year: yearIn(group.map((l) => `${l.url} ${l.label}`).join(' ')),
    owner: source.owner,
    sourceUrl: source.url,
    links: group.map((l) => ({ kind: linkKind(l.label, l.url), label: l.label, url: l.url })),
  }));
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { html: await response.text(), finalUrl: response.url };
}

/** True if the link still opens what it promises (a PDF must be a PDF). */
async function linkWorks(link) {
  try {
    let response = await fetch(link.url, { method: 'HEAD', headers: { 'User-Agent': UA }, redirect: 'follow' });
    if (response.status === 405 || response.status === 403) {
      response = await fetch(link.url, { headers: { 'User-Agent': UA, Range: 'bytes=0-1023' }, redirect: 'follow' });
    }
    if (!response.ok) return false;
    const type = response.headers.get('content-type') ?? '';
    if (/\.pdf(\?|$)/i.test(link.url) && !/pdf|octet-stream/i.test(type)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function main() {
  const previous = JSON.parse(await readFile(OUT, 'utf8').catch(() => '{"tests":[],"sources":[]}'));
  const today = new Date().toISOString().slice(0, 10);
  const sources = [];
  const merged = new Map();

  for (const source of SOURCES) {
    let tests;
    let status;
    try {
      const { html } = await fetchText(source.url);
      tests = source.parse(html, source);
      const checked = [];
      for (const test of tests) {
        const links = [];
        for (const link of test.links) if (await linkWorks(link)) links.push(link);
        if (links.length > 0) checked.push({ ...test, links });
      }
      tests = checked;
      status = 'ok';
      console.log(`${source.id}: ${tests.length} tests`);
    } catch (error) {
      tests = previous.tests.filter((t) => t.sourceId === source.id);
      status = 'unreachable';
      console.warn(`${source.id}: kept ${tests.length} previous tests (${error.message})`);
    }
    sources.push({
      id: source.id,
      examId: source.examId,
      owner: source.owner,
      url: source.url,
      status,
      found: tests.length,
      checkedAt: status === 'ok' ? today : (previous.sources?.find((s) => s.id === source.id)?.checkedAt ?? null),
    });
    /* Listening and Speaking appear on both IELTS pages: one entry, both variants. */
    for (const test of tests) {
      const twin = [...merged.values()].find((t) => t.links[0]?.url === test.links[0]?.url);
      const existing = merged.get(test.id) ?? twin;
      if (existing) existing.variantIds = [...new Set([...existing.variantIds, ...test.variantIds])];
      else merged.set(test.id, { ...test, sourceId: test.sourceId ?? source.id });
    }
  }

  const output = { checkedAt: today, sources, tests: [...merged.values()] };
  const same =
    JSON.stringify({ ...previous, checkedAt: null, sources: previous.sources?.map((s) => ({ ...s, checkedAt: null })) }) ===
    JSON.stringify({ ...output, checkedAt: null, sources: output.sources.map((s) => ({ ...s, checkedAt: null })) });
  if (same) {
    console.log('No change in the catalog.');
    return;
  }
  await writeFile(OUT, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${output.tests.length} tests.`);
}

/* Runs when started from the command line, not when a test imports it. */
if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/update-official-tests.mjs')) {
  await main();
}
