const mongoose = require('mongoose');

const GVChallengeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    dayNumber: {
      type: Number,
      required: true,
    },
    questionTitle: {
      type: String,
      required: true,
    },
    questionUrl: {
      type: String,
      required: true,
    },
    solution: {
      type: String,
      default: '',
    },
    language: {
      type: String,
      default: '',
    },
    topic: {
      type: String,
      default: '',
    },
    difficulty: {
      type: String,
      default: '',
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
    linkedinPosted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GVChallenge', GVChallengeSchema);
