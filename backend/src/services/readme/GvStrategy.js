const BaseStrategy = require('./BaseStrategy');
const GVChallenge = require('../../models/GVChallenge');
const User = require('../../models/User');

class GvStrategy extends BaseStrategy {
  getContextType() {
    return 'gv';
  }

  getRepoName() {
    return 'gvishwanathan-challenge';
  }

  async getData(userId) {
    const gvDays = await GVChallenge.find({ userId }).sort({ dayNumber: 1 });
    const user = await User.findById(userId);

    return {
      gvDays,
      totalCompleted: gvDays.length,
      currentStreak: user?.streak?.current || 0,
    };
  }

  generateReadme(data, repoName) {
    const { gvDays, totalCompleted, currentStreak } = data;

    let content = `# ${repoName} – GV Challenge\n\n`;
    content += `**Total Days Completed:** ${totalCompleted}\n`;
    if (currentStreak > 0) {
      content += `**Current Streak:** ${currentStreak} day(s)\n`;
    }
    content += '\n---\n';

    for (const day of gvDays) {
      content += `\n## Day ${day.dayNumber}\n\n`;
      content += `**Question:** ${day.questionTitle}\n`;
      if (day.questionUrl) {
        content += `**URL:** ${day.questionUrl}\n`;
      }
      if (day.topic) {
        content += `**Topic:** ${day.topic}\n`;
      }
      if (day.difficulty) {
        content += `**Difficulty:** ${day.difficulty}\n`;
      }
      const dateStr = day.completedAt
        ? new Date(day.completedAt).toISOString().split('T')[0]
        : 'N/A';
      content += `**Completed:** ${dateStr}\n`;
    }
    return content;
  }
}

module.exports = GvStrategy;
