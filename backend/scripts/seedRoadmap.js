// ─────────────────────────────────────────────────────────────────────
// Roadmap Seeder (Phase 4)
//
// READ-MOSTLY update. Walks backend/data/roadmap.json and writes the
// four roadmap fields onto EXISTING Question documents. Does not
// create new Questions, does not touch any other field on the doc,
// and does not touch the roadmap.json, the Question collection
// structure, the seeder that hydrates Question docs from CSV, or any
// frontend / API.
//
// Title matching reuses the exact pipeline from
// src/scripts/auditRoadmap.js — canonicalize → loadAliases →
// buildAliasIndex → findBestMatch — so a roadmap title that the
// audit calls matched (exact, alias, or fuzzy ≥0.95) is the same
// title this seeder tags. The bulkWrite filter keys on the matched
// doc's _id, never on raw title.
//
// Fields written per matched Question:
//   • roadmapCategory  — derived from patternId (see CATEGORY_BY_PATTERN)
//   • roadmapPattern   — pattern.patternId (slug)
//   • roadmapOrder     — question position within the pattern, 0-indexed
//   • patternOrder     — question position within its group, 0-indexed
//
// Idempotent: re-running yields the same four field values for every
// matched Question because the inputs (roadmap.json + the mapping)
// are stable. Uses bulkWrite with updateOne ops so Mongoose doesn't
// trip timestamps / middleware side effects on any other field.
// ─────────────────────────────────────────────────────────────────────

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Question = require('../src/models/Question');

const ROADMAP_PATH = path.join(__dirname, '../data/roadmap.json');
const ALIASES_PATH = path.join(__dirname, '../data/roadmapAliases.json');

// ═════════════════════════════════════════════════════════════════════
// Matching pipeline — copied verbatim from src/scripts/auditRoadmap.js
// so this seeder uses the SAME exact/alias/fuzzy logic. Drift
// between the two files would silently mis-tag Questions. Keep
// these helpers byte-for-byte identical to auditRoadmap.js.
// ═════════════════════════════════════════════════════════════════════

const SIMILARITY_AUTO_MATCH = 0.95;

const STEM_OVERRIDES = {
  parenthesis: 'parenthesis', parentheses: 'parenthesis',
  orange: 'orange', oranges: 'orange',
  character: 'character', characters: 'character',
  island: 'island', islands: 'island',
  leaf: 'leaf', leaves: 'leaf',
  node: 'node', nodes: 'node',
  edge: 'edge', edges: 'edge',
  vertex: 'vertex', vertices: 'vertex',
  matrix: 'matrix', matrices: 'matrix',
  index: 'index', indices: 'index', indexes: 'index',
  number: 'number', numbers: 'number',
  string: 'string', strings: 'string',
  array: 'array', arrays: 'array',
  tree: 'tree', trees: 'tree',
  list: 'list', lists: 'list',
  sum: 'sum', sums: 'sum',
  level: 'level', levels: 'level',
  interval: 'interval', intervals: 'interval',
  square: 'square', squares: 'square',
  rectangle: 'rectangle', rectangles: 'rectangle',
  triangle: 'triangle', triangles: 'triangle',
  subsequence: 'subsequence', subsequences: 'subsequence',
  path: 'path', paths: 'path',
  zero: 'zero', zeros: 'zero', zeroes: 'zero',
  one: 'one', ones: 'one',
};

const stemWord = (raw) => {
  const w = String(raw).toLowerCase();
  if (STEM_OVERRIDES[w] !== undefined) return STEM_OVERRIDES[w];
  if (w.length <= 2) return w;
  const STOP = new Set([
    'is', 'as', 'us', 'of', 'to', 'in', 'on', 'an', 'or', 'it',
    'at', 'be', 'by', 'no', 'so', 'do', 'if', 'we', 'he',
  ]);
  if (STOP.has(w)) return w;
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (
    w.length > 3 &&
    w.endsWith('es') &&
    !w.endsWith('ees') &&
    !w.endsWith('oes')
  ) {
    return w.slice(0, -2);
  }
  if (
    w.endsWith('s') &&
    !w.endsWith('ss') &&
    !w.endsWith('us') &&
    !w.endsWith('is') &&
    w.length > 2
  ) {
    return w.slice(0, -1);
  }
  return w;
};

