const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const fetch = require('node-fetch');
const { parse } = require('csv-parse/sync');
const connectDB = require('../config/db');
const Question = require('../models/Question');
const CompanyQuestion = require('../models/CompanyQuestion');
const mongoose = require('mongoose');

/**
 * Case-insensitive value retriever from CSV row object.
 */
const getValCaseInsensitive = (row, keyPattern) => {
  const keys = Object.keys(row);
  const normalizedPattern = keyPattern.toLowerCase().replace(/[^a-z0-9]/g, '');
  const foundKey = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedPattern);
  return foundKey ? row[foundKey] : undefined;
};

/**
 * Normalizes difficulty value.
 */
const normalizeDifficulty = (diff) => {
  if (!diff) return 'Easy';
  const d = diff.trim().toLowerCase();
  if (d === 'easy') return 'Easy';
  if (d === 'medium') return 'Medium';
  if (d === 'hard') return 'Hard';
  return diff.charAt(0).toUpperCase() + diff.slice(1).toLowerCase();
};

/**
 * Fetches, parses, and seeds a single CSV file from a given repository.
 * @returns {Promise<{ total: number, newCount: number, duplicatesSkipped: number }>}
 */
const seedCSVFile = async (filename, repoUrl, company, timeframe, repoLabel, processedSet) => {
  const url = `${repoUrl}${filename}`;

  try {
    const response = await fetch(url);

    if (response.status === 404) {
      console.log(`Seeding ${company}_${timeframe} (${repoLabel})... ⏭ skipped (not found)`);
      return { total: 0, newCount: 0, duplicatesSkipped: 0 };
    }

    if (!response.ok) {
      console.error(`Seeding ${company}_${timeframe} (${repoLabel})... ❌ failed (Status: ${response.status})`);
      return { total: 0, newCount: 0, duplicatesSkipped: 0 };
    }

    const csvText = await response.text();
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    let newCount = 0;
    let duplicatesSkipped = 0;
    let totalQuestions = 0;

    for (const row of records) {
      const idStr = getValCaseInsensitive(row, 'id');
      const title = getValCaseInsensitive(row, 'title');
      const acceptance = getValCaseInsensitive(row, 'acceptance');
      const difficultyRaw = getValCaseInsensitive(row, 'difficulty');
      const frequencyRaw = getValCaseInsensitive(row, 'frequency');
      const leetcodeUrl = getValCaseInsensitive(row, 'leetcodequestionlink') || 
                          getValCaseInsensitive(row, 'leetcodeurl') || 
                          getValCaseInsensitive(row, 'link');

      const leetcodeId = parseInt(idStr, 10);
      if (isNaN(leetcodeId)) {
        continue;
      }

      const difficulty = normalizeDifficulty(difficultyRaw);
      const frequency = parseFloat(frequencyRaw) || 0;

      // 5. Detect premium questions
      const isPremium = !!(leetcodeUrl && leetcodeUrl.includes('/premium')) || leetcodeId >= 1500;

      const processedKey = `${company}_${leetcodeId}_${timeframe}`;

      if (repoLabel === 'repo2') {
        if (processedSet.has(processedKey)) {
          duplicatesSkipped++;
          continue;
        } else {
          processedSet.add(processedKey);
          newCount++;
        }
      } else {
        processedSet.add(processedKey);
        totalQuestions++;
      }

      const slug = (title || `Question #${leetcodeId}`).toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '-');

      const gfgUrl = `https://www.geeksforgeeks.org/problems/${slug}`;
      const neetcodeUrl = `https://neetcode.io/problems/${slug}`;
      const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent((title || `Question #${leetcodeId}`) + ' leetcode solution')}`;

      // Upsert Question details
      const question = await Question.findOneAndUpdate(
        { leetcodeId },
        {
          title: title || `Question #${leetcodeId}`,
          difficulty,
          acceptance: acceptance || '',
          leetcodeUrl: leetcodeUrl || '',
          isPremium,
          gfgUrl,
          neetcodeUrl,
          youtubeUrl
        },
        { upsert: true, new: true, runValidators: true }
      );

      // Upsert CompanyQuestion details
      await CompanyQuestion.findOneAndUpdate(
        {
          company,
          questionId: question._id,
          timeframe
        },
        { frequency },
        { upsert: true, runValidators: true }
      );
    }

    if (repoLabel === 'repo1') {
      console.log(`✅ ${company}_${timeframe} (repo1) → ${totalQuestions} questions`);
    } else {
      console.log(`✅ ${company}_${timeframe} (repo2) → ${newCount} new, ${duplicatesSkipped} duplicates skipped`);
    }

    return { total: totalQuestions, newCount, duplicatesSkipped };
  } catch (error) {
    console.error(`Seeding ${company}_${timeframe} (${repoLabel})... ❌ failed error: ${error.message}`);
    return { total: 0, newCount: 0, duplicatesSkipped: 0 };
  }
};

