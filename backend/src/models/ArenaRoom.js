const mongoose = require('mongoose');

const ArenaRoomSchema = new mongoose.Schema(
  {
    roomCode: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    player1: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      username: String,
      ready: { type: Boolean, default: false },
      socketId: String,
      connected: { type: Boolean, default: false }
    },
    player2: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      username: String,
      ready: { type: Boolean, default: false },
      socketId: String,
      connected: { type: Boolean, default: false }
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Medium'
    },
    status: {
      type: String,
      enum: ['waiting', 'ready', 'countdown', 'active', 'finished'],
      default: 'waiting'
    },
    winnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    playersSubmitted: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        submissionTime: Date,
        runtime: Number,
        memory: Number,
        code: String,
        language: String
      }
    ],
    startedAt: Date
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ArenaRoom', ArenaRoomSchema);
