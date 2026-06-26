const mongoose = require('mongoose');

/**
 * RoadmapPattern
 *
 * One row per DSA pattern on the Pattern Roadmap. Drives the
 * `/api/roadmap/patterns` endpoint and the lock-state on the Roadmap
 * page. Questions live in the existing `Question` collection and are
 * linked by their `roadmapCategory` + `roadmapPattern` fields — this
 * collection only stores pattern-level metadata.
 *
 *   • category            — high-level group, e.g. "arrays_hashing"
 *   • pattern             — technique slug, e.g. "two_pointers"
 *   • order               — display order at the pattern level
 *   • estimatedTime       — minutes (drives the "Estimated Time" card)
 *   • description         — optional one-liner shown on the Roadmap UI
 *   • isLockedByDefault   — when true, the pattern is gated until the
 *                           user solves the previous one. The Roadmap
 *                           UI flips the first pattern in display
 *                           order to unlocked; everything else follows
 *                           isLockedByDefault. (User-specific unlock
 *                           progress will move into a separate
 *                           collection when that lands; out of scope
 *                           for this task.)
 */
const RoadmapPatternSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, 'category is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    pattern: {
      type: String,
      required: [true, 'pattern is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    order: {
      type: Number,
      required: [true, 'order is required'],
      min: [0, 'order cannot be negative'],
      default: 0,
    },
    estimatedTime: {
      type: Number,
      required: [true, 'estimatedTime is required'],
      min: [0, 'estimatedTime cannot be negative'],
      default: 0,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isLockedByDefault: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// A given (category, pattern) tuple can only be defined once.
RoadmapPatternSchema.index({ category: 1, pattern: 1 }, { unique: true });

module.exports = mongoose.model('RoadmapPattern', RoadmapPatternSchema);