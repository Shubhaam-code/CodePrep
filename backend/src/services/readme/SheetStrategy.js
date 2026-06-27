const BaseStrategy = require('./BaseStrategy');
const User = require('../../models/User');
const Question = require('../../models/Question');

class SheetStrategy extends BaseStrategy {
  getContextType() {
    return 'sheet';
  }

  getRepoName() {
    return 'sheet-roadmap';
  }

  async getData(userId) {
    const user = await User.findById(userId).populate({
      path: 'solvedQuestions.questionId',
      model: 'Question',
    });

    const sheetSolves = user.solvedQuestions.filter(
      (sq) =>
        sq.questionId &&
        sq.syncContext &&
        sq.syncContext.startsWith('sheet_')
    );

    const sheets = {};
    for (const sq of sheetSolves) {
      if (!sq.questionId) continue;
      const sheetSlug = sq.syncContext.replace('sheet_', '');
      if (!sheets[sheetSlug]) {
        sheets[sheetSlug] = [];
      }
      sheets[sheetSlug].push(sq.questionId.title);
    }

    return { sheets, totalSolved: sheetSolves.length };
  }

  generateReadme(data, repoName) {
    const { sheets, totalSolved } = data;

    let content = `# ${repoName} – Sheet Roadmap\n\n**Total Solved:** ${totalSolved}\n\n---\n`;
    const sortedSheets = Object.keys(sheets).sort();
    for (const s of sortedSheets) {
      const displayName = s
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      content += `\n## ${displayName}\n\n`;
      for (const qTitle of sheets[s].sort()) {
        content += `- ${qTitle}\n`;
      }
    }
    return content;
  }
}

module.exports = SheetStrategy;
