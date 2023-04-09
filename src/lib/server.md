// csv
const \_server = http.createServer((req, res) => {
// Set response headers
res.setHeader('Content-Type', 'text/csv');
res.setHeader('Content-Disposition', 'attachment; filename="log.csv"');

// Read the file and pipe it to the response
const fileName = path.join(\_\_dirname, `../../log.csv`);
const stream = fs.createReadStream(fileName);
stream.pipe(res);
});

// json {header}
const \_\_\_server = http.createServer((req, res) => {
// Set response headers
res.setHeader('Content-Type', 'application/json');
res.setHeader('Content-Disposition', 'inline; filename="log.json"');

// Parse the CSV file and send its content as a JSON array in chunks in the response
const fileName = path.join(\_\_dirname, `../../log.csv`);
const stream = fs.createReadStream(fileName);
stream
.pipe(csv())
.on('data', (data) => {
// Convert each row to a JSON string and send it as a chunk
const jsonData = JSON.stringify(data);
res.write(jsonData);
})
.on('end', () => res.end());
});
