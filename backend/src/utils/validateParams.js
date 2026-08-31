const OWNER_NAME = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/;
const REPO_NAME = /^[A-Za-z0-9._-]+$/;
const POSITIVE_INT = /^[1-9]\d*$/;

function isValidOwner(value) {
  return typeof value === 'string' && OWNER_NAME.test(value) && !value.includes('..');
}

function isValidRepo(value) {
  return typeof value === 'string' && REPO_NAME.test(value) && !value.includes('..');
}

function isValidNumber(value) {
  return typeof value === 'string' && POSITIVE_INT.test(value);
}

function isValidState(value) {
  return value === 'open' || value === 'closed' || value === 'all';
}

module.exports = {
  isValidOwner,
  isValidRepo,
  isValidNumber,
  isValidState
};
