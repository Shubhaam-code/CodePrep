const BaseStrategy = require('./BaseStrategy');
const User = require('../../models/User');
const Question = require('../../models/Question');

class GeneralStrategy extends BaseStrategy {
  getContextType() {
    return 'general';
  }

  getRepoName() {
    return 'general-prep';
  }

  async getData(userId) {
    const user = await User.findById(userId).populate({
      path: 'solvedQuestions.questionId',
      model: 'Question',
    });

    const generalSolves = user.solvedQuestions.filter(
      (sq) =>
        sq.questionId &&
        (!sq.syncContext || sq.syncContext === 'general')
    );

    return {
      questions: generalSolves.map((sq) => sq.questionId.title).filter(Boolean),
      totalSolved: generalSolves.length,
    };
  }

  generateReadme(data, repoName) {
    const { questions, totalSolved } = data;

    let content = `# ${repoName} – General Preparation\n\n**Total Solved:** ${totalSolved}\n\n---\n`;
    for (const q of questions.sort()) {
      content += `- ${q}\n`;
    }
    return content;
  }
}

module.exports = GeneralStrategy;
