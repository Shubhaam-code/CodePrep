const mongoose = require('mongoose');

const CompanyQuestionSchema = new mongoose.Schema(
  {
    company: {
      type: String,
      required: [true, 'Company name is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: [true, 'Question ID reference is required'],
    },
    frequency: {
      type: Number,
      required: [true, 'Frequency is required'],
      default: 0,
      min: [0, 'Frequency cannot be negative'],
    },
    timeframe: {
      type: String,
      required: [true, 'Timeframe is required'],
      enum: {
        values: ['1month', '3months', '6months', '1year', '2year', 'alltime'],
        message: '{VALUE} is not a valid timeframe. Must be 1month, 3months, 6months, 1year, 2year, or alltime.',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee uniqueness of a question's frequency record for a company and timeframe
CompanyQuestionSchema.index({ company: 1, questionId: 1, timeframe: 1 }, { unique: true });

module.exports = mongoose.model('CompanyQuestion', CompanyQuestionSchema);
