const mongoose = require('mongoose');

/**
 * Backfill the `company` field on old Submission documents that don't have it.
 * Looks up CompanyQuestion by questionId to determine the company name.
 * Falls back to 'general' if no CompanyQuestion match is found.
 */
const migrateSubmissionsCompany = async () => {
  try {
    const Submission = require('../models/Submission');
    const CompanyQuestion = require('../models/CompanyQuestion');

    // Find submissions missing the company field
    const submissionsToMigrate = await Submission.find({
      $or: [{ company: null }, { company: { $exists: false } }]
    }).select('_id questionId');

    if (submissionsToMigrate.length === 0) {
      console.log('Migration: No submissions need company backfill.');
      return;
    }

    console.log(`Migration: Backfilling company on ${submissionsToMigrate.length} old submission(s)...`);

    let updated = 0;
    for (const sub of submissionsToMigrate) {
      const companyQuestion = await CompanyQuestion.findOne({ questionId: sub.questionId });
      const company = companyQuestion ? companyQuestion.company.toLowerCase().trim() : 'general';
      await Submission.updateOne({ _id: sub._id }, { $set: { company } });
      updated++;
    }

    console.log(`Migration: Successfully backfilled company on ${updated} submission(s).`);
  } catch (error) {
    console.error('Migration: Error backfilling submission company:', error.message);
  }
};

/**
 * Establishes connection to MongoDB using setting from MONGODB_URI environment variable.
 */
const connectDB = async () => {
  try {
    const connUri = process.env.MONGODB_URI;
    if (!connUri) {
      throw new Error('MONGODB_URI environment variable is not defined.');
    }

    await mongoose.connect(connUri);
    console.log('MongoDB Connected');

    // Run one-time migration for old submissions
    await migrateSubmissionsCompany();
  } catch (error) {
    console.error('Database Connection Error:', error.message);
    process.exit(1);
  }
};

// Handle connection errors after initial connection
mongoose.connection.on('error', (err) => {
  console.error(`MongoDB error: ${err}`);
});

module.exports = connectDB;

