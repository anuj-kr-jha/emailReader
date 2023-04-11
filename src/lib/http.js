require('./env');
const http = require('http');
const fs = require('fs');
const path = require('path');
// const csv = require('csv-parser');
const { isConnected, disconnect } = require('./imap');
// txt
const server = http.createServer((req, res) => {
  if (req.url === '/end') {
    const imapConnected = isConnected();
    res.setHeader('Content-Type', 'text/plain');
    if (imapConnected) disconnect();
    res.end('disconnected');
    return;
  }
  if (req.url === '/status') {
    const imapConnected = isConnected();
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ imapConnected }));
    return;
  }
  if (req.url === '/health') {
    const fileName = path.join(__dirname, `../view/index.html`);
    // Serve the index.html file when the root path is requested
    res.setHeader('Content-Type', 'text/html');
    fs.createReadStream(fileName).pipe(res);
    return;
  }
  if (req.url === '/logs/err') {
    const fileName = path.join(__dirname, `../../logs/err.log`);
    // Serve the index.html file when the root path is requested
    res.setHeader('Content-Type', 'text/plain');
    fs.createReadStream(fileName).pipe(res);
    return;
  }
  if (req.url === '/logs/out') {
    const fileName = path.join(__dirname, `../../logs/out.log`);
    // Serve the index.html file when the root path is requested
    res.setHeader('Content-Type', 'text/plain');
    fs.createReadStream(fileName).pipe(res);
    return;
  }
  if (req.url === '/health') {
    const fileName = path.join(__dirname, `../view/index.html`);
    // Serve the index.html file when the root path is requested
    res.setHeader('Content-Type', 'text/html');
    fs.createReadStream(fileName).pipe(res);
    return;
  }
  // Set response headers
  res.setHeader('Content-Type', 'text/plain');

  // Read the file and send its content as a string in the response
  const fileName = path.join(__dirname, `../../log.csv`);
  const stream = fs.createReadStream(fileName);

  stream.on('data', (chunk) => {
    // Pause the stream if the response buffer is full
    if (!res.write(chunk)) {
      stream.pause();
    }
  });

  // Resume the stream when the response buffer is drained
  res.on('drain', () => {
    stream.resume();
  });

  stream.on('end', () => {
    res.end();
  });

  stream.on('error', (err) => {
    console.error('Error reading file:', err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  });
});

async function initialize() {
  return new Promise((resolve) => {
    server.listen(process.env.PORT, () => {
      console.dim(`Server running at http://localhost:${process.env.PORT}/`);
      const fileName = path.join(__dirname, `../../log.csv`);
      const fileData = '';
      fs.open(fileName, 'wx', (err, fd) => {
        if (err) {
          if (err.code === 'EEXIST') {
            console.dim(`File ${fileName} already exists`);
            resolve();
            return;
          }
          throw err;
        }
        // Write data to the file
        fs.writeFile(fd, fileData, (err) => {
          if (err) throw err;
          console.dim(`File ${fileName} created with data: ${fileData}`);
          fs.close(fd, (err) => {
            if (err) throw err;
            return resolve();
          });
          resolve();
        });
      });
    });
  });
}

module.exports = { initialize };