const canonicalize = (raw = '') => {
  let s = String(raw).toLowerCase();
  s = s.replace(/[^a-z0-9\s]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  s = s.replace(/\b(iii|ii|iv)\b/g, (m) => ({ ii: '2', iii: '3', iv: '4' }[m]));
  s = s.replace(/\bbinary search tree\b/g, ' __BST_FULL__ ');
  s = s.replace(/\bbinary tree\b/g, ' __BT_FULL__ ');
  s = s.replace(/\bbst\b/g, ' __BST_FULL__ ');
  s = s.replace(/\bbt\b/g, ' __BT_FULL__ ');
  s = s.split(/\s+/).filter(Boolean).map((tok) => {
    if (tok === '__BST_FULL__') return 'binary search tree';
    if (tok === '__BT_FULL__') return 'binary tree';
    return tok;
  }).join(' ');
  s = s.replace(/^best time to\s+/, '');
  s = s.replace(/^binary search tree\s+/, '');
  s = s.replace(/^binary tree\s+/, '');
  s = s.replace(/\s+/g, ' ').trim();
  s = s.split(/\s+/).filter(Boolean).map(stemWord).join(' ');
  return s;
};

const buildQuestionIndex = (questions) => {
  const byCanonical = new Map();
  for (const q of questions) {
    const key = canonicalize(q.title);
    if (!key) continue;
    if (!byCanonical.has(key)) byCanonical.set(key, []);
    byCanonical.get(key).push(q);
  }
  return byCanonical;
};

const levenshteinDistance = (a, b) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
};

const levenshteinSimilarity = (a, b) => {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
};

const tokenJaccard = (a, b) => {
  const ta = new Set(a.split(/\s+/).filter(Boolean));
  const tb = new Set(b.split(/\s+/).filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
};

const similarity = (a, b) => {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const j = tokenJaccard(a, b);
  const lev = levenshteinSimilarity(a, b);
  const blend = j * 0.6 + lev * 0.4;
  return Math.max(j, blend);
};

const officialness = (title) => {
  let s = 0;
  s += Math.min(String(title).length / 100, 0.5);
  if (/\bbinary tree\b/i.test(title)) s += 0.15;
  if (/\bbinary search tree\b/i.test(title)) s += 0.15;
  if (/\bbest time to\b/i.test(title)) s += 0.10;
  if (/(^|\s)bt(\s|$)/i.test(title)) s -= 0.10;
  if (/(^|\s)bst(\s|$)/i.test(title)) s -= 0.10;
  return s;
};

const buildAliasIndex = (questions) => {
  const byLower = new Map();
  for (const q of questions) {
    const key = canonicalize(q.title);
    if (!key) continue;
    if (!byLower.has(key)) byLower.set(key, []);
    byLower.get(key).push(q);
  }
  return byLower;
};

const loadAliases = (aliasesPath) => {
  if (!fs.existsSync(aliasesPath)) return new Map();
  const raw = JSON.parse(fs.readFileSync(aliasesPath, 'utf8'));
  const map = new Map();
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith('_')) continue;
    if (typeof v !== 'string' || !v.trim()) continue;
    map.set(canonicalize(k), v.trim());
  }
  return map;
};

const findBestMatch = (roadmapTitle, questions, aliases, aliasIndex) => {
  const targetCanonical = canonicalize(roadmapTitle);
  const index = buildQuestionIndex(questions);

  const exact = index.get(targetCanonical);
  if (exact && exact.length > 0) {
    const ranked = [...exact].sort(
      (a, b) => officialness(b.title) - officialness(a.title)
    );
    return { doc: ranked[0], similarity: 1, matchType: 'exact' };
  }

  if (aliases && aliases.has(targetCanonical)) {
    const aliasTarget = aliases.get(targetCanonical);
    const aliasHit = aliasIndex.get(canonicalize(aliasTarget));
    if (aliasHit && aliasHit.length > 0) {
      const ranked = [...aliasHit].sort(
        (a, b) => officialness(b.title) - officialness(a.title)
      );
      return {
        doc: ranked[0],
        similarity: 1,
        matchType: 'alias',
        aliasTarget,
      };
    }
  }

  let bestDoc = null;
  let bestScore = 0;
  for (const q of questions) {
    const qCanonical = canonicalize(q.title);
    if (qCanonical === targetCanonical) continue;
    const score = similarity(targetCanonical, qCanonical);
    if (score > bestScore) {
      bestScore = score;
      bestDoc = q;
    }
  }

  if (bestDoc && bestScore >= SIMILARITY_AUTO_MATCH) {
    return { doc: bestDoc, similarity: bestScore, matchType: 'auto' };
  }
  return null;
};

