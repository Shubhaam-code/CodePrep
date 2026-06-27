const CompanyStrategy = require('./CompanyStrategy');
const DsaStrategy = require('./DsaStrategy');
const GvStrategy = require('./GvStrategy');
const GeneralStrategy = require('./GeneralStrategy');
const SheetStrategy = require('./SheetStrategy');

const _strategies = [
  new CompanyStrategy(),
  new DsaStrategy(),
  new GvStrategy(),
  new GeneralStrategy(),
  new SheetStrategy(),
];

const _registry = {};
for (const s of _strategies) {
  _registry[s.getRepoName()] = s;
}

function getReadmeGenerator(repoName) {
  const strategy = _registry[repoName];
  if (!strategy) {
    throw new Error(`No README generator registered for repository: ${repoName}`);
  }
  return strategy;
}

function getAllGenerators() {
  return _strategies;
}

module.exports = { getReadmeGenerator, getAllGenerators };
