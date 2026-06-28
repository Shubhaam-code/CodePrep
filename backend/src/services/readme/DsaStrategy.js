const BaseStrategy = require('./BaseStrategy');
const User = require('../../models/User');
const Question = require('../../models/Question');

class DsaStrategy extends BaseStrategy {
  getContextType() {
    return 'pattern';
  }

  getRepoName() {
    return 'CodePrep-DSA-Patterns';
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

    // Get all Questions in database that belong to the DSA Patterns roadmap
    const allRoadmapQuestions = await Question.find({ roadmapPattern: { $ne: null } }).select('title roadmapPattern').lean();
    const totalQuestions = allRoadmapQuestions.length;

    const patternsProgress = {};
    for (const q of allRoadmapQuestions) {
      const slug = q.roadmapPattern;
      if (!patternsProgress[slug]) {
        patternsProgress[slug] = {
          total: 0,
          solved: 0,
          questions: [],
        };
      }
      patternsProgress[slug].total += 1;

      const isSolved = patternSolves.some(
        (ps) => ps.questionId._id.toString() === q._id.toString() && ps.patternSlug === slug
      );
      if (isSolved) {
        patternsProgress[slug].solved += 1;
      }

      patternsProgress[slug].questions.push({
        title: q.title,
        solved: isSolved,
      });
    }

    return {
      patternsProgress,
      totalSolved: patternSolves.length,
      totalQuestions,
    };
  }

  generateReadme(data, repoName) {
    const { patternsProgress, totalSolved, totalQuestions } = data;
    const completionPct = totalQuestions > 0 ? Math.round((totalSolved / totalQuestions) * 100) : 0;

    let content = `# ${repoName} – DSA Patterns\n\n`;
    content += `## 📊 Overall Progress\n\n`;
    content += `- **Solved Count:** ${totalSolved} / ${totalQuestions}\n`;
    content += `- **Completion Percentage:** ${completionPct}%\n\n`;
    content += `## 📂 Patterns Progress\n\n`;

    const sortedPatterns = Object.keys(patternsProgress).sort();
    for (const slug of sortedPatterns) {
      const p = patternsProgress[slug];
      const displayName = slug
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      const pct = p.total > 0 ? Math.round((p.solved / p.total) * 100) : 0;
      content += `### ${displayName} (${p.solved} / ${p.total} - ${pct}%)\n`;
      const sortedQs = [...p.questions].sort((a, b) => a.title.localeCompare(b.title));
      for (const q of sortedQs) {
        content += `- [${q.solved ? 'x' : ' '}] ${q.title}\n`;
      }
      content += `\n`;
    }
    return content;
  }
}

module.exports = DsaStrategy;