// ═════════════════════════════════════════════════════════════════════
// Roadmap-category derivation (specific to this seeder)
// ═════════════════════════════════════════════════════════════════════

// roadmap.json has no top-level category. Derive a stable category
// per patternId so the seeder is idempotent across re-runs. Anything
// not listed here is bucketed under "general".
const CATEGORY_BY_PATTERN = {
  'fast-and-slow-pointer':           'linked_list',
  'reversal-of-linked-list-in-place':'linked_list',

  'overlapping-intervals':           'arrays',
  'prefix-sum':                      'arrays',
  'sliding-window':                  'arrays',
  'two-pointers':                    'arrays',
  'cyclic-sort-index-based':         'arrays',

  'matrix-manipulation':             'matrix',

  'breadth-first-search-bfs':        'graph_traversal',
  'depth-first-search-dfs':          'graph_traversal',
  'backtracking':                    'graph_traversal',

  'modified-binary-search':          'binary_search',
  'bitwise-xor':                     'bit_manipulation',

  'top-k-elements':                  'heaps',
  'k-way-merge':                     'heaps',
  'two-heaps':                       'heaps',
  'monotonic-stack':                 'heaps',

  'trees':                           'trees',
  'dynamic-programming':             'dynamic_programming',
  'graphs':                          'graphs',
  'greedy':                          'greedy',
  'design-data-structure':           'design',
};

const categoryForPattern = (patternId) =>
  CATEGORY_BY_PATTERN[patternId] || 'general';

// ═════════════════════════════════════════════════════════════════════
// Bulk write helpers
// ═════════════════════════════════════════════════════════════════════

/**
 * Walk the roadmap, resolve each title through findBestMatch (same
 * pipeline as the audit), and build the bulkWrite ops. Each op is
 * an updateOne filtered by the matched Question's _id — never by
 * raw title — so casing / punctuation drift between roadmap.json
 * and the DB can never tag the wrong doc.
 */
const buildBulkOps = (roadmap, questions, aliases, aliasIndex) => {
  const ops = [];
  const seenTitles = new Map(); // roadmap title → [{patternId, order, matchType}]

  for (const pattern of roadmap) {
    const patternId = pattern.patternId;
    const category = categoryForPattern(patternId);
    const groups = pattern.groups || [];

    let questionIndexInPattern = 0;

    for (let groupIdx = 0; groupIdx < groups.length; groupIdx += 1) {
      const group = groups[groupIdx];
      const questionsInGroup = group.questions || [];

      for (let qIdx = 0; qIdx < questionsInGroup.length; qIdx += 1) {
        const title = questionsInGroup[qIdx];
        const m = findBestMatch(title, questions, aliases, aliasIndex);

        if (!seenTitles.has(title)) seenTitles.set(title, []);
        seenTitles.get(title).push({
          patternId,
          roadmapOrder: questionIndexInPattern,
          groupIndex: groupIdx,
          patternOrder: qIdx,
          match: m ? { matchType: m.matchType, _id: m.doc._id } : null,
        });

        if (m) {
          ops.push({
            updateOne: {
              filter: { _id: m.doc._id },
              update: {
                $set: {
                  roadmapCategory: category,
                  roadmapPattern:  patternId,
                  roadmapOrder:    questionIndexInPattern,
                  patternOrder:    qIdx,
                },
              },
              upsert: false,
            },
          });
        }

        questionIndexInPattern += 1;
      }
    }
  }

  return { ops, seenTitles };
};

