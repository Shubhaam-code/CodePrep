const mongoose = require('mongoose');

const GVChallengeCacheSchema = new mongoose.Schema({
  questions: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
  cachedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('GVChallengeCache', GVChallengeCacheSchema);
