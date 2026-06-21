const mongoose = require('mongoose');

const ArenaMatchSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    opponentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    opponentName: {
      type: String,
      required: true
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    questionTitle: {
      type: String,
      required: true
    },
    result: {
      type: String,
      enum: ['win', 'loss'],
      required: true
    },
    runtime: {
      type: Number,
      default: 0
    },
    memory: {
      type: Number,
      default: 0
    },
    date: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ArenaMatch', ArenaMatchSchema);
