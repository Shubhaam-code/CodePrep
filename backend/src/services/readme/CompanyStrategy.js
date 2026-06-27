const BaseStrategy = require('./BaseStrategy');
const User = require('../../models/User');

class CompanyStrategy extends BaseStrategy {
  getContextType() {
    return 'company';
  }

  getRepoName() {
    return 'company-preparation';
  }

  async getData(userId) {
    const user = await User.findById(userId).populate({
      path: 'solvedQuestions.questionId',
      model: 'Question',
    });

    const companySolves = user.solvedQuestions.filter(
      (sq) =>
        sq.questionId &&
        (!sq.syncContext ||
          sq.syncContext === 'general' ||
          sq.syncContext.startsWith('company_'))
    );

    return {
      companySolves,
      totalSolved: companySolves.length,
    };
  }

  generateReadme(data, repoName) {
    const { companySolves, totalSolved } = data;

    const companyMap = {};

    for (const sq of companySolves) {
      if (!sq.questionId) continue;
      const ctx = sq.syncContext || 'general';
      
      let companyName;
      if (ctx.startsWith('company_')) {
        const rawCompany = ctx.replace('company_', '');
        companyName = rawCompany.charAt(0).toUpperCase() + rawCompany.slice(1).toLowerCase();
      } else {
        companyName = 'General';
      }

      if (!companyMap[companyName]) {
        companyMap[companyName] = new Set();
      }
      companyMap[companyName].add(sq.questionId.title);
    }

    let content = `# ${repoName} – Company Preparation\n\n**Total Solved:** ${totalSolved}\n\n---\n`;
    const sortedCompanies = Object.keys(companyMap).sort();
    for (const comp of sortedCompanies) {
      content += `\n## ${comp}\n\n`;
      for (const qTitle of Array.from(companyMap[comp]).sort()) {
        content += `- ${qTitle}\n`;
      }
    }
    return content;
  }
}

module.exports = CompanyStrategy;
