var GmailPartial = require('../GmailPartial');
var expect = require("chai").expect;

describe('GmailPartial', function() {

    describe('findFirstAttachment()', function() {

        var instance = new GmailPartial();
        var sample_data = {
            "id": "14dd3ffa0b85900d",
            "threadId": "14dd3f89d989b3b8",
            "labelIds": ["INBOX", "IMPORTANT", "CATEGORY_PERSONAL"],
            "payload": {
                "mimeType": "message/partial",
                "filename": "",
                "headers": [{
                    "name": "Return-Path",
                    "value": "<noreply+presidio-color@google.com>"
                }, {
                    "name": "Subject",
                    "value": "Message from \"presidio-color.corp.google.com\" part 1/2"
                }, {
                    "name": "From",
                    "value": "noreply+presidio-color@google.com"
                }, {
                    "name": "To",
                    "value": "jplts@google.com"
                }, {
                    "name": "Date",
                    "value": "Mon, 8 Jun 2015 09:27:28 -0700"
                }, {
                    "name": "Message-Id",
                    "value": "<20150608092721WD.DCSML-S000630001.00267396D985@corp.google.com>"
                }, {
                    "name": "MIME-Version",
                    "value": "1.0"
                }, {
                    "name": "Content-Type",
                    "value": "message/partial; id=\"TAN_U_P<1433780837.00267396d985>\"; number=1; total=2"
                }],
                "body": {
                    "size": 0
                },
                "parts": [{
                    "mimeType": "multipart/mixed",
                    "filename": "",
                    "headers": [{
                        "name": "From",
                        "value": "noreply+presidio-color@google.com"
                    }, {
                        "name": "Subject",
                        "value": "Message from \"presidio-color.corp.google.com\""
                    }, {
                        "name": "To",
                        "value": "jplts@google.com"
                    }, {
                        "name": "Date",
                        "value": "Mon, 8 Jun 2015 09:27:28 -0700"
                    }, {
                        "name": "Message-Id",
                        "value": "<20150608092721WD.DCSML-S000630000.00267396D985@corp.google.com>"
                    }, {
                        "name": "MIME-Version",
                        "value": "1.0"
                    }, {
                        "name": "Content-Type",
                        "value": "multipart/mixed; boundary=\"DC_BOUND_PRE_<1433780837.00267396d985>\""
                    }],
                    "body": {
                        "size": 0
                    },
                    "parts": [{
                        "partId": "0.0",
                        "mimeType": "text/plain",
                        "filename": "",
                        "headers": [{
                            "name": "Content-Type",
                            "value": "text/plain; charset=US-ASCII"
                        }, {
                            "name": "Content-Transfer-Encoding",
                            "value": "7bit"
                        }],
                        "body": {
                            "size": 163,
                            "data": "VGhpcyBFLW1haWwgd2FzIHNlbnQgZnJvbSAicHJlc2lkaW8tY29sb3IuY29ycC5nb29nbGUuY29tIiAoTVAgQzQ1MDMpLg0KDQpTY2FuIERhdGU6IDA2LjA4LjIwMTUgMDk6Mjc6MTcgKC0wNzAwKQ0KUXVlcmllcyB0bzogbm9yZXBseStwcmVzaWRpby1jb2xvckBnb29nbGUuY29tDQoNCg=="
                        }
                    }, {
                        "partId": "0.1",
                        "mimeType": "application/pdf",
                        "filename": "20150608092717737.pdf",
                        "headers": [{
                            "name": "Content-Type",
                            "value": "application/pdf; name=\"20150608092717737.pdf\""
                        }, {
                            "name": "Content-Transfer-Encoding",
                            "value": "base64"
                        }, {
                            "name": "Content-Disposition",
                            "value": "attachment; filename=\"20150608092717737.pdf\""
                        }],
                        "body": {
                            "attachmentId": "foobar",
                            "size": 2094868
                        }
                    }]
                }]
            },
            "sizeEstimate": 2099502
        };

        it('should find the first attachment in a part tree', function() {
            var result = instance.findFirstAttachment(sample_data.payload.parts);

            expect(result).to.exist;
            expect(result.filename).to.exist;
            expect(result.id).to.exist;
            expect(result.filename).to.equal('20150608092717737.pdf');
            expect(result.id).to.equal('foobar');
        });
    });

    describe('findFirstAttachment()', function() {

        var instance = new GmailPartial();
        var sample_data = {
                "id": "14dd3ffa3ad6e6e4",
                "threadId": "14dd3f8a5ed0a2bd",
                "labelIds": ["INBOX", "IMPORTANT", "CATEGORY_PERSONAL"],
                "snippet": "rBbEgAdipbJQngkHAxwcGRzHc9rKM90D+suz76wWxIAHYoPa31aLvP4vDx7Oc1gmf+B/f/dI eWC2JAA7FB7WqqO8854NRn+",
                "historyId": "3568867",
                "payload": {
                    "mimeType": "message/partial",
                    "filename": "",
                    "headers": [{
                        "name": "Delivered-To",
                        "value": "jplts@google.com"
                    }, {
                        "name": "Subject",
                        "value": "Message from \"presidio-color.corp.google.com\" part 2/2"
                    }, {
                        "name": "Date",
                        "value": "Mon, 8 Jun 2015 09:27:28 -0700"
                    }, {
                        "name": "Message-Id",
                        "value": "<20150608092721WD.DCSML-S000630002.00267396D985@corp.google.com>"
                    }, {
                        "name": "MIME-Version",
                        "value": "1.0"
                    }, {
                        "name": "Content-Type",
                        "value": "message/partial; id=\"TAN_U_P<1433780837.00267396d985>\"; number=2; total=2"
                    }],
                    "body": {
                        "size": 0
                    },
                    "parts": [{
                        "partId": "0",
                        "mimeType": "text/plain",
                        "filename": "",
                        "body": {
                            "size": 247800,
                            "data": "foobar"
                        }
                    }]
                },
                "sizeEstimate": 251553
            };

        it('should find body data for the first text part', function() {
            var result = instance.findFirstTextPartData(sample_data);
            expect(result).to.exist;
            expect(result).to.equal('foobar');
        });            
    });

});