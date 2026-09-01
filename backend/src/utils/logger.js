const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};
const configuredLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
const threshold = LEVELS[configuredLevel] !== undefined ? LEVELS[configuredLevel] : LEVELS.info;

const serializeError = error => {
  if (!(error instanceof Error)) return error;
  const out = { message: error.message };
  if (error.name) out.name = error.name;
  if (error.stack) out.stack = error.stack;
  if (error.code !== undefined) out.code = error.code;
  if (error.status !== undefined) out.status = error.status;
  if (error.response) {
    out.response = {
      status: error.response.status,
      data: error.response.data
    };
  }
  return out;
};

const write = (level, args) => {
  if ((LEVELS[level] ?? LEVELS.info) < threshold) return;
  const record = {
    level: level.toUpperCase(),
    time: new Date().toISOString()
  };
  let message = [];
  for (const arg of args) {
    if (typeof arg === 'string') {
      message.push(arg);
    } else if (arg instanceof Error) {
      record.detail = serializeError(arg);
    } else if (arg !== undefined) {
      try {
        record.detail = JSON.parse(JSON.stringify(arg, (key, value) => (typeof value === 'bigint' ? value.toString() : value)));
      } catch {
        record.detail = String(arg);
      }
    }
  }
  if (message.length > 0) {
    record.message = message.join(' ');
  }
  const line = JSON.stringify(record);
  if (level === 'error' || level === 'warn') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
};

module.exports = {
  debug: (...args) => write('debug', args),
  info: (...args) => write('info', args),
  warn: (...args) => write('warn', args),
  error: (...args) => write('error', args)
};
