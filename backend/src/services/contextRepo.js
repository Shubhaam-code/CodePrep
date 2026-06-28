/**
 * Central mapping from a learning context (company / GV challenge / pattern
 * roadmap / sheet roadmap) to the dedicated GitHub repository where
 * solutions for that context should be pushed.
 *
 * Each learning context owns its own repository so solutions from different
 * surfaces are never mixed. The default (`company-preparation`) is kept for
 * the historical "general company prep" flows so existing connected users
 * do not lose access to previously-pushed solutions.
 */
const REPOS = {
  company: 'CodePrep-Companies',
  gv:      'CodePrep-GV-Challenge',
  pattern: 'CodePrep-DSA-Patterns',
  sheet:   'sheet-roadmap',
  general: 'general-prep',
};

/**
 * Decide which repository should hold the solution for a given submission.
 *
 * @param {object} opts
 * @param {string|null} [opts.company]   - Company name (e.g. "google")
 * @param {string|null} [opts.challenge] - Challenge tag (e.g. "gv")
 * @param {string|null} [opts.pattern]   - DSA pattern slug
 * @param {string|null} [opts.sheet]     - Sheet slug
 * @param {string|null} [opts.syncContext] - syncContext already computed
 *                                          (e.g. "gv_day3", "company_google")
 * @returns {{ repo: string, context: string }}
 */
const resolveRepoForContext = ({ company, challenge, pattern, sheet, syncContext } = {}) => {
  // Highest-priority first: explicit challenge tag (GV) wins over company
  // even if both are supplied, matching the existing file-path behavior.
  if (challenge === 'gv') {
    return { repo: REPOS.gv, context: 'gv' };
  }
  if (pattern) {
    return { repo: REPOS.pattern, context: 'pattern' };
  }
  if (sheet) {
    return { repo: REPOS.sheet, context: 'sheet' };
  }
  if (company) {
    return { repo: REPOS.company, context: 'company' };
  }

  // Fall back to inspecting the syncContext token itself when the caller
  // did not break out individual fields.
  if (syncContext) {
    if (syncContext.startsWith('gv_day')) return { repo: REPOS.gv, context: 'gv' };
    if (syncContext.startsWith('pattern_')) return { repo: REPOS.pattern, context: 'pattern' };
    if (syncContext.startsWith('sheet_'))   return { repo: REPOS.sheet,   context: 'sheet'   };
    if (syncContext.startsWith('company_')) return { repo: REPOS.company, context: 'company' };
  }

  return { repo: REPOS.general, context: 'general' };
};

module.exports = {
  REPOS,
  resolveRepoForContext,
};
