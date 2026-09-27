const BOT_LOGIN = /\[bot\]$|-bot$|^dependabot|^renovate|^github-actions/i;

const isBotAccount = (login, type) => !login || type === 'Bot' || BOT_LOGIN.test(login);

module.exports = { isBotAccount };
