const { initialize } = require('./lib/http');
initialize().then(() => {
  const { connectToImap, disconnect } = require('./lib/imap');
  connectToImap();
});
