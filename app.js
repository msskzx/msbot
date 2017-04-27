var express = require("express");
var request = require("request");
var bodyParser = require("body-parser");

const msAPI = 'http://35.160.199.92:8080';
const msAPP = 'http://35.160.199.92:8000';

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

    if (payload === "App") {
        sendMessage(senderID, {
            text: 'you can check them here: ' + msAPP
        });
    }
}

function processMessage(event) {
    if (!event.message.is_echo) {
        var message = event.message;
        var senderID = event.sender.id;

        if (message.text) {
            var formattedMsg = message.text.toLowerCase().trim();

            if (formattedMsg === 'activities') {
                activityIndex(senderID);
                return;
            }

            if (formattedMsg === 'businesses') {
                businessIndex(senderID);
                return;
            }

            if (formattedMsg === 'promotions') {
                promotionIndex(senderID);
                return;
            }

            if (formattedMsg === 'help') {
                sendHelp(senderID);
                return;
            }

            if (formattedMsg.length > 8 && formattedMsg.substring(0, 8) === 'search a') {
                activitySearch(senderID, formattedMsg.substring(9));
                return;
            }


            if (formattedMsg.length > 8 && formattedMsg.substring(0, 8) === 'search b') {
                businessSearch(senderID, formattedMsg.substring(9));
                return;
            }

            sendMessage(senderID, {
                text: "you can type \"help\" to get a list of available commands"
            });
        } else {
            if (message.attachments) {
                sendMessage(senderID, {
                    text: "cannot process attachments yet :/"
                });
            }

        }
    }
}


function sendMessage(recipientID, message) {
    request({
        url: "https://graph.facebook.com/v2.6/me/messages",
        qs: {
            access_token: process.env.ACCESS_TOKEN
        },
        method: "POST",
        json: {
            recipient: {
                id: recipientID
            },
            message: message,
        }
    }, function(error, response, body) {
        if (error) {
            console.log("Error sending message: " + response.error);
        }
    });
}


function sendHelp(senderID) {
    sendMessage(senderID, {
        text: `"activities" (gets max of 5 activities)\n---\n` +
            `"businesses" (gets max of 5 businesses)\n---\n` +
            `"promotions" (gets max of 5 promotions)\n---\n` +
            `"search a <keword>" (search activities using the given keyword)\n---\n` +
            `"search b <keword>" (search businesses using the given keyword)\n---\n` +
            `"help" (list of available commands)\n`
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
            var activities = JSON.parse(body).data.activities;
            for (var i = 0; i < activities.length && i < 5; i++) {
                sendActivityTempelate(senderID, activities[i]);
            }
        }
    });
}


function activitySearch(senderID, keyword) {
    request({
        url: msAPI + "/search/activities?q=" + keyword,
        method: "GET"
    }, function(errors, response, body) {
        if (errors) {
            console.log("Error sending message: " + response.errors);
        } else {
            var activities = JSON.parse(body).data.activities;
            for (var i = 0; i < activities.length && i < 5; i++) {
                sendActivityTempelate(senderID, activities[i]);
            }
        }
    });
}


function sendActivityTempelate(recipientID, activity) {
    sendMessage(recipientID, {
        attachment: {
            type: "template",
            payload: {
                template_type: "generic",
                elements: [{
                    title: activity.name,
                    subtitle: 'rating: ' + activity.avgRating + '/10',
                    buttons: [{
                        type: "postback",
                        title: "View",
                        payload: "App"
                    }]
                }]
            }
        }
    });
    sendMessage(recipientID, {
        text: activity.name + ": " + msAPP + '/activity/' + promotion.activityId._id
    });
}


function businessIndex(senderID) {
    request({
        url: msAPI + "/businesses/page/0",
        method: "GET",
    }, function(errors, response, body) {
        if (errors) {
            console.log("Error sending message: " + response.errors);
        } else {
            var businesses = JSON.parse(body).data.businesses;
            for (var i = 0; i < businesses.length && i < 5; i++) {
                sendBusinessTempelate(senderID, businesses[i]);
            }
        }
    });
}


function businessSearch(senderID, keyword) {
    request({
        url: msAPI + "/search/businesses?q=" + keyword,
        method: "GET"
    }, function(errors, response, body) {
        if (errors) {
            console.log("Error sending message: " + response.errors);
        } else {
            var businesses = JSON.parse(body).data.businesses;
            for (var i = 0; i < businesses.length && i < 5; i++) {
                sendBusinessTempelate(senderID, businesses[i]);
            }
        }
    });
}


function sendBusinessTempelate(recipientID, business) {
    sendMessage(recipientID, {
        attachment: {
            type: "template",
            payload: {
                template_type: "generic",
                elements: [{
                    title: business.name,
                    subtitle: business.description,
                    buttons: [{
                        type: "postback",
                        title: "View",
                        payload: "App"
                    }]
                }]
            }
        }
    });
    sendMessage(recipientID, {
        text: business.name + ": " + msAPP + '/profile/?username=' + business.userId.username
    });
}


function promotionIndex(senderID) {
    request({
        url: msAPI + "/promotions/page/0",
        method: "GET",
    }, function(errors, response, body) {
        if (errors) {
            console.log("Error sending message: " + response.errors);
        } else {
            var promotions = JSON.parse(body).data.promotions;
            for (var i = 0; i < promotions.length && i < 5; i++) {
                sendPromotionTempelate(senderID, promotions[i]);
            }
        }
    });
}


function sendPromotionTempelate(recipientID, promotion) {
    sendMessage(recipientID, {
        attachment: {
            type: "template",
            payload: {
                template_type: "generic",
                elements: [{
                    title: promotion.discountValue + '% OFF',
                    subtitle: promotion.activityId.name,
                    buttons: [{
                        type: "postback",
                        title: "View",
                        payload: "App"
                    }]
                }]
            }
        }
    });
    sendMessage(recipientID, {
        text: promotion.activityId.name + ": "
        msAPP + '/activity/' + promotion.activityId._id
    });
}

app.listen(app.get('port'), function() {
    console.log('run, bot... run...');
    console.log(app.get('port'));
});
