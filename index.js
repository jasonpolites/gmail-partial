var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var gmail = google.gmail('v1');
var mimelib = require("mimelib");
var googleAuth = require('google-auth-library');
var MailParser = require("mailparser").MailParser;
var SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'gmail-api-quickstart.json';

// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Gmail API.
  authorize(JSON.parse(content), findMessagePartialEmail);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client, null, 0, 10, {});
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });

  require('child_process').spawn('open', [authUrl]);

  // console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Authenticate in the browser, then enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listLabels(auth) {
  
  gmail.users.labels.list({
    auth: auth,
    userId: 'me',
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var labels = response.labels;
    if (labels.length == 0) {
      console.log('No labels found.');
    } else {
      console.log('Labels:');
      for (var i = 0; i < labels.length; i++) {
        var label = labels[i];
        console.log('- %s', label.name);
      }
    }
  });
}


function findMessagePartialEmail(auth, token, index, max, results) {
  console.log('Searching page ' + (index+1) + " of " + max + "...");

  var remaining = 0;
  gmail.users.messages.list({
      auth: auth,
      userId: 'me',
      pageToken: token
    }, function(err, response) {
      if (err) {
        console.log('The API returned an error: ' + err);
        return;
      }
      var messages = response.messages;

      token = response.nextPageToken;

      if (messages.length == 0) {
        console.log('No messages found.');
      } else {
        remaining = messages.length;
        var found = 0;
        for (var i = 0; i < messages.length; i++) {
          var message = messages[i];
          gmail.users.messages.get({
            auth: auth,
            id: message.id,
            userId: 'me',
            labelIds: 'INBOX',
            format: 'metadata',
            metadataHeaders: 'Content-Type',
            q: 'from:presidio'
          },
          function(err, m) {
            if(m.payload.headers) {
              var ct = m.payload.headers[0];

              var contentType = mimelib.parseHeaderLine(ct['value']);

              if(contentType['defaultValue'] === 'message/partial') {

                var partId = contentType['id'];
                var result = results[partId];

                if(!result) {
                  result = {
                     count: parseInt(contentType['total']),
                     segments: []
                  }
                  results[partId] = result;
                }

                result['partId'] = partId;
                result['segments'][parseInt(contentType['number'])-1] = m.id;
                found++;
              }
            }

            if(--remaining == 0) {
              if(++index < max && token) {
                if(found > 0) {
                  console.log("Found " + found + " matches!");
                } else {
                  console.log("No results");
                }

                findMessagePartialEmail(auth, token, index, max, results);
              } else {

                // Next step
                getPartialMessages(auth, results);
              }
            }  
          });
        }
      }
    });
}

function getPartialMessages(auth, results) {

    console.log(JSON.stringify(results));

    for (key in results) {

        var result = results[key];
        var segments = result['segments'];

        for(var i = 0; i < segments.length; ++i) {
          var messageId = segments[i];

          if(!messageId) {
            console.log("Messages missing for document " + result['partId'] + ", skipping.");
            break;
          }

          gmail.users.messages.get({
            auth: auth,
            id: messageId,
            userId: 'me'
          }, function(err, m){

              // console.log(JSON.stringify(m));

              if(i == 0) {
                // First part, look for attachment
                // console.log("Has payload: " + (m.payload != null));
                
                if(m.payload && m.payload.parts) {
                  // console.log("Has parts");

                   // console.log(JSON.stringify(m.payload.parts));

                  // Look for the attachment (assume there is only one)
                  var parts = m.payload.parts;
                  var attachment = null;

                  for(var p = 0; p < parts.length; ++p) {
                    var part = parts[p];

                    for(var h = 0; h < part.headers.length; ++h) {
                      if(h['name'] === 'Content-Disposition') {
                        if(h['value'].indexOf('attachment') === 0) {
                          // This is the attachment
                          attachment = {
                            filename: part['filename'],
                            id: part['body']['attachmentId']
                          };
                        }
                      }
                    }
                  }

                  if(attachment) {
                    console.log(attachment.filename);
                  } else {
                    console.log("No attachment found for document " + result['partId'] + ", skipping.");
                  }
                }
              } else {
                // Assume body is encoded part
                console.log('Second part')
              }              

              // var mailparser = new MailParser({
              //   streamAttachments: true,
              //   defaultCharset: 'UTF-8'
              // });

              // mailparser.on("end", function(mail){



              //     console.log(mail.subject);
              // });

              // mailparser.write(m['raw']);
              // mailparser.end();

          });
        }
    }
}

