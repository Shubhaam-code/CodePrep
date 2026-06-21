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
 * Fetches, parses, and seeds a single CSV file.
 * @returns {Promise<number>} - Count of seeded questions
 */
const seedCSVFile = async (filename, company, timeframe) => {
  const url = `https://raw.githubusercontent.com/krishnadey30/LeetCode-Questions-CompanyWise/master/${filename}`;

  try {
    const response = await fetch(url);

    if (response.status === 404) {
      console.log(`Seeding ${company}_${timeframe}... ⏭ skipped (not found)`);
      return 0;
    }

    if (!response.ok) {
      console.error(`Seeding ${company}_${timeframe}... ❌ failed (Status: ${response.status})`);
      return 0;
    }

    const csvText = await response.text();
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    let upsertedCount = 0;

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

      // 1. Upsert Question details
      const question = await Question.findOneAndUpdate(
        { leetcodeId },
        {
          title: title || `Question #${leetcodeId}`,
          difficulty,
          acceptance: acceptance || '',
          leetcodeUrl: leetcodeUrl || ''
        },
        { upsert: true, new: true, runValidators: true }
      );

      // 2. Upsert CompanyQuestion details
      await CompanyQuestion.findOneAndUpdate(
        {
          company,
          questionId: question._id,
          timeframe
        },
        { frequency },
        { upsert: true, runValidators: true }
      );

      upsertedCount++;
    }

    console.log(`✅ ${company}_${timeframe} → ${upsertedCount} questions`);
    return upsertedCount;
  } catch (error) {
    console.error(`Seeding ${company}_${timeframe}... ❌ failed error: ${error.message}`);
    return 0;
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

    // Fetch the list of files inside the repository contents using GitHub contents API
    const res = await fetch('https://api.github.com/repos/krishnadey30/LeetCode-Questions-CompanyWise/contents/', {
      headers: {
        'User-Agent': 'node-fetch'
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch repo contents: ${res.statusText} (${res.status})`);
    }

    const items = await res.json();
    
    // Filter files that are .csv
    const csvFiles = items.filter(
      (item) => item.type === 'file' && item.name.toLowerCase().endsWith('.csv')
    );

    console.log(`Found ${csvFiles.length} CSV files in the repository. Starting seeding...`);

    let totalQuestions = 0;
    const uniqueCompanies = new Set();

    for (const file of csvFiles) {
      const filename = file.name;
      // Parse filename to extract company + timeframe: e.g. goldman-sachs_6months.csv
      const match = filename.match(/^(.+)_(6months|1year|2year|alltime)\.csv$/i);
      
      if (!match) {
        continue;
      }

      const company = match[1].toLowerCase();
      const timeframe = match[2].toLowerCase();

      uniqueCompanies.add(company);

      // Seed this file
      const questionsCount = await seedCSVFile(filename, company, timeframe);
      totalQuestions += questionsCount;
    }

    console.log('\n==================================================');
    console.log(`Total companies seeded: ${uniqueCompanies.size}`);
    console.log(`Total questions seeded: ${totalQuestions}`);
    console.log('🌱 Seeding complete!');
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
