import { describe, expect, it } from 'vitest';

import {
  cleanJSONText,
  cleanMarkdownFences,
  extractFirstJSONObjectOrArray,
  normalizedText,
  unwrapJSONStringIfNeeded,
} from './aiTextCleaner';

describe('cleanMarkdownFences', () => {
  it('strips ```json…``` fences', () => {
    expect(cleanMarkdownFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('strips lang-less ```…``` fences', () => {
    expect(cleanMarkdownFences('```\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('leaves already-clean JSON alone', () => {
    expect(cleanMarkdownFences('  {"a":1}  ')).toBe('{"a":1}');
  });

  it('a fence without a newline after ```json leaves the lang tag stuck (matches iOS)', () => {
    // No newline → the whole first 3 chars drop but "json" stays; then the
    // trailing ``` is stripped. cleanJSONText's extractor recovers from this.
    expect(cleanMarkdownFences('```json{"a":1}```')).toBe('json{"a":1}');
  });
});

describe('unwrapJSONStringIfNeeded', () => {
  it('unwraps a double-encoded JSON string', () => {
    expect(unwrapJSONStringIfNeeded('"{\\"a\\":1}"')).toBe('{"a":1}');
  });

  it('leaves an unquoted object alone', () => {
    expect(unwrapJSONStringIfNeeded('{"a":1}')).toBe('{"a":1}');
  });

  it('leaves malformed quoted content alone', () => {
    // Not a valid JSON string (unterminated escape) — return as-is.
    expect(unwrapJSONStringIfNeeded('"hello')).toBe('"hello');
  });
});

describe('extractFirstJSONObjectOrArray', () => {
  it('extracts a nested object from prose', () => {
    const input = 'Sure! Here is the JSON:\n{"title":"Space","tips":["a","b"]}\nHope it helps.';
    expect(extractFirstJSONObjectOrArray(input)).toBe('{"title":"Space","tips":["a","b"]}');
  });

  it('honors string literals — braces inside strings do not break scanning', () => {
    const input = '{"note":"a } inside a string","x":1}';
    expect(extractFirstJSONObjectOrArray(input)).toBe(input);
  });

  it('honors escaped quotes in strings', () => {
    const input = '{"quote":"she said \\"hi\\"","ok":true}';
    expect(extractFirstJSONObjectOrArray(input)).toBe(input);
  });

  it('extracts arrays when the array root comes first', () => {
    const input = 'The list: [1,2,3] and more prose {"unused":1}';
    expect(extractFirstJSONObjectOrArray(input)).toBe('[1,2,3]');
  });

  it('extracts the object when it precedes an array', () => {
    const input = '{"tips":["a","b"]} [ignored]';
    expect(extractFirstJSONObjectOrArray(input)).toBe('{"tips":["a","b"]}');
  });

  it('returns unchanged when nothing balanced is found', () => {
    expect(extractFirstJSONObjectOrArray('no json here')).toBe('no json here');
  });
});

describe('normalizedText + cleanJSONText', () => {
  it('handles fence + prose in one pass', () => {
    const input = '```json\nHere is your answer: {"a":1}\n```';
    expect(cleanJSONText(input)).toBe('{"a":1}');
  });

  it('handles double-encoded + fenced JSON', () => {
    const outer = '```json\n"{\\"tips\\":[\\"a\\",\\"b\\"]}"\n```';
    expect(cleanJSONText(outer)).toBe('{"tips":["a","b"]}');
  });

  it('normalizedText leaves clean JSON alone', () => {
    expect(normalizedText('{"a":1}')).toBe('{"a":1}');
  });
});
