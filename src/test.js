function extractTradeIds(input) {
  const regex = /ID#(\S+)/;
  const match = input.match(regex);

  if (match && match[1]) {
    return match[1];
  } else {
    return null;
  }
}
const arr = [
  'Action Taken: Trade ID#7187-OB Opened Buy Position at Market ($2012.5)',
  'Action Taken: Trade ID#787-OSB Opened Buy Position at Market ($2012.5)',
  'Action Taken: Trade ID#78asd87-OsB Opened Buy Position at Market ($2012.5)',
];
const tradeIds = arr.map((x) => extractTradeIds(x));
console.log(tradeIds); // it should Output: ["7187-OB", "787-OSB", "7asd87-OsB"]
