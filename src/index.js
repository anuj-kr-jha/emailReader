const { initialize } = require('./lib/http');
initialize().then(() => {
  const { connectToImap } = require('./lib/imap');
  connectToImap();
});
