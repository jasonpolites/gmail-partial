"use strict";

var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var gmail = google.gmail('v1');
var mimelib = require("mimelib");
var googleAuth = require('google-auth-library');
var SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'gmail-api-quickstart.json';

var GmailPartial = function() {}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
GmailPartial.prototype.authorize = function(credentials) {
    var self = this;
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
            self.findMessagePartialEmail(oauth2Client, null, 0, 10, {});
        }
    });
};

GmailPartial.prototype.getNewToken = function(oauth2Client, callback) {
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
};

GmailPartial.prototype.storeToken = function(token) {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token));
    // console.log('Token stored to ' + TOKEN_PATH);
};

GmailPartial.prototype.findMessagePartialEmail = function(auth, token, index, max, results) {
    console.log('Searching page ' + (index + 1) + " of " + max + "...");
    var self = this;
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
                }, function(err, m) {
                    if (m.payload.headers) {
                        var ct = m.payload.headers[0];

                        var contentType = mimelib.parseHeaderLine(ct['value']);

                        if (contentType['defaultValue'] === 'message/partial') {

                            var partId = contentType['id'];
                            var result = results[partId];

                            if (!result) {
                                result = {
                                    count: parseInt(contentType['total']),
                                    segments: []
                                }
                                results[partId] = result;
                            }

                            result['partId'] = partId;
                            result['segments'][parseInt(contentType['number']) - 1] = m.id;
                            found++;
                        }
                    }

                    if (--remaining == 0) {
                        if (++index < max && token) {
                            if (found > 0) {
                                console.log("Found " + found + " matches!");
                            } else {
                                console.log("No results");
                            }

                            self.findMessagePartialEmail(auth, token, index, max, results);
                        } else {
                            // Next step
                            self.getPartialMessages(auth, results);
                        }
                    }
                }, this);
            }
        }
    });
};

GmailPartial.prototype.getPartialMessages = function(auth, results) {

    var self = this;

    for (var key in results) {

        var result = results[key];
        var segments = result['segments'];

        console.log("File: " + key + " is spread across messages " + segments);

        for (var i = 0; i < segments.length; ++i) {

            var messageId = segments[i];

            if (!messageId) {
                // console.log("Messages missing for document " + result['partId'] + ", skipping.");
                break;
            }

            self.getPartialMessage(auth, messageId, i, function(index, data) {
                if(index == 0) {
                    if (data) {
                        // We have an attachment!... as expected :p
                        console.log(data.filename);
                    } else {
                        console.log("No attachment found for document " + result['partId'] + ", skipping.");
                    }
                } else {
                    if (data) {
                        console.log(data.length);
                    } else {
                        console.log("No body found for document " + result['partId'] + " at index " + index + ", skipping.");
                    }
                }
            });
        }
    }
};

GmailPartial.prototype.getPartialMessage = function(auth, messageId, index, callback) {
    var self = this;
    gmail.users.messages.get({
        auth: auth,
        id: messageId,
        userId: 'me'
    }, function(err, m) {
        // console.log(JSON.stringify(m));
        console.log("Processing attachment segment " + messageId + " at index " + index);

        if (index == 0) {
            // First segment, look for attachment
            if (m.payload && m.payload.parts) {
                // Look for the attachment (assume there is only one)
                var attachment = self.findFirstAttachment(m.payload.parts);
                callback(index, attachment);
            }

        } else {
            // Assume body is encoded part
            // console.log(JSON.stringify(m.payload.));
            callback(index, self.findFirstTextPartData(m))
        }
    });
};


GmailPartial.prototype.findFirstTextPartData = function(message) {
    var self = this;
    if (message && message.payload && message.payload.parts) {
        for (var p = 0; p < message.payload.parts.length; ++p) {
            var part = message.payload.parts[p];
            if (part.mimeType === 'text/plain' && part.body.data) {
                return part.body.data;
            }
        }
    }
    return null;
};

GmailPartial.prototype.findFirstAttachment = function(parts) {
    var self = this;
    if (parts) {
        for (var p = 0; p < parts.length; ++p) {
            var part = parts[p];
            if (part.headers && part.headers.length) {
                for (var h = 0; h < part.headers.length; ++h) {
                    var header = part.headers[h];
                    if (header['name'] === 'Content-Disposition') {
                        if (header['value'].indexOf('attachment') === 0) {
                            // This is the attachment
                            return {
                                filename: part['filename'],
                                id: part['body']['attachmentId'],
                            };
                        }
                    }
                }
            }

            if (part.parts) {
                return self.findFirstAttachment(part.parts);
            }
        }
    }
    return null;
};


module.exports = GmailPartial;