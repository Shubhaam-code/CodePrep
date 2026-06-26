const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
console.log("GitHub Token:", process.env.GITHUB_TOKEN ? "✅ Loaded" : "❌ Missing");

const fetch = require('node-fetch');
const { parse } = require('csv-parse/sync');
const connectDB = require('../config/db');
const Question = require('../models/Question');
const CompanyQuestion = require('../models/CompanyQuestion');
const mongoose = require('mongoose');

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

/** Case-insensitive, punctuation-stripped column lookup */
const getVal = (row, key) => {
  const norm = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  const found = Object.keys(row).find(
    k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === norm
  );
  return found ? row[found] : undefined;
};

const normalizeDifficulty = (diff) => {
  if (!diff) return 'Easy';
  const d = diff.trim().toLowerCase();
  if (d === 'easy')   return 'Easy';
  if (d === 'medium') return 'Medium';
  if (d === 'hard')   return 'Hard';
  return diff.charAt(0).toUpperCase() + diff.slice(1).toLowerCase();
};

const makeSlug = (title, id) =>
  (title || `question-${id}`)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');

/** Shared GitHub API headers */
const githubHeaders = () => {
  const h = { 'User-Agent': 'node-fetch' };
  if (process.env.GITHUB_TOKEN) h['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  return h;
};

// ─────────────────────────────────────────────
//  Core upsert (same logic for both repos)
// ─────────────────────────────────────────────

/**
 * Upsert one Question + one CompanyQuestion record.
 *
 * Repo 1 columns : ID, Title, Acceptance, Difficulty, Frequency, Leetcode Link
 * Repo 2 columns : ID, LeetcodeURL, Title, Difficulty, Acceptance%, Frequency%
 */
const upsertRow = async (row, company, timeframe, repo) => {
  let idStr, title, acceptance, difficultyRaw, frequencyRaw, leetcodeUrl;

  if (repo === 1) {
    idStr        = getVal(row, 'id');
    title        = getVal(row, 'title');
    acceptance   = getVal(row, 'acceptance');
    difficultyRaw= getVal(row, 'difficulty');
    frequencyRaw = getVal(row, 'frequency');
    leetcodeUrl = getVal(row, 'leetcode question link') ||
              getVal(row, 'leetcode link') ||
              getVal(row, 'leetcodelink') ||
              getVal(row, 'link');
  } else {
    idStr        = getVal(row, 'id');
        leetcodeUrl = getVal(row, 'url') ||
              getVal(row, 'leetcodeurl') ||
              getVal(row, 'leetcode url');
    title        = getVal(row, 'title');
    difficultyRaw= getVal(row, 'difficulty');
    acceptance   = getVal(row, 'acceptance') ||
                   getVal(row, 'acceptance%');
    frequencyRaw = getVal(row, 'frequency') ||
                   getVal(row, 'frequency%');
  }

  const leetcodeId = parseInt(idStr, 10);
  if (isNaN(leetcodeId)) return null;

  const difficulty = normalizeDifficulty(difficultyRaw);
  const frequency  = parseFloat(frequencyRaw) || 0;
  const isPremium  = !!(leetcodeUrl && leetcodeUrl.includes('premium')) ;



  // Upsert Question
  const question = await Question.findOneAndUpdate(
    { leetcodeId: Number(leetcodeId) },
    {
      leetcodeId,
      title:       title || `Question #${leetcodeId}`,
      difficulty,
      acceptance:  acceptance || '',
      leetcodeUrl: leetcodeUrl || '',
      isPremium,
      
    },
    { upsert: true, new: true, runValidators: true }
  );

  // Upsert CompanyQuestion
  await CompanyQuestion.findOneAndUpdate(
    { company, questionId: question._id, timeframe },
    { company, questionId: question._id, frequency, timeframe },
    { upsert: true, runValidators: true }
  );

  return question;
};

// ─────────────────────────────────────────────
//  REPO 1  (krishnadey30) — flat CSV files
// ─────────────────────────────────────────────

const REPO1_RAW  = 'https://raw.githubusercontent.com/krishnadey30/LeetCode-Questions-CompanyWise/master/';
const REPO1_API =
  'https://api.github.com/repos/krishnadey30/LeetCode-Questions-CompanyWise/contents/';

/** Parse "google_alltime.csv" → { company: 'google', timeframe: 'alltime' } */
const parseRepo1Filename = (name) => {
  const match = name.match(/^(.+?)_(6months|1year|2year|alltime)\.csv$/i);
  if (!match) return null;
  return { company: match[1].toLowerCase(), timeframe: match[2].toLowerCase() };
};

const seedRepo1 = async () => {
  console.log('\n── Repo 1 (krishnadey30) ──────────────────────');

  const res = await fetch(REPO1_API, { headers: githubHeaders() });
  if (!res.ok) throw new Error(`Repo1 API error: ${res.status} ${res.statusText}`);

  const items = await res.json();
  const csvFiles = items.filter(i => i.type === 'file' && i.name.toLowerCase().endsWith('.csv'));
  console.log(`Found ${csvFiles.length} CSV files in Repo 1.`);

  let totalQuestions = 0;

  for (const file of csvFiles) {
    const parsed = parseRepo1Filename(file.name);
    if (!parsed) continue;

    const { company, timeframe } = parsed;
    const url = `${REPO1_RAW}${file.name}`;

    try {
      const csvRes = await fetch(url);
      if (!csvRes.ok) {
        console.log(`  ⏭ ${file.name} skipped (${csvRes.status})`);
        continue;
      }

      const records = parse(await csvRes.text(), {
        columns: true, skip_empty_lines: true, trim: true,
      });

      let count = 0;
      for (const row of records) {
        const q = await upsertRow(row, company, timeframe, 1);
        if (q) count++;
      }

      totalQuestions += count;
      console.log(`  📁 Repo1: ${file.name} → ${count} questions`);
    } catch (err) {
      console.error(`  ❌ ${file.name}: ${err.message}`);
    }
  }

  return totalQuestions;
};

// ─────────────────────────────────────────────
//  REPO 2  (snehasishroy) — folder-based
// ─────────────────────────────────────────────

const REPO2_RAW = 'https://raw.githubusercontent.com/snehasishroy/leetcode-companywise-interview-questions/master/';
const REPO2_API = 'https://api.github.com/repos/snehasishroy/leetcode-companywise-interview-questions/contents/';

/** Map CSV filename → timeframe string */
const REPO2_TIMEFRAME_MAP = {
  'all.csv':          'alltime',
  'thirty-days.csv':  '1month',
  'three-months.csv': '3months',
  'more-than-six-months.csv': '6months',
  'six-months.csv':   '6months',
  'one-year.csv':     '1year',
};

const seedRepo2 = async () => {
  console.log('\n── Repo 2 (snehasishroy) ──────────────────────');

  const res = await fetch(REPO2_API, { headers: githubHeaders() });
  if (!res.ok) throw new Error(`Repo2 API error: ${res.status} ${res.statusText}`);

  const items = await res.json();
  const companyFolders = items.filter(i => i.type === 'dir');
  console.log(`Found ${companyFolders.length} company folders in Repo 2.`);

  let totalNew = 0;
  let totalUpdated = 0;

  for (const folder of companyFolders) {
    const company = folder.name.toLowerCase();

    try {
      const folderRes = await fetch(`${REPO2_API}${folder.name}`, { headers: githubHeaders() });
      if (!folderRes.ok) {
        console.log(`  ⏭ ${company}/ skipped (${folderRes.status})`);
        continue;
      }

      const folderItems = await folderRes.json();
      const csvFiles = folderItems.filter(
        i => i.type === 'file' && i.name.toLowerCase().endsWith('.csv')
      );

      for (const file of csvFiles) {
        const timeframe = REPO2_TIMEFRAME_MAP[file.name.toLowerCase()];
        if (!timeframe) {
          console.log(`  ⏭ ${company}/${file.name} — unknown timeframe, skipping`);
          continue;
        }

        const rawUrl = `${REPO2_RAW}${folder.name}/${file.name}`;

        try {
          const csvRes = await fetch(rawUrl);
          if (!csvRes.ok) {
            console.log(`  ⏭ ${company}/${file.name} skipped (${csvRes.status})`);
            continue;
          }

          const records = parse(await csvRes.text(), {
            columns: true, skip_empty_lines: true, trim: true,
          });

          let newCount = 0;
          let updatedCount = 0;

          for (const row of records) {
            const idStr = getVal(row, 'id');
            const leetcodeId = parseInt(idStr, 10);
            if (isNaN(leetcodeId)) continue;

            const existsBefore = await Question.exists({ leetcodeId });
            await upsertRow(row, company, timeframe, 2);

            if (existsBefore) updatedCount++;
            else newCount++;
          }

          totalNew     += newCount;
          totalUpdated += updatedCount;
          console.log(`  📁 Repo2: ${company}/${file.name} → ${newCount} new, ${updatedCount} updated`);
        } catch (err) {
          console.error(`  ❌ ${company}/${file.name}: ${err.message}`);
        }
      }
    } catch (err) {
      console.error(`  ❌ ${company}/: ${err.message}`);
    }
  }

  return { totalNew, totalUpdated };
};

// ─────────────────────────────────────────────
//  Entry point
// ─────────────────────────────────────────────

const run = async () => {
  try {
    await connectDB();
    console.log('🚀 Starting seed...\n');

    await seedRepo1();
    await seedRepo2();

    const totalQuestions = await Question.countDocuments();
    const totalCompanyQ  = await CompanyQuestion.countDocuments();

    console.log('\n==================================================');
    console.log(`🌱 Done! Questions: ${totalQuestions} | Companies: ${totalCompanyQ}`);
    console.log('==================================================');
  } catch (err) {
    console.error(`\n💥 CRITICAL — Seeding aborted: ${err.message}`);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

run();