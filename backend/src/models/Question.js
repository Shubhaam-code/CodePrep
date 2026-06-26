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
    isPremium: {
      type: Boolean,
      default: false,
    },

    // ── Roadmap fields (all optional) ─────────────────────────────────
    // These tag a Question onto the DSA Pattern Roadmap without
    // creating a second collection. They are intentionally optional
    // so existing Questions (and every other flow that writes to
    // this model — Company, GV, Extension) keep working unchanged.
    //
    //   • roadmapCategory  — the high-level group, e.g. "arrays_hashing"
    //   • roadmapPattern   — the technique slug, e.g. "two_pointers"
    //   • roadmapOrder     — display position within (category, pattern)
    //   • patternOrder     — reserved for a future ordering axis at the
    //                        pattern level (kept separate from
    //                        roadmapOrder so the roadmap can change its
    //                        ordering without rewriting the data).
    roadmapCategory: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      index: true,
    },
    roadmapPattern: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      index: true,
    },
    roadmapOrder: {
      type: Number,
      default: null,
      min: 0,
    },
    patternOrder: {
      type: Number,
      default: null,
      min: 0,
    },

  },
  {
    timestamps: true,
  }
);

// Compound index for the most common Roadmap query — "give me every
// Question in this (category, pattern), sorted by roadmapOrder".
QuestionSchema.index({
  roadmapCategory: 1,
  roadmapPattern: 1,
  roadmapOrder: 1,
});

module.exports = mongoose.model('Question', QuestionSchema);
