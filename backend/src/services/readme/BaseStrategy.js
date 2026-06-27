class BaseStrategy {
  getContextType() {
    throw new Error('Not implemented: getContextType() must return the context type string');
  }

  getRepoName() {
    throw new Error('Not implemented: getRepoName() must return the repository name');
  }

  async getData(_userId) {
    throw new Error('Not implemented: getData(userId) must return repo-scoped data');
  }

  generateReadme(_data, _repoName) {
    throw new Error('Not implemented: generateReadme(data, repoName) must return README markdown');
  }
}

module.exports = BaseStrategy;
