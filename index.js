////////////////// REQUIRES /////////////////

const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const process = require("process");
const favicon = require('express-favicon');

var mqtt = require('mqtt');
var firebase = require('firebase');

const multi_topic = "bazzini/#"
const watering_topic = "watering";
const config_topic = "config";
const initialconfig_topic = "reqconfig";
const weather_topic = "weather";

////////////////// SETTINGS /////////////////

//CloudMQTT broker url on heroku
var mqtt_url = 'mqtt://bqmqptlw:bUouMU6bIdPx@m14.cloudmqtt.com:10671';

// Set the configuration for your app
var config = {
  apiKey: "AIzaSyDhQFcJ-ZX5s-jRJd1coiF3EX4z0ghp6R8",
  authDomain: "iot-project-backend.firebaseapp.com",
  databaseURL: "https://iot-project-backend.firebaseio.com",
  storageBucket: "iot-project-backend.appspot.com"
};
firebase.initializeApp(config);

var database = firebase.database();

///////////// Init mqtt client ///////////////

var client = mqtt.connect(mqtt_url)

client.on('connect', function() {
  //here we subscribe to all our topic
  client.subscribe(multi_topic);
  console.log("subscribed successfully")
})

///////////// APP.USE ///////////////////

app.use(favicon(__dirname + '/public/images/favicon.ico'));
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

///////////// APP.GET ///////////////////

// retrieve all the device id present in the database
app.get("/devices", function(req, res) {
  database.ref("bazzini").once('value', function(snapshot) {
    var devices = [];
    var i = 0;
    for (x in snapshot.val()) {
      devices[i] = x;
      i++;
    }
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
      "devices": devices
    }));
  });
});

///////////////// APP.POST //////////////////



app.post('/config', function(req, res) {
  console.log("config post received");
  var keys = Object.keys(req.body);
  keys.forEach(function(item){
    if (item != "freq" && item != "time") {
      client.publish("bazzini/" + req.body[[item]] + "/" + config_topic, req.body.freq + ',' + req.body.time, {
        qos: '1'
      });
    }
  });
  res.writeHead(200, {
    'Content-Type': 'text/html'
  });
  res.end('ok');
});


///////////// Handle Received Messages //////////////

client.on('message', function(topic, message) {
  // message is Buffer
  var msg = message.toString().split(',');
  var payload;
  console.log("Got new message! Topic: " + topic + "; Message: " + message)

  if (topic.indexOf(initialconfig_topic) != -1) {
    let freq, time;
    database.ref(topic.replace(initialconfig_topic, config_topic)).limitToLast(1).once('value', function(snapshot) {
      console.log(snapshot.val());
      snapshot.forEach(function(childSnapshot) {
        freq = childSnapshot.val().frequency;
        time = childSnapshot.val().time;
      });
      //default configuration at first connection
      if (isNaN(freq)) {
        freq = "60";
      }
      if (isNaN(time)) {
        time = "1";
      }
      client.publish(topic.replace(initialconfig_topic, config_topic), freq + ',' + time, {
        qos: '1'
      });
    });
  } else {
    if (topic.indexOf(watering_topic) != -1) {
      payload = {
        watering_init: Date.now(),
        watering_duration: msg[1]
      }
    } else if (topic.indexOf(config_topic) != -1) {
      payload = {
        frequency: msg[0],
        time: msg[1]
      }
    } else {
      payload = {
        degree: msg[0],
        rain: msg[1],
        humidity: msg[2],
        wind: msg[3]
      }
    }

    var key = database.ref().child(topic).push().key;
    database.ref(topic).child(key).set(payload);
  }
});

//////// Instatiate the app ///////////

let serverPort = process.env.PORT || 5000;
app.set("port", serverPort);

//Start the server on port 5000
app.listen(serverPort, function() {
  console.log(`Your app is ready at port ${serverPort}`);
});