// ═════════════════════════════════════════════════════════════════════
// Main
// ═════════════════════════════════════════════════════════════════════

const run = async () => {
  const startedAt = Date.now();

  try {
    if (!fs.existsSync(ROADMAP_PATH)) {
      throw new Error(`roadmap.json not found at ${ROADMAP_PATH}`);
    }
    const roadmap = JSON.parse(fs.readFileSync(ROADMAP_PATH, 'utf8'));
    if (!Array.isArray(roadmap)) {
      throw new Error('roadmap.json must be an array of patterns.');
    }

    await connectDB();

    // Pull every Question title in one shot so we can build the
    // alias + canonical indexes without N round-trips.
    const allQuestions = await Question.find(
      {},
      { _id: 1, title: 1, roadmapCategory: 1, roadmapPattern: 1,
        roadmapOrder: 1, patternOrder: 1 }
    ).lean();

    const aliases = loadAliases(ALIASES_PATH);
    const aliasIndex = buildAliasIndex(allQuestions);

    const { ops, seenTitles } = buildBulkOps(
      roadmap, allQuestions, aliases, aliasIndex
    );

    // Pre-flight: which roadmap titles didn't resolve through the
    // matching pipeline? We still send every op to bulkWrite —
    // Mongoose will just matchedCount=0 for those — but reporting
    // before the write makes the dry-run signal obvious.
    const roadmapTitles = Array.from(seenTitles.keys());
    const missingTitles = roadmapTitles.filter(
      (t) => !seenTitles.get(t)[0].match
    );

    // Execute the bulk write in one round-trip. ordered: false so a
    // single bad op doesn't abort the rest of the batch.
    await Question.bulkWrite(ops, { ordered: false });

    // Post-flight: which Question docs were actually updated?
    // Pull the freshly-set roadmap fields for every doc we tried to
    // touch and count the ones with all four populated.
    const updatedIds = Array.from(new Set(
      ops.map((o) => String(o.updateOne.filter._id))
    ));
    const touchedDocs = updatedIds.length === 0
      ? []
      : await Question.find(
          { _id: { $in: updatedIds } },
          { _id: 1, roadmapCategory: 1, roadmapPattern: 1,
            roadmapOrder: 1, patternOrder: 1 }
        ).lean();

    const fullyUpdated = touchedDocs.filter((q) =>
      q.roadmapCategory !== null && q.roadmapPattern !== null
      && q.roadmapOrder !== null && q.patternOrder !== null
    );

    // ── Report ─────────────────────────────────────────────────────
    const line = (s = '') => console.log(s);
    const hr = () => line('─'.repeat(72));

    line('');
    hr();
    line('  ROADMAP SEED REPORT (Phase 4)');
    hr();
    line(`  Patterns in roadmap.json     : ${roadmap.length}`);
    line(`  Bulk-write ops sent          : ${ops.length}`);
    line(`  Patterns updated             : ${roadmap.length}`);
    line(`  Questions matched in DB      : ${updatedIds.length}`);
    line(`  Questions updated            : ${fullyUpdated.length}`);
    line(`  Missing (no Question doc)    : ${missingTitles.length}`);
    hr();

    if (missingTitles.length > 0) {
      line('');
      line('  ⚠ Missing questions (no matching Question doc by exact title):');
      const sorted = [...missingTitles].sort();
      for (const t of sorted) {
        const occurrences = seenTitles.get(t) || [];
        const where = occurrences
          .map((o) => `${o.patternId}#${o.roadmapOrder}`)
          .join(', ');
        line(`      • "${t}"  →  referenced in: ${where}`);
      }
    }

    line('');
    line('  ✅ Roadmap seed complete.');
    line(`     Elapsed: ${Date.now() - startedAt}ms`);
    line('');
  } catch (err) {
    console.error('\n💥 CRITICAL — Roadmap seed aborted:', err.message);
    process.exitCode = 1;
  } finally {
    try {
      await mongoose.connection.close();
    } catch (_) {
      /* ignore */
    }
    process.exit(process.exitCode || 0);
  }
};

run();
