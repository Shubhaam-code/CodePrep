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
          ref: 'Question',
          required: true,
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
    githubConnected: {
      type: Boolean,
      default: false,
    },
    githubUsername: {
      type: String,
      default: null,
    },
    githubProfileUrl: {
      type: String,
      default: null,
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

module.exports = mongoose.model('User', UserSchema);
