var express = require("express");
var request = require("request");
var bodyParser = require("body-parser");

var app = express();
app.set('port', process.env.PORT || 5000);
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());

// Server index page
app.get("/", function(req, res) {
    res.status(200).json({
        status: 'success',
        message: "why look at this! it's working!"
    });
});

// Facebook Webhook
// Used for verification
app.get("/webhook", function(req, res) {
    if (req.query["hub.verify_token"] === process.env.VERIFY_TOKEN) {
        res.status(200).send(req.query["hub.challenge"]);
    } else {
        res.sendStatus(403);
    }
});

// All callbacks for Messenger will be POST-ed here
app.post("/webhook", function(req, res) {
    // Make sure this is a page subscription
    if (req.body.object == "page") {
        // Iterate over each entry
        // There may be multiple entries if batched
        req.body.entry.forEach(function(entry) {
            // Iterate over each messaging event
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

function processPostback(event) {
    var senderId = event.sender.id;
    var payload = event.postback.payload;

    if (payload === "Greeting") {
        // Get user's first name from the User Profile API
        // and include it in the greeting
        request({
            url: "https://graph.facebook.com/v2.6/" + senderId,
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
            sendMessage(senderId, {
                text: greeting
            });
        });
    } else if (payload === "Correct") {
        sendMessage(senderId, {
            text: "Yay!"
        });
    } else if (payload === "Incorrect") {
        sendMessage(senderId, {
            text: "Oops!"
        });
    }
}

function processMessage(event) {
    if (!event.message.is_echo) {
        var message = event.message;
        var senderId = event.sender.id;

        // You may get a text or attachment but not both
        if (message.text) {
            var formattedMsg = message.text.toUpperCase().trim();
            sendMessage(senderId, {
                text: formattedMsg
            });
        } else if (message.attachments) {
            sendMessage(senderId, {
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

app.listen(app.get('port'), function() {
    console.log('run, bot... run');
});
