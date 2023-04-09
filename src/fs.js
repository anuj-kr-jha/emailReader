const util = require('util');
const fs = require('fs');
const access = util.promisify(fs.access);
const appendFile = util.promisify(fs.appendFile);
const writeFile = util.promisify(fs.writeFile);

async function appendToLogFileV1(lines) {
  const filePath = 'log.csv';

  try {
    // Check if the file exists
    await access(filePath);

    // If the file exists, append the new lines
    await appendFile(filePath, '\n' + lines.join('\n'));
    console.log('Data appended to log.csv');
  } catch (error) {
    // If the file does not exist, create it and write the new lines
    if (error.code === 'ENOENT') {
      await writeFile(filePath, lines.join('\n'));
      console.log('log.csv created and data written');
    } else {
      console.error('Error:', error);
    }
  }
}

async function appendToLogFile(lines) {
  const filePath = 'log.csv';

  // Function to append lines to the file with retries
  async function appendWithRetry() {
    try {
      const stream = fs.createWriteStream(filePath, { flags: 'a' });
      stream.write(lines.join('\n') + '\n', () => {
        stream.end();
        console.green('Data appended to log.csv');
      });
    } catch (error) {
      if (error.code === 'EBUSY') {
        console.red('File is locked. Retrying...');
        setTimeout(appendWithRetry, 1000); // Retry after 1 second
      } else if (error.code === 'ENOENT') {
        // If the file does not exist, create it and try appending again
        fs.writeFileSync(filePath, '');
        console.green('log.csv created');
        setTimeout(appendWithRetry, 1000); // Retry after 1 second
      } else {
        console.error('Error:', error);
      }
    }
  }

  // Call the appendWithRetry function
  await appendWithRetry();
}

module.exports = { appendToLogFile };
