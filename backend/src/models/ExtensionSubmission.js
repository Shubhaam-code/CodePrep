const mongoose = require('mongoose');

const ExtensionSubmissionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Question title is required'],
      trim: true,
    },
    url: {
      type: String,
      required: [true, 'Question URL is required'],
      unique: true, // Prevent duplicate entries for the same question URL
      index: true,
      trim: true,
    },
    difficulty: {
      type: String,
      required: [true, 'Difficulty is required'],
      trim: true,
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      trim: true,
    },
    language: {
      type: String,
      required: [true, 'Language is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Code content is required'],
    },
    source: {
      type: String,
      required: [true, 'Source is required'],
      default: 'leetcode-extension',
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }
);

module.exports = mongoose.model('ExtensionSubmission', ExtensionSubmissionSchema);
