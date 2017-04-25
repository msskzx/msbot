var express = require("express");
var request = require("request");
var bodyParser = require("body-parser");

const msAPI = 'http://35.160.199.92:8080'

var app = express();
app.set('port', process.env.PORT || 5000);
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());

app.get("/webhook", function(req, res) {
    if (req.query["hub.verify_token"] === process.env.VERIFY_TOKEN) {
        res.status(200).send(req.query["hub.challenge"]);
    } else {
        res.sendStatus(403);
    }
});

app.post("/webhook", function(req, res) {
    if (req.body.object == "page") {
        req.body.entry.forEach(function(entry) {
            entry.messaging.forEach(function(event) {
                if (event.postback) {
                    processPostback(event);
                } else if (event.message) {
                    processMessage(event);
                }
            });
        });
        res.sendStatus(200);
    }
});

// 404 for any other route
app.use(function(req, res, next) {
    if (!res.headersSent) {
        res.status(404).json({
            status: 'fail',
            message: 'Not found'
        });
    }
    next();
});

function processPostback(event) {
    var senderID = event.sender.id;
    var payload = event.postback.payload;

    if (payload === "Greeting") {
        request({
            url: "https://graph.facebook.com/v2.6/" + senderID,
            qs: {
                access_token: process.env.ACCESS_TOKEN,
                fields: "first_name"
            },
            method: "GET"
        }, function(error, response, body) {
            var greeting = "";
            if (error) {
                console.log("Error getting user's name: " + error);
            } else {
                var bodyObj = JSON.parse(body);
                greeting = "Hey, " + bodyObj.first_name + "!";
            }
            sendMessage(senderID, {
                text: greeting
            });
        });
    } else if (payload === "Correct") {
        sendMessage(senderID, {
            text: "Yay!"
        });
    } else if (payload === "Incorrect") {
        sendMessage(senderID, {
            text: "Oops!"
        });
    }
}

function processMessage(event) {
    if (!event.message.is_echo) {
        var message = event.message;
        var senderID = event.sender.id;

        if (message.text) {
            var formattedMsg = message.text.toLowerCase().trim();
            switch (formattedMsg) {
                case 'activities':
                    activityIndex(senderID);
                    break;

                case 'businesses':
                    businessIndex(senderID);
                    break;

                default:
                    sendMessage(senderID, {
                        text: "bitte?"
                    });
            }
        } else if (message.attachments) {
            sendMessage(senderID, {
                text: "bitte?"
            });
        }
    }
}

// sends message to user
function sendMessage(recipientId, message) {
    request({
        url: "https://graph.facebook.com/v2.6/me/messages",
        qs: {
            access_token: process.env.ACCESS_TOKEN
        },
        method: "POST",
        json: {
            recipient: {
                id: recipientId
            },
            message: message,
        }
    }, function(error, response, body) {
        if (error) {
            console.log("Error sending message: " + response.error);
        }
    });
}

function activityIndex(senderID) {
    request({
        url: msAPI + "/activities/page/0",
        method: "GET",
    }, function(errors, response, body) {
        if (errors) {
            console.log("Error sending message: " + response.errors);
        } else {
            var activities = JSON.parse(body).data;
            for (var i = 0; i < activities.length && i < 5; i++)
            {
                console.log('sending');
                sendMessage(senderID, { text: activities[i].name });
                console.log('sent');
            }
        }
    });
}

function businessIndex(senderID) {

}

app.listen(app.get('port'), function() {
    console.log('run, bot... run...');
    console.log(app.get('port'));
});
