const User = require('../models/User');

/**
 * Updates the user's lastActive timestamp if it's the first time
 * or if they have been inactive for more than 15 minutes.
 * @param {string} userId 
 */
const updateLastActive = async (userId) => {
  if (!userId) return;
  try {
    const user = await User.findById(userId).select('lastActive');
    if (!user) return;

    const now = new Date();
    const threshold = 15 * 60 * 1000; // 15 minutes

    if (!user.lastActive || (now - new Date(user.lastActive)) > threshold) {
      await User.updateOne({ _id: userId }, { lastActive: now });
      console.log(`[ActivityService] Updated lastActive for user ${userId} to ${now.toISOString()}`);
    }
  } catch (err) {
    console.error(`[ActivityService] Error updating lastActive for user ${userId}:`, err.message);
  }
};

module.exports = {
  updateLastActive,
};
