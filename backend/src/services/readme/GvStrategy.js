const BaseStrategy = require('./BaseStrategy');
const GVChallenge = require('../../models/GVChallenge');
const User = require('../../models/User');
const GVChallengeCache = require('../../models/GVChallengeCache');

class GvStrategy extends BaseStrategy {
  getContextType() {
    return 'gv';
  }

  getRepoName() {
    return 'CodePrep-GV-Challenge';
  }

  async getData(userId) {
    const gvDays = await GVChallenge.find({ userId }).sort({ dayNumber: 1 });
    const user = await User.findById(userId);

    // Fetch challenge questions
    let gvQuestions = [];
    try {
      const cached = await GVChallengeCache.findOne().sort({ cachedAt: -1 });
      if (cached && cached.questions) {
        gvQuestions = cached.questions;
      }
    } catch (err) {
      console.error('Error fetching GVChallengeCache inside GvStrategy:', err.message);
    }

    return {
      gvDays,
      totalCompleted: gvDays.length,
      currentStreak: user?.streak?.current || 0,
      gvQuestions,
    };
  }

  generateReadme(data, repoName) {
    const { gvDays, totalCompleted, currentStreak, gvQuestions } = data;
    const totalQuestions = gvQuestions.length || 86;
    const completionPct = totalQuestions > 0 ? Math.round((totalCompleted / totalQuestions) * 100) : 0;

    let content = `# G. Vishwanathan Challenge\n\n`;
    content += `## 📊 Challenge Progress\n\n`;
    content += `- **Solved Count:** ${totalCompleted} / ${totalQuestions}\n`;
    content += `- **Completion Percentage:** ${completionPct}%\n`;
    content += `- **Current Streak:** ${currentStreak} days\n\n`;
    content += `## 📅 Daily Log\n\n`;

    const completedDaysSet = new Set(gvDays.map((d) => d.dayNumber));
    
    if (gvQuestions && gvQuestions.length > 0) {
      const sortedQuestions = [...gvQuestions].sort((a, b) => a.dayNumber - b.dayNumber);
      for (const q of sortedQuestions) {
        const isSolved = completedDaysSet.has(q.dayNumber);
        content += `- [${isSolved ? 'x' : ' '}] Day ${q.dayNumber}: ${q.title}\n`;
      }
    } else {
      // Fallback if cache is empty
      for (let day = 1; day <= 86; day++) {
        const isSolved = completedDaysSet.has(day);
        const dayRecord = gvDays.find(d => d.dayNumber === day);
        const qTitle = dayRecord ? dayRecord.questionTitle : `Challenge Day ${day}`;
        content += `- [${isSolved ? 'x' : ' '}] Day ${day}: ${qTitle}\n`;
      }
    }

    return content;
  }
}

module.exports = GvStrategy;
