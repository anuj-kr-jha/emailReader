process.env.TZ = 'Asia/Bahrain';
process.env.NODE_ENV = 'dev';
process.env.PORT = process.env.PORT || '4000';
process.env.HOST = '127.0.0.1';
process.env.UV_THREADPOOL_SIZE = 1;

process.env.CONCURRENCY_LIMIT = 10;

const oEnv = {
  dev: {
    BASE_URL: `http://${process.env.HOST}:${process.env.PORT}`,
  },
  prod: {
    BASE_URL: `http://${process.env.HOST}:${process.env.PORT}`,
  },
};

process.env.BASE_URL = oEnv[process.env.NODE_ENV].BASE_URL;

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

Object.keys(colors).forEach((color) => {
  Object.defineProperty(globalThis.console, color, {
    get:
      () =>
      (...args) => {
        console.log(args.map((arg) => `${colors[color]}%s${colors.reset}`).join(' '), ...args);
      },
  });
});

console.dim(`${process.env.HOST} configured as ${process.env.NODE_ENV}  < / >`);
