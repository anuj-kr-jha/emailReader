require('./env');
const http = require('http');
const fs = require('fs');
const path = require('path');
// const csv = require('csv-parser');

// txt
const server = http.createServer((req, res) => {
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
