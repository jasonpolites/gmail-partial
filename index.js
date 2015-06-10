"use strict";

var fs = require('fs');
var GmailPartial = require('./GmailPartial');

// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  var gp = new GmailPartial(); 
  gp.authorize(JSON.parse(content));
});

