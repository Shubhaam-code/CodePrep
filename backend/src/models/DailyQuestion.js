const mongoose = require('mongoose');

const DailyQuestionSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    date: {
      type: String, // format YYYY-MM-DD
      required: true,
      unique: true,
      index: true,
    },
    solvedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ]
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('DailyQuestion', DailyQuestionSchema);
