const { appendToLogFile } = require('./fs');

function findAllActionTakenIndexes(arr) {
  const indexes = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].startsWith('Action Taken:')) {
      indexes.push(i);
    }
  }
  return indexes;
}

function splitArrayOnActionTakenIndexes(arr) {
  const indexes = findAllActionTakenIndexes(arr);
  if (indexes.length < 1) return [];
  else if (indexes.length == 1) return [arr.slice(indexes[0])];
  const result = [];
  for (let i = 0; i < indexes.length; i++) {
    if (i == indexes[indexes.length - 1]) {
      result.push(arr.slice(indexes[i]));
    } else {
      result.push(arr.slice(indexes[i], indexes[i + 1]));
    }
  }
  return result;
}

function extractAmountFromActionTaken(input) {
  const regex = /\(\$([\d]+(\.[\d]+)?)\)/;
  const match = input.match(regex);

  if (match && match[1]) {
    return parseFloat(match[1]);
  } else {
    return null;
  }
}

function extractActionType(input) {
  if (/Opened Buy Position/.test(input)) {
    return { action: 'OPEN_BUY', action_code: 'OB' };
  } else if (/Opened Sell Position/.test(input)) {
    return { action: 'OPEN_SELL', action_code: 'OS' };
  } else if (/Closed Half Sell Position/.test(input) || /Closed Half Buy Position/.test(input)) {
    return { action: 'PARTIAL_CLOSE', action_code: 'CH' };
  } else if (/Closed Sell Position/.test(input) || /Closed Buy Position/.test(input)) {
    return { action: 'FULL_CLOSE', action_code: 'C' };
  } else {
    return { action: null, action_code: null };
  }
}

function extractTradeID(input) {
  const regex = /ID#(\S+)/;
  const match = input.match(regex);

  if (match && match[1]) {
    return match[1];
  } else {
    return null;
  }
}

function extractGainLoss(input) {
  const regex = /\$(\S+)/;
  const match = input.match(regex);

  if (match) {
    return match[1]; // Output: "2023-04-06 09:00:19 GMT"
  } else {
    return null;
  }
}
function extractDateType(input) {
  const regex = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} GMT/;
  const match = input.match(regex);

  if (match) {
    return match[0]; // Output: "2023-04-06 09:00:19 GMT"
  } else {
    return null;
  }
}

/**
 *
 * @param {string} _subject
 * @param {string[]} _body
 */
function extractPayload(_subject, _body, _originalContent) {
  let dataString = '';
  const result = [];
  const actionsBodyList = splitArrayOnActionTakenIndexes(_body);
  for (const actionsBody of actionsBodyList) {
    if (!actionsBody.length) continue;
    let amount = null;
    let action = null;
    let action_code = null;
    let trade_id = null;
    if (actionsBody[0].startsWith('Action Taken:')) {
      amount = extractAmountFromActionTaken(actionsBody[0]);
      ({ action, action_code } = extractActionType(actionsBody[0]));
      //
      if (actionsBody[0].includes('Trade ID#')) {
        trade_id = extractTradeID(actionsBody[0]);
      } else {
        const currentAction = actionsBody.find((para) => para.includes(`-${action_code}`));
        if (currentAction) {
          trade_id = extractTradeID(currentAction);
          if (!dataString) dataString = extractDateType(currentAction);
        }
      }
    }
    //
    const gainLossPara = actionsBody.find((x) => x.includes(`Gain/Loss`));
    const gainLoss = gainLossPara ? extractGainLoss(gainLossPara) : null;
    const [date, time, tz] = dataString.split(' ');
    // result.push({ action, trade_id: parseInt(trade_id, 10), action_code, amount, date, time, tz, gainLoss });
    result.push({ action, trade_id: parseInt(trade_id, 10), amount, date, time, tz, gainLoss });
  }
  console.magenta('------------------------ BODY --------------------------------');
  console.dim(_originalContent);
  const stringifiedResult = result.map((x) => Object.values(x).join(','));
  console.magenta('-------------------- EXTRACTED DATA --------------------------');
  console.yellow(stringifiedResult);
  appendToLogFile(stringifiedResult);
}

module.exports = { extractPayload };