/**
 * Main seeding execution function.
 */
const run = async () => {
  try {
    // Establish DB Connection
    await connectDB();
    console.log('Fetching files list from GitHub repository contents API...');

    const headers = { 'User-Agent': 'node-fetch' };
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    // 1. Fetch ALL filenames from both repos via GitHub API
    const res1 = await fetch('https://api.github.com/repos/krishnadey30/LeetCode-Questions-CompanyWise/contents/', { headers });
    if (!res1.ok) {
      throw new Error(`Failed to fetch repo1 contents: ${res1.statusText} (${res1.status})`);
    }
    const items1 = await res1.json();

    const res2 = await fetch('https://api.github.com/repos/snehasishroy/leetcode-companywise-interview-questions/contents/', { headers });
    if (!res2.ok) {
      throw new Error(`Failed to fetch repo2 contents: ${res2.statusText} (${res2.status})`);
    }
    const items2 = await res2.json();

    // 2. Filter only .csv files
    const csvFiles1 = items1.filter(
      (item) => item.type === 'file' && item.name.toLowerCase().endsWith('.csv')
    );
    const csvFiles2 = items2.filter(
      (item) => item.type === 'file' && item.name.toLowerCase().endsWith('.csv')
    );

    console.log(`Found ${csvFiles1.length} CSV files in Repo 1, and ${csvFiles2.length} CSV files in Repo 2.`);

    const processedSet = new Set();
    const uniqueCompanies = new Set();

    // Process REPO 1
    for (const file of csvFiles1) {
      const filename = file.name;
      // 3. Parse company + timeframe from filename
      const match = filename.match(/^(.+)_(6months|1year|2year|alltime)\.csv$/i);
      if (!match) continue;

      const company = match[1].toLowerCase();
      const timeframe = match[2].toLowerCase();

      uniqueCompanies.add(company);

      // 4. Fetch, parse, and upsert
      await seedCSVFile(
        filename,
        'https://raw.githubusercontent.com/krishnadey30/LeetCode-Questions-CompanyWise/master/',
        company,
        timeframe,
        'repo1',
        processedSet
      );
    }

    // Process REPO 2
    for (const file of csvFiles2) {
      const filename = file.name;
      // 3. Parse company + timeframe from filename
      const match = filename.match(/^(.+)_(6months|1year|2year|alltime)\.csv$/i);
      if (!match) continue;

      const company = match[1].toLowerCase();
      const timeframe = match[2].toLowerCase();

      uniqueCompanies.add(company);

      // 4. Fetch, parse, and upsert
      await seedCSVFile(
        filename,
        'https://raw.githubusercontent.com/snehasishroy/leetcode-companywise-interview-questions/main/',
        company,
        timeframe,
        'repo2',
        processedSet
      );
    }

    // 7. Log total and complete status
    const totalQuestions = await Question.countDocuments();
    console.log('\n==================================================');
    console.log(`🌱 Total: ${totalQuestions} questions, ${uniqueCompanies.size} companies`);
    console.log('==================================================');
  } catch (error) {
    console.error(`CRITICAL: Seeding aborted: ${error.message}`);
  } finally {
    // Close the mongoose connection
    await mongoose.connection.close();
    process.exit(0);
  }
};

run();
