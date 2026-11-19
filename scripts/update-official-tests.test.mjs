import { describe, expect, it } from 'vitest';

import { linkKind, parseCervantesPage, parseIeltsPage, yearIn } from './update-official-tests.mjs';

/* A cut-down copy of the ielts.org layout: a sample-tasks block (tabs with
   <h4> items) and a practice-experience block (tabs named "… test"), each
   followed by its mobile copy, which must be ignored. */
const IELTS_PAGE = `
<div class="tabbed-content-panel d-lg-block d-none">
  <button data-for-tab="1">Listening</button><button data-for-tab="2">Speaking</button>
  <div class="tabbed-content-panel__content tabbed-content-panel__content--active" data-tab="1">
    <h4>Listening Sample task Note Completion</h4><p>You will hear a talk.</p>
    <ul><li><a href="https://ielts.inspera.com/player/?assessmentRunId=1&amp;context=exam">Note Completion</a></li>
    <li><a href="https://ielts.org/cdn/x/note-completion-answer-key.pdf">Note Completion Answer Key (PDF)</a></li>
    <li><a href="https://ielts.inspera.com/player/?assessmentRunId=2">Listening Sample task Table Completion</a></li>
    <li><a href="https://ielts.org/cdn/x/table-transcript.pdf">Table Completion Recording Transcript</a></li></ul>
  </div>
  <div class="tabbed-content-panel__content " data-tab="2">
    <h4>Speaking sample tasks</h4>
    <a href="https://ielts.org/cdn/ielts-speaking-sample-tasks-2023.pdf">Speaking sample tasks (PDF)</a>
    <a href="https://ielts.org/take-a-test/format-speaking">Find out more about the Speaking test</a>
    <a href="https://evil.example.com/test.pdf">Not official</a>
  </div>
</div>
<div class="d-lg-none d-block"><h4>Listening Sample task Note Completion</h4>
  <a href="https://ielts.inspera.com/player/?assessmentRunId=1">duplicate</a></div>
<div class="tabbed-content-panel d-lg-block d-none">
  <button data-for-tab="1">Listening test</button><button data-for-tab="2">Academic Reading test</button>
  <div class="tabbed-content-panel__content" data-tab="1"><p>In this <a href="https://demo-ielts.inspera.com/player/?assessmentRunId=9">Listening test sample</a>, four recordings.</p></div>
  <div class="tabbed-content-panel__content" data-tab="2"><p>This <a href="https://demo-ielts.inspera.com/player/?assessmentRunId=10">Academic Reading sample</a> has three texts.</p></div>
</div>
<div class="d-lg-none"></div>`;

const SOURCE = { examId: 'ielts', variantIds: ['academic', 'general'], owner: 'ielts.org', url: 'https://ielts.org/x' };

describe('parseIeltsPage', () => {
  const tests = parseIeltsPage(IELTS_PAGE, SOURCE);

  it('splits one item per playable task and keeps its answer key or transcript', () => {
    const listening = tests.filter((t) => t.kind === 'sample' && t.skill === 'listening');
    expect(listening.map((t) => t.title)).toEqual(['Note Completion', 'Table Completion']);
    expect(listening[0].links.map((l) => l.kind)).toEqual(['online', 'answers']);
    expect(listening[1].links.map((l) => l.kind)).toEqual(['online', 'transcript']);
    expect(listening[0].links[0].url).toBe('https://ielts.inspera.com/player/?assessmentRunId=1&context=exam');
  });

  it('keeps only official documents, with the year from the file name', () => {
    const speaking = tests.find((t) => t.skill === 'speaking');
    expect(speaking.links).toEqual([
      { kind: 'pdf', label: 'Speaking sample tasks (PDF)', url: 'https://ielts.org/cdn/ielts-speaking-sample-tasks-2023.pdf' },
    ]);
    expect(speaking.year).toBe(2023);
  });

  it('reads the practice-experience block as full tests, tied to the module the tab names', () => {
    const full = tests.filter((t) => t.kind === 'full');
    expect(full.map((t) => [t.skill, t.title, t.variantIds])).toEqual([
      ['listening', 'Listening test', ['academic', 'general']],
      ['reading', 'Academic Reading test', ['academic']],
    ]);
  });

  it('ignores the mobile copy', () => {
    expect(tests.filter((t) => t.links.some((l) => l.label === 'duplicate'))).toEqual([]);
  });

  it('fails loudly when the layout changes', () => {
    expect(() => parseIeltsPage('<html></html>', SOURCE)).toThrow(/layout changed/);
  });
});

describe('parseCervantesPage', () => {
  it('groups model-exam PDFs by level and year, official domains only', () => {
    const html = `
      <a href="/sites/files/DELE_B2_modelo_2024.pdf">Modelo de examen B2</a>
      <a href="https://examenes.cervantes.es/files/B2_claves_2024.pdf">Claves modelo B2</a>
      <a href="https://other.example.com/DELE_B1_modelo.pdf">Modelo B1</a>
      <a href="/news">Noticias</a>`;
    const tests = parseCervantesPage(html, { examId: 'dele', variantIds: [], owner: 'Instituto Cervantes', url: 'https://cervantes.org/es/examenes/dele' });
    expect(tests).toHaveLength(1);
    expect(tests[0]).toMatchObject({ id: 'dele-b2-2024', variantIds: ['b2'], year: 2024, kind: 'full' });
    expect(tests[0].links.map((l) => l.kind)).toEqual(['pdf', 'answers']);
  });
});

describe('helpers', () => {
  it('finds the latest plausible year and classifies links', () => {
    expect(yearIn('tasks-2019-rev-2023.pdf')).toBe(2023);
    expect(yearIn('assessmentRunId=189697549')).toBeNull();
    expect(linkKind('Answer Key', 'https://x/a.pdf')).toBe('answers');
    expect(linkKind('Listening', 'https://ielts.inspera.com/player/?a=1')).toBe('online');
    expect(linkKind('Find out more', 'https://ielts.org/format')).toBe('page');
  });
});
