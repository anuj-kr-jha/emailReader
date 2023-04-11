const Imap = require('imap');
const cheerio = require('cheerio');
const { extractPayload } = require('./extractMail');

const markSeen = true;
let isConnected = false;
let reconnectScheduled = false;

const imapConfig = {
  user: 'bulliontradersssi@gmail.com',
  password: 'tgweffrdkjbpsiep',
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
  connTimeout: 30000, // Connection timeout in milliseconds, default is 10000
  authTimeout: 20000, // Authentication timeout in milliseconds, default is 5000
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
      return console.cyan(`${new Date().toLocaleString()} Email recieved from "${mailContent.from}" subject: "${mailContent.subject}". no need to process as non-mandatory 'from'`);
    if (!mailContent.subject.toLowerCase().includes('trade'))
      return console.cyan(
        `${new Date().toLocaleString()} Email recieved from "${mailContent.from}" subject: "${mailContent.subject}". no need to process as non-mandatory 'subject'`
      );
    else console.blue(`${new Date().toLocaleString()} Email recieved from: "${mailContent.from}" subject: "${mailContent.subject}"`);
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

      // Mark the message as seen if markSeen is true
      //   if (markSeen) {
      //     imap.addFlags(mailContent.uid, '\\SEEN', (err) => {
      //       if (err) {
      //         console.error('Error marking message as seen:', err);
      //       } else {
      //         console.log('Message marked as seen:', mailContent.uid);
      //       }
      //     });
      //   }
    }
  });
}

function handleConnectionEvent(eventType, err) {
  if (reconnectScheduled) {
    return;
  }

  if (eventType === 'error') {
    console.error(new Date().toLocaleString(), 'IMAP Error:', err);
    isConnected = false;
    if (err.source === 'socket') {
      console.log(new Date().toLocaleString(), 'Attempting to reconnect...');
      reconnectScheduled = true;
      imap.end(); // Forcefully disconnect before reconnecting
      setTimeout(() => {
        reconnectScheduled = false;
        connectToImap();
      }, 5000); // Reconnect after 5 seconds
    }
  } else if (eventType === 'end') {
    console.error(`${new Date().toLocaleString()} IMAP connection ended`);
    isConnected = false;
    console.log(`${new Date().toLocaleString()} Attempting to reconnect...`);
    reconnectScheduled = true;
    setTimeout(() => {
      reconnectScheduled = false;
      imap.removeAllListeners(); // Remove all listeners before disconnecting
      connectToImap();
    }, 5000); // Reconnect after 5 seconds
  }
}

function setupListeners() {
  const fetchUnreadOptions = {
    bodies: ['HEADER', 'TEXT'],
    markSeen: markSeen,
  };

  if (!imap.eventNames().includes('ready'))
    imap.on('ready', function () {
      console.dim(`${new Date().toLocaleString()} ready`);
      isConnected = true;
      openInbox(function (err, box) {
        console.dim(`${new Date().toLocaleString()} openInbox`);
        if (err) throw err;

        // Fetch unread emails
        imap.search(['UNSEEN'], function (err, results) {
          try {
            if (err) throw err;
            const f = imap.fetch(results, fetchUnreadOptions);
            if (!f.eventNames().includes('message')) f.on('message', processMessage);
          } catch (e) {
            if (e && e.message !== 'Nothing to fetch') {
              console.red(e);
            }
          }
        });

        // Fetch new emails
        if (!imap.eventNames().includes('mail'))
          imap.on('mail', function (numNewMsgs) {
            const f = imap.seq.fetch(box.messages.total + ':*', fetchUnreadOptions);
            if (!f.eventNames().includes('message'))
              f.on('message', (msg, seqno) => {
                if (box.messages.new) processMessage(msg, seqno);
              });
          });
      });
    });

  if (!imap.eventNames().includes('error'))
    imap.on('error', (err) => {
      handleConnectionEvent('error', err);
    });

  if (!imap.eventNames().includes('end'))
    imap.on('end', () => {
      handleConnectionEvent('end');
    });
}

function connectToImap() {
  if (!isConnected) {
    setupListeners(); // Set up the listeners before connecting
    imap.connect();
  }
}

function disconnect() {
  if (isConnected) {
    // imap.removeAllListeners(); // Remove all listeners before disconnecting
    imap.end();
  }
}

// setupListeners();

module.exports = { connectToImap, disconnect, isConnected: () => isConnected };

/*

```
Connection ended
Error: Error: This socket has been ended by the other party
    at Socket.writeAfterFIN [as write] (net.js:455:14)
    at JSStreamSocket.doWrite (internal/js_stream_socket.js:170:19)
    at JSStream.onwrite (internal/js_stream_socket.js:28:57)
    at TLSSocket.Socket._final (net.js:418:28)
    at callFinal (_stream_writable.js:609:10)
    at processTicksAndRejections (internal/process/task_queues.js:84:21) {
  code: 'EPIPE',
  source: 'socket'
}
```

*/
