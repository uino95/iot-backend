////////////////// REQUIRES /////////////////

const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const process = require("process");

var mqtt = require('mqtt');
var firebase = require('firebase');

const watering_topic = "bazzini/pizerow/watering";
const config_topic = "bazzini/pizerow/config";
const initialconfig_topic = "bazzini/pizerow/reqconfig";
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
  client.subscribe(watering_topic);
  client.subscribe(config_topic);
  client.subscribe(weather_topic);
  client.subscribe(initialconfig_topic);
  console.log("subscribed successfully")
})

///////////// Handle App ///////////////////

app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.get("/" + watering_topic, function(req, res) {

  database.ref(watering_topic).once('value', function(snapshot) {
    res.send(snapshot.val());
  });
});

app.get("/" + config_topic, function(req, res) {

  database.ref(config_topic).once('value', function(snapshot) {
    res.send(snapshot.val());
  });
});

app.get("/" + weather_topic, function(req, res) {

  database.ref(weather_topic).once('value', function(snapshot) {
    res.send(snapshot.val());
  });
});

/////////////////////////////////////////////
///////////////// APP.POST //////////////////
/////////////////////////////////////////////

app.post('/config', function(req, res) {

  console.log("config post received");

  client.publish(config_topic, req.body.freq + ',' + req.body.time, {
    qos: '1'
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

  if (topic == initialconfig_topic) {
    let freq, time;
    database.ref(config_topic).limitToLast(1).once('value', function(snapshot) {
      console.log(snapshot.val());
      snapshot.forEach(function(childSnapshot) {
        freq = childSnapshot.val().frequency;
        time = childSnapshot.val().time;
      });
      client.publish(config_topic, freq + ',' + time, {
        qos: '1'
      });
    });
  } else {
    if (topic == watering_topic) {
      payload = {
        watering_init: Date.now(),
        watering_duration: msg[1]
      }
    } else if (topic == config_topic) {
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
