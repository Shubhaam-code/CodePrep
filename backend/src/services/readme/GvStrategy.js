const BaseStrategy = require('./BaseStrategy');
const GVChallenge = require('../../models/GVChallenge');
const User = require('../../models/User');

class GvStrategy extends BaseStrategy {
  getContextType() {
    return 'gv';
  }

  getRepoName() {
    return 'gv-challenge';
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

    let content = `# G. Vishwanathan Challenge\n\n`;
    content += `Completed:\n`;
    for (const day of gvDays) {
      content += `✔ Day ${day.dayNumber}\n`;
    }
    content += `\nCurrent Streak: ${currentStreak}\n\n`;
    content += `Total Completed: ${totalCompleted} / 86\n`;
    return content;
  }
}

module.exports = GvStrategy;
