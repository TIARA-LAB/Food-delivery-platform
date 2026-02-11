const logLevels = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const currentLevel = process.env.NODE_ENV === 'production' ? logLevels.INFO : logLevels.DEBUG;

const format = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const entry = { timestamp, level, message };
  if (data) entry.data = data;
  return JSON.stringify(entry);
};

export const logError = (message, data = null) => {
  if (logLevels.ERROR <= currentLevel) {
    console.error(format('ERROR', message, data));
  }
};

export const logWarn = (message, data = null) => {
  if (logLevels.WARN <= currentLevel) {
    console.warn(format('WARN', message, data));
  }
};

export const logInfo = (message, data = null) => {
  if (logLevels.INFO <= currentLevel) {
    console.info(format('INFO', message, data));
  }
};

export const logDebug = (message, data = null) => {
  if (logLevels.DEBUG <= currentLevel) {
    console.debug(format('DEBUG', message, data));
  }
};
