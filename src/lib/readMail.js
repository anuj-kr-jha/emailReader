const { appendToLogFile } = require('./fs');

const Imap = require('imap');
const cheerio = require('cheerio');

const markSeen = true;

const imapConfig = {
  user: 'bulliontradersssi@gmail.com',
  password: 'tgweffrdkjbpsiep',
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
};

const imap = new Imap(imapConfig);

function openInbox(callback) {
  imap.openBox('INBOX', false, callback);
}

function processMessage(msg, seqno) {
  const mailContent = {};

  msg.on('attributes', function (attrs) {
    mailContent.uid = attrs.uid;
  });

  msg.on('body', function (stream, info) {
    let buffer = '';
    stream.on('data', function (chunk) {
      buffer += chunk.toString('utf8');
    });

    stream.once('end', function () {
      if (info.which.startsWith('HEADER')) {
        const header = Imap.parseHeader(buffer);
        mailContent.subject = header.subject ? header.subject[0] : '';
        mailContent.date = header.date ? header.date[0] : '';
        mailContent.from = header.from ? header.from[0] : '';
        mailContent.to = header.to ? header.to[0] : '';
      } else if (info.which.includes('TEXT')) {
        const htmlRegex = /Content-Type: text\/html; charset=\"(?:UTF-8|us-ascii)\"([\s\S]*?)--\w{16}/; // /Content-Type: text\/html; charset=\"UTF-8\"([\s\S]*?)--\w{16}/;

        const textRegex =
          /Content-Type: text\/plain; charset=\"(?:UTF-8|us-ascii)\"[\s\S]*?Content-Transfer-Encoding: 7bit\r\n\r\n([\s\S]*?)(?:\r\n--===============|Content-Type:)/;

        const htmlMatch = buffer.match(htmlRegex);
        const textMatch = buffer.match(textRegex);

        if (htmlMatch) {
          // mailContent.body = htmlMatch[1].trim();
          const $ = cheerio.load(htmlMatch[1].trim());
          mailContent.body = $('body').text().trim();
        } else if (textMatch) {
          mailContent.body = textMatch[1].trim();
        }
      }
    });
  });

  msg.once('end', function () {
    console.magenta('#############################################################');
    // filters
    if (!mailContent.from.includes('support@thegoldsentimentreport.com'))
      return console.cyan(`Email recieved from "${mailContent.from}" subject: "${mailContent.subject}". no need to process as non-mandatory 'from'`);
    if (!mailContent.subject.toLowerCase().includes('trade'))
      return console.cyan(`Email recieved from "${mailContent.from}" subject: "${mailContent.subject}". no need to process as non-mandatory 'subject'`);
    else console.blue(`Email recieved from: "${mailContent.from}" subject: "${mailContent.subject}"`);
    if (mailContent.body) {
      const splittedLines = mailContent.body
        .replace(/=C2=A0/g, ' ')
        .replace(/=3D/g, '=')
        .replace(/\t/g, ' ')
        .replace(/\r/g, '')
        .trim()
        .split('\n')
        .filter((x) => x);

      const result = [];
      const order = null;

      extractPayload(mailContent.subject, splittedLines, mailContent.body);

      // for (const para of mailContent.body) {
      //   if (para.startsWith('Action Taken:')) {
      //   }
      // }
      // Save JSON file
      // const fileName = `email_${mailContent.uid}_${Date.now()}.json`;
      // fs.writeFileSync(fileName, JSON.stringify(mailContent, null, 2));
      // console.green(`Email saved to ${fileName}`);
    }
  });
}

imap.once('ready', function () {
  console.dim(`ready`);
  openInbox(function (err, box) {
    console.dim(`openInbox`);
    if (err) throw err;

    // Fetch unread emails
    const fetchUnreadOptions = {
      bodies: ['HEADER', 'TEXT'],
      markSeen: markSeen,
    };
    imap.search(['UNSEEN'], function (err, results) {
      try {
        if (err) throw err;
        const f = imap.fetch(results, fetchUnreadOptions);
        f.on('message', processMessage);
      } catch (e) {
        if (e && e.message !== 'Nothing to fetch') {
          console.red(e);
        }
      }
    });

    // Listen for new emails
    imap.on('mail', function (numNewMsgs) {
      const fetchOptions = {
        bodies: ['HEADER', 'TEXT'],
        markSeen: markSeen,
      };

      const f = imap.seq.fetch(box.messages.total + ':*', fetchOptions);
      f.on('message', processMessage);
    });
  });
});

imap.once('error', function (err) {
  console.red('Error:', err);
});

imap.once('end', function () {
  console.red('Connection ended');
});

imap.connect();

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
