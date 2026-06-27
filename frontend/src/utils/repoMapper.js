const REPO_DISPLAY_NAMES = {
  'company-preparation': 'Company Preparation',
  'general-prep': 'DSA Patterns',
  'gvishwanathan-challenge': 'GVishwanathan Challenge'
};

/**
 * Maps an internal repository slug to a user-friendly display name.
 * Falls back to capitalization of the slug if not in the map.
 * @param {string} slug 
 * @returns {string}
 */
export function getRepoDisplayName(slug) {
  if (!slug) return '';
  if (REPO_DISPLAY_NAMES[slug]) {
    return REPO_DISPLAY_NAMES[slug];
  }
  // Fallback: capitalize words and replace dashes with spaces
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
