const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    passwordHash: {
      type: String,
    },
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
solvedQuestions: [
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },

    syncContext: {
      type: String,
      default: "general",
    },

    solvedAt: {
      type: Date,
      default: Date.now,
    },
  },
],
    bookmarks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
      },
    ],
    streak: {
      current: {
        type: Number,
        default: 0,
        min: 0,
      },
      lastSolvedDate: {
        type: Date,
        default: null,
      },
    },
    isOnboarded: {
      type: Boolean,
      default: false,
    },
    linkedinConnected: {
      type: Boolean,
      default: false,
    },
    linkedinProfileUrl: {
      type: String,
      default: null,
    },

    githubId: {
      type: String,
      default: null,
    },
    githubUsername: {
      type: String,
      default: null,
    },
    githubProfileUrl: {
      type: String,
      default: null,
    },
    githubRepositoryUrl: {
      type: String,
      default: null,
    },
    githubAccessToken: {
      type: String,
      default: null,
    },
    githubConnected: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Multikey index keeps syncContext-prefix filters (company_*, gv_*,
// pattern_*, general, etc.) cheap as solvedQuestions grows. The
// History → Company conversion reads only entries with syncContext
// starting with "company_"; this index makes that scan O(matching
// entries) instead of O(all solved).
UserSchema.index({ 'solvedQuestions.syncContext': 1 });

module.exports = mongoose.model('User', UserSchema);
