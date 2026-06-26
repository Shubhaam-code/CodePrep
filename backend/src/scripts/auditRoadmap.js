
// ─────────────────────────────────────────────────────────────────────
// Roadmap Audit (Phase 2)
//
// READ-ONLY audit. Compares every question in backend/data/roadmap.json
// against the existing Question collection and prints a report.
//
// Guarantees:
//   • Does NOT modify the database.
//   • Does NOT modify any existing Question documents.
//   • Does NOT seed data, create new questions, or touch any other
//     collection (User, Submission, GV, Extension, RoadmapPattern).
//   • Does NOT touch the frontend, GitHub sync, or the browser
//     extension.
// ─────────────────────────────────────────────────────────────────────

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Question = require('../models/Question');

const ROADMAP_PATH = path.join(__dirname, '../../data/roadmap.json');
const ALIASES_PATH = path.join(__dirname, '../../data/roadmapAliases.json');

// ── Matching helpers (improved) ──────────────────────────────────────
//
// Canonicalization applies these rules in order:
//   1. case-insensitive (lowercase)
//   2. strip punctuation
//   3. "II"/"III"/"IV" → "2"/"3"/"4"
//   4. "BT"   → "binary tree"
//   5. "BST"  → "binary search tree"
//   6. "Nth" capitalization (auto via lowercase)
//   7. strip leading prefixes: "Best Time to", "Binary Tree",
//      "Binary Search Tree"
//   8. plural / irregular normalization
//      (parenthesis ↔ parentheses, orange ↔ oranges, …)
//   9. among ties, prefer the more LeetCode-official title
//  10. similarity ≥ 0.95 auto-matches
// ─────────────────────────────────────────────────────────────────────

const SIMILARITY_AUTO_MATCH = 0.95;

// Plural / irregular table. Surface form → canonical stem.
const STEM_OVERRIDES = {
  // Brief examples
  parenthesis: 'parenthesis',
  parentheses: 'parenthesis',
  orange: 'orange',
  oranges: 'orange',

  // Common DSA-title plurals / irregulars
  character: 'character',
  characters: 'character',
  island: 'island',
  islands: 'island',
  leaf: 'leaf',
  leaves: 'leaf',
  node: 'node',
  nodes: 'node',
  edge: 'edge',
  edges: 'edge',
  vertex: 'vertex',
  vertices: 'vertex',
  matrix: 'matrix',
  matrices: 'matrix',
  index: 'index',
  indices: 'index',
  indexes: 'index',
  number: 'number',
  numbers: 'number',
  string: 'string',
  strings: 'string',
  array: 'array',
  arrays: 'array',
  tree: 'tree',
  trees: 'tree',
  list: 'list',
  lists: 'list',
  sum: 'sum',
  sums: 'sum',
  level: 'level',
  levels: 'level',
  interval: 'interval',
  intervals: 'interval',
  square: 'square',
  squares: 'square',
  rectangle: 'rectangle',
  rectangles: 'rectangle',
  triangle: 'triangle',
  triangles: 'triangle',
  subsequence: 'subsequence',
  subsequences: 'subsequence',
  path: 'path',
  paths: 'path',
  zero: 'zero',
  zeros: 'zero',
  zeroes: 'zero',
  one: 'one',
  ones: 'one',
};

