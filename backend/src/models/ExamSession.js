const mongoose = require('mongoose');

const ExamSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    company: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    questions: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Question',
          required: true,
        },
        userAnswer: {
          type: String, // 'A', 'B', 'C', 'D' or empty/null
          default: null,
        },
        userCode: {
          type: String,
          default: '',
        },
        language: {
          type: String,
          default: '',
        },
        attempted: {
          type: Boolean,
          default: false,
        },
        correctAnswer: {
          type: String,
          default: '',
        },
        isCorrect: {
          type: Boolean,
          default: false,
        }
      }
    ],
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    score: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'abandoned'],
      default: 'active',
    },
    timeLimit: {
      type: Number, // in minutes
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard', 'Mixed'],
      required: true,
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ExamSession', ExamSessionSchema);
