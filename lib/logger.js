var winston = require('winston');

module.exports = winston;

// https://github.com/winstonjs/winston

winston.loggers.add('paypal', {
  console: {
    level: 'verbose',
    colorize: true,
    label: 'paypal',
    debugStdout: true,
  }
});