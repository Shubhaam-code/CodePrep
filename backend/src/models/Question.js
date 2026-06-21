const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema(
  {
    leetcodeId: {
      type: Number,
      required: [true, 'LeetCode ID is required'],
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Question title is required'],
      trim: true,
    },
    difficulty: {
      type: String,
      required: [true, 'Difficulty is required'],
      enum: {
        values: ['Easy', 'Medium', 'Hard'],
        message: '{VALUE} is not a valid difficulty. Must be Easy, Medium, or Hard.',
      },
    },
    acceptance: {
      type: String,
      trim: true,
    },
    leetcodeUrl: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Question', QuestionSchema);
