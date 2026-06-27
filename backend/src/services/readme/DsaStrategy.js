const BaseStrategy = require('./BaseStrategy');
const User = require('../../models/User');
const Question = require('../../models/Question');

class DsaStrategy extends BaseStrategy {
  getContextType() {
    return 'pattern';
  }

  getRepoName() {
    return 'DSA-Patterns';
  }

  async getData(userId) {
    const user = await User.findById(userId).populate({
      path: 'solvedQuestions.questionId',
      model: 'Question',
    });

    const patternSolves = [];
    const seen = new Set();

    for (const sq of user.solvedQuestions) {
      if (!sq.questionId) continue;
      
      let patternSlug = null;
      if (sq.syncContext && sq.syncContext.startsWith('pattern_')) {
        patternSlug = sq.syncContext.replace('pattern_', '');
      } else if (sq.questionId.roadmapPattern) {
        patternSlug = sq.questionId.roadmapPattern;
      }

      if (patternSlug) {
        const key = `${sq.questionId._id.toString()}_${patternSlug}`;
        if (!seen.has(key)) {
          seen.add(key);
          patternSolves.push({
            questionId: sq.questionId,
            patternSlug
          });
        }
      }
    }

    const patterns = {};
    for (const ps of patternSolves) {
      const patternSlug = ps.patternSlug;
      if (!patterns[patternSlug]) {
        patterns[patternSlug] = [];
      }
      patterns[patternSlug].push(ps.questionId.title);
    }

    return { patterns, totalSolved: patternSolves.length };
  }

  generateReadme(data, repoName) {
    const { patterns, totalSolved } = data;

    let content = `# ${repoName} – DSA Patterns\n\n**Total Solved:** ${totalSolved}\n\n---\n`;
    const sortedPatterns = Object.keys(patterns).sort();
    for (const p of sortedPatterns) {
      const displayName = p
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      content += `\n## ${displayName}\n\n`;
      for (const qTitle of patterns[p].sort()) {
        content += `- ${qTitle}\n`;
      }
    }
    return content;
  }
}

module.exports = DsaStrategy;