/** Reduce one word to its canonical stem. */
const stemWord = (raw) => {
  const w = String(raw).toLowerCase();
  if (STEM_OVERRIDES[w] !== undefined) return STEM_OVERRIDES[w];
  if (w.length <= 2) return w;
  // Don't stem short function words that happen to end in 's'.
  const STOP = new Set([
    'is', 'as', 'us', 'of', 'to', 'in', 'on', 'an', 'or', 'it',
    'at', 'be', 'by', 'no', 'so', 'do', 'if', 'we', 'he',
  ]);
  if (STOP.has(w)) return w;
  // -ies → -y (entries → entry)
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  // -es → ∅ (boxes → box, approaches → approach) but keep -ees / -oes
  if (
    w.length > 3 &&
    w.endsWith('es') &&
    !w.endsWith('ees') &&
    !w.endsWith('oes')
  ) {
    return w.slice(0, -2);
  }
  // -s → ∅ (but not -ss, -us, -is)
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

/** Canonical form of a title — what every title reduces to before
 *  equality / similarity comparisons. */
const canonicalize = (raw = '') => {
  let s = String(raw).toLowerCase();

  // Drop punctuation, collapse whitespace.
  s = s.replace(/[^a-z0-9\s]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();

  // Roman numerals → Arabic, word-boundary.
  s = s.replace(/\b(iii|ii|iv)\b/g, (m) => ({ ii: '2', iii: '3', iv: '4' }[m]));

  // Expand abbreviations via placeholders so partial matches
  // don't get re-expanded incorrectly.
  s = s.replace(/\bbinary search tree\b/g, ' __BST_FULL__ ');
  s = s.replace(/\bbinary tree\b/g, ' __BT_FULL__ ');
  s = s.replace(/\bbst\b/g, ' __BST_FULL__ ');
  s = s.replace(/\bbt\b/g, ' __BT_FULL__ ');
  s = s.split(/\s+/).filter(Boolean).map((tok) => {
    if (tok === '__BST_FULL__') return 'binary search tree';
    if (tok === '__BT_FULL__') return 'binary tree';
    return tok;
  }).join(' ');

  // Strip leading prefixes (post-expansion so e.g. "BST Iterator"
  // collapses to "iterator").
  s = s.replace(/^best time to\s+/, '');
  s = s.replace(/^binary search tree\s+/, '');
  s = s.replace(/^binary tree\s+/, '');
  s = s.replace(/\s+/g, ' ').trim();

  // Stem each token.
  s = s.split(/\s+/).filter(Boolean).map(stemWord).join(' ');

  return s;
};

/** canonical → Question docs[] */
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

/** Levenshtein edit distance — classic O(n·m) DP. */
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
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost,
      );
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

/** Combined similarity in [0,1]. Identical strings → 1.
 *  Uses max(tokenJaccard, jaccar*0.6 + lev*0.4) so that one-word
 *  flips still score high, while totally-different titles stay low. */
const similarity = (a, b) => {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const j = tokenJaccard(a, b);
  const lev = levenshteinSimilarity(a, b);
  const blend = j * 0.6 + lev * 0.4;
  return Math.max(j, blend);
};

/** Tiebreaker score: prefers the candidate that looks more like a
 *  long, fully-spelled LeetCode official title. */
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

/** Look up a roadmap title in the Question collection.
 *
 *  Matching flow (per Phase 3 spec):
 *    1. Exact canonical match (lowercase + collapsed + punctuation-
 *       stripped — see canonicalize).
 *    2. Alias lookup: if the roadmap title has an entry in
 *       roadmapAliases.json, look up THAT title in the Question
 *       collection with an exact case-insensitive match.
 *    3. Fuzzy match: similarity ≥ 0.95 auto-matches.
 *
 *  Returns { doc, similarity, matchType } | null.
 *  matchType is one of: 'exact', 'alias', 'auto'. */
const findBestMatch = (roadmapTitle, questions, aliases, aliasIndex) => {
  const targetCanonical = canonicalize(roadmapTitle);
  const index = buildQuestionIndex(questions);

  // 1. Exact canonical match wins, ties broken by officialness.
  const exact = index.get(targetCanonical);
  if (exact && exact.length > 0) {
    const ranked = [...exact].sort(
      (a, b) => officialness(b.title) - officialness(a.title)
    );
    return { doc: ranked[0], similarity: 1, matchType: 'exact' };
  }

  // 2. Alias lookup. If the roadmap title has a mapping, find the
  //    matching Question doc by exact case-insensitive title match.
  //    Only the alias value is looked up — we don't recursively
  //    re-canonicalize or re-alias. If the alias value isn't in the
  //    collection, we fall through to fuzzy (it's still better than
  //    giving up).
  if (aliases && aliases.has(targetCanonical)) {
    console.log("Alias Found :", roadmapTitle);
console.log("Canonical :", targetCanonical);
console.log("Alias :", aliases.get(targetCanonical));
    const aliasTarget = aliases.get(targetCanonical);
    const aliasHit = aliasIndex.get(canonicalize(aliasTarget));
    console.log(aliasHit);
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

  // 3. Fuzzy pass over every Question's canonical form.
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

/** Build a case-insensitive lookup of Question titles → docs[],
 *  used by the alias resolution step. */
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

/** Load roadmapAliases.json. Keys are lowercased so lookups can be
 *  done on the canonical (lowercased) form of a roadmap title.
 *  Returns a Map<lowerRoadmapTitle, aliasValue>. Missing file is
 *  not an error — we just skip the alias step. */
const loadAliases = (aliasesPath) => {
  if (!fs.existsSync(aliasesPath)) return new Map();
  const raw = JSON.parse(fs.readFileSync(aliasesPath, 'utf8'));
  const map = new Map();
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith('_')) continue;       // comment keys, ignored
    if (typeof v !== 'string' || !v.trim()) continue;
    map.set(String(k).toLowerCase().trim(), v.trim());
  }
  return map;
};

/** Top N similar Question titles for a missing roadmap title.
 *  Used only for the "Similar title suggestions" section. */
const suggestSimilar = (missingTitle, questions, maxSuggestions = 3) => {
  const targetCanonical = canonicalize(missingTitle);
  const targetTokens = targetCanonical.split(/\s+/).filter(Boolean);
  const firstToken = targetTokens[0];

  const scored = [];
  for (const c of questions) {
    const cCanonical = canonicalize(c.title);
    if (cCanonical === targetCanonical) continue;
    const sim = similarity(targetCanonical, cCanonical);
    if (sim <= 0) continue;

    const cTokens = cCanonical.split(/\s+/);
    const sharesFirst = firstToken && cTokens.includes(firstToken);
    const bonus = sharesFirst ? 0.10 : 0;
    const off = officialness(c.title) * 0.05;

    scored.push({
      title: c.title,
      similarity: sim,                  // raw, in [0, 1]
      rankScore: sim + bonus + off,     // ranking only
    });
  }

  scored.sort((a, b) => b.rankScore - a.rankScore);
  return scored.slice(0, maxSuggestions).map((s) => ({
    title: s.title,
    similarity: Number(s.similarity.toFixed(3)),
    rankScore: Number(s.rankScore.toFixed(3)),
  }));
};

// ── Main report ──────────────────────────────────────────────────────

const run = async () => {
  try {
    // Load the roadmap source-of-truth up front so a missing file
    // never opens a Mongo connection.
    if (!fs.existsSync(ROADMAP_PATH)) {
      throw new Error(`roadmap.json not found at ${ROADMAP_PATH}`);
    }
    const roadmap = JSON.parse(fs.readFileSync(ROADMAP_PATH, 'utf8'));
    if (!Array.isArray(roadmap)) {
      throw new Error('roadmap.json must be an array of patterns.');
    }

    // Build the full list of roadmap questions in display order so
    // we can flag duplicates within the roadmap itself.
    const roadmapQuestions = [];
    for (const pattern of roadmap) {
      for (const group of pattern.groups || []) {
        for (const title of group.questions || []) {
          roadmapQuestions.push({
            title,
            patternId: pattern.patternId,
            patternName: pattern.name,
            groupName: group.name || '(default)',
          });
        }
      }
    }

    const totalPatterns = roadmap.length;
    const totalRoadmapQuestions = roadmapQuestions.length;

    // Detect duplicate roadmap titles (same title listed more than
    // once across the roadmap). Uses canonical form so e.g. a
    // "BT" vs "Binary Tree" collision still flags.
    const roadmapTitleCounts = new Map();
    for (const rq of roadmapQuestions) {
      const key = canonicalize(rq.title);
      roadmapTitleCounts.set(key, (roadmapTitleCounts.get(key) || 0) + 1);
    }
    const roadmapDuplicates = [];
    for (const [key, count] of roadmapTitleCounts) {
      if (count > 1) {
        const occurrences = roadmapQuestions.filter(
          (rq) => canonicalize(rq.title) === key
        );
        roadmapDuplicates.push({
          title: occurrences[0].title,
          count,
          patterns: [...new Set(occurrences.map((o) => o.patternName))],
        });
      }
    }

    // Connect to Mongo and pull every Question title into memory.
    // We only need titles for matching, so we project just that
    // field — keeps this cheap even with thousands of docs.
    await connectDB();
    const allQuestions = await Question.find(
      {},
      { _id: 1, title: 1, leetcodeId: 1 }
    ).lean();

    const questionIndex = buildQuestionIndex(allQuestions);

    // Alias lookup: a roadmap title that doesn't exact-match may
    // still match an existing Question title via this mapping.
    // roadmapAliases.json is optional — a missing file disables the
    // step, never aborts the audit.
    const aliases = loadAliases(ALIASES_PATH);
    const aliasIndex = buildAliasIndex(allQuestions);

    // Detect duplicate Question titles in the collection.
    const dbDuplicates = [];
    for (const [key, docs] of questionIndex) {
      if (docs.length > 1) {
        dbDuplicates.push({
          title: docs[0].title,
          count: docs.length,
          leetcodeIds: docs.map((d) => d.leetcodeId),
        });
      }
    }

    // Walk the roadmap and tally matches / misses.
    let matched = 0;
    let autoMatched = 0;
    let aliasMatched = 0;
    const missingByPattern = [];
    const suggestionsByPattern = [];
    const matchDetailsByPattern = [];
    const aliasHitsByPattern = [];

    for (const pattern of roadmap) {
      const missingForPattern = [];
      const suggestionsForPattern = [];
      const matchesForPattern = [];
      const aliasHitsForPattern = [];

      for (const group of pattern.groups || []) {
        for (const title of group.questions || []) {
          const m = findBestMatch(title, allQuestions, aliases, aliasIndex);
          console.log(
  title,
  m ? `MATCH (${m.matchType})` : "NO MATCH"
);
          if (m) {
            matched += 1;
            if (m.matchType === 'auto') autoMatched += 1;
            if (m.matchType === 'alias') aliasMatched += 1;
            matchesForPattern.push({
              title,
              groupName: group.name || '(default)',
              matchType: m.matchType,
              similarity: Number(m.similarity.toFixed(3)),
              matchedTitle: m.doc.title,
              leetcodeId: m.doc.leetcodeId,
              aliasTarget: m.aliasTarget || null,
            });
            if (m.matchType === 'alias') {
              aliasHitsForPattern.push({
                title,
                groupName: group.name || '(default)',
                aliasTarget: m.aliasTarget,
                matchedTitle: m.doc.title,
                leetcodeId: m.doc.leetcodeId,
              });
            }
          } else {
            const suggestions = suggestSimilar(title, allQuestions, 3);
            missingForPattern.push({
              title,
              groupName: group.name || '(default)',
            });
            suggestionsForPattern.push({
              title,
              groupName: group.name || '(default)',
              suggestions,
            });
          }
        }
      }

      if (missingForPattern.length > 0) {
        for (const m of missingForPattern) {
          missingByPattern.push({
            patternId: pattern.patternId,
            patternName: pattern.name,
            title: m.title,
            groupName: m.groupName,
          });
        }
        suggestionsByPattern.push({
          patternId: pattern.patternId,
          patternName: pattern.name,
          items: suggestionsForPattern,
        });
      }

      if (matchesForPattern.length > 0) {
        matchDetailsByPattern.push({
          patternId: pattern.patternId,
          patternName: pattern.name,
          items: matchesForPattern,
        });
      }

      if (aliasHitsForPattern.length > 0) {
        aliasHitsByPattern.push({
          patternId: pattern.patternId,
          patternName: pattern.name,
          items: aliasHitsForPattern,
        });
      }
    }

    const totalMissing = totalRoadmapQuestions - matched;

    // ── Print the report ────────────────────────────────────────────
    const line = (s = '') => console.log(s);
    const hr = () => line('─'.repeat(72));

    line('');
    line('╔══════════════════════════════════════════════════════════════════════╗');
    line('║                   ROADMAP AUDIT REPORT (Phase 3)                    ║');
    line('╚══════════════════════════════════════════════════════════════════════╝');
    line('');
    hr();
    line(' 1. Total roadmap patterns          : ' + totalPatterns);
    line(' 2. Total roadmap questions         : ' + totalRoadmapQuestions);
    line(' 3. Total matched questions         : ' + matched);
    line('      • exact canonical match       : ' + (matched - autoMatched - aliasMatched));
    line('      • alias match (roadmapAliases): ' + aliasMatched);
    line('      • fuzzy auto-match (≥95%)     : ' + autoMatched);
    line(' 4. Total missing questions         : ' + totalMissing);
    line(' 5. Database Question collection    : ' + allQuestions.length);
    if (aliases.size > 0) {
      line(' 6. Aliases loaded                  : ' + aliases.size);
    }
    hr();

    // 5. Missing grouped by pattern
    line('');
    line('── Missing questions grouped by pattern ──');
    if (missingByPattern.length === 0) {
      line('  (none — every roadmap question has a matching Question doc)');
    } else {
      const grouped = new Map();
      for (const m of missingByPattern) {
        if (!grouped.has(m.patternId)) {
          grouped.set(m.patternId, {
            patternName: m.patternName,
            items: [],
          });
        }
        grouped.get(m.patternId).items.push(m);
      }
      for (const [patternId, { patternName, items }] of grouped) {
        line('');
        line(`  ▸ ${patternName}  [${patternId}]  — ${items.length} missing`);
        for (const it of items) {
          const groupTag = it.groupName && it.groupName !== '(default)'
            ? ` (${it.groupName})`
            : '';
          line(`      • ${it.title}${groupTag}`);
        }
      }
    }

    // 6. Duplicate Question titles (DB + roadmap)
    line('');
    line('── Duplicate Question titles ──');
    if (dbDuplicates.length === 0 && roadmapDuplicates.length === 0) {
      line('  (none)');
    } else {
      if (dbDuplicates.length > 0) {
        line('');
        line('  ▸ Duplicate Question docs (same canonical title, multiple docs):');
        for (const d of dbDuplicates) {
          line(`      • "${d.title}"  ×${d.count}  leetcodeIds=[${d.leetcodeIds.join(', ')}]`);
        }
      }
      if (roadmapDuplicates.length > 0) {
        line('');
        line('  ▸ Duplicate roadmap entries (same canonical title, listed multiple times):');
        for (const d of roadmapDuplicates) {
          line(`      • "${d.title}"  ×${d.count}  in: ${d.patterns.join(', ')}`);
        }
      }
    }

    // 7. Similar title suggestions
    line('');
    line('── Similar title suggestions for missing questions ──');
    let anySuggestions = false;
    for (const p of suggestionsByPattern) {
      const withSuggestions = p.items.filter(
        (i) => i.suggestions.length > 0
      );
      if (withSuggestions.length === 0) continue;
      anySuggestions = true;
      line('');
      line(`  ▸ ${p.patternName}  [${p.patternId}]`);
      for (const it of withSuggestions) {
        const groupTag = it.groupName && it.groupName !== '(default)'
          ? ` (${it.groupName})`
          : '';
        line(`      • Missing: "${it.title}"${groupTag}`);
        for (const s of it.suggestions) {
          line(`          → "${s.title}"   (sim=${s.similarity}, rank=${s.rankScore})`);
        }
      }
    }
    if (!anySuggestions) {
      line('  (no similar candidates found in the Question collection)');
    }

    // Fuzzy-match details — show what auto-matched, with the matched
    // Question's leetcodeId so the mapping is auditable.
    const fuzzyItems = [];
    for (const p of matchDetailsByPattern) {
      for (const it of p.items) {
        if (it.matchType === 'auto') {
          fuzzyItems.push({
            patternName: p.patternName,
            patternId: p.patternId,
            ...it,
          });
        }
      }
    }
    if (fuzzyItems.length > 0) {
      line('');
      line('── Fuzzy auto-matches (≥95% similarity) ──');
      line('  These matched without an exact canonical hit. Verify before trusting.');
      for (const f of fuzzyItems) {
        line(
          `      • [${f.patternId}] "${f.title}"  →  ` +
          `"${f.matchedTitle}"  ` +
          `(lc=${f.leetcodeId}, sim=${f.similarity})`
        );
      }
    }

    line('');
    hr();
    line(
      ` SUMMARY: ${matched}/${totalRoadmapQuestions} matched ` +
      `(${autoMatched} fuzzy), ${totalMissing} missing, ` +
      `${roadmapDuplicates.length} dup-in-roadmap, ${dbDuplicates.length} dup-in-db`
    );
    hr();
    line('');
  } catch (err) {
    console.error('\n💥 CRITICAL — Audit aborted:', err.message);
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