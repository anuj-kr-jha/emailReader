const { initialize } = require('./lib/http');
initialize().then(() => require('./lib/readMail'));
