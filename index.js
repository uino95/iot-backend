
////////////////// REQUIRES /////////////////

const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const process = require("process");
var MongoClient = require('mongodb').MongoClient;
var mqtt = require('mqtt');


////////////////// SETTINGS /////////////////
//MongoDb url on mlab
var db_url = "mongodb://mbare:ciao@ds239177.mlab.com:39177/broker_db";
//CloudMQTT broker url on heroku
var mqtt_url = 'mqtt://bqmqptlw:bUouMU6bIdPx@m14.cloudmqtt.com:10671';
var brokerDbo;

///////////// Init mqtt client ///////////////

var client = mqtt.connect(mqtt_url)

client.on('connect', function () {
  //here we subscribe to all our topic
  client.subscribe('new/prova')
  console.log("subscribed successfully")
})

///////////// Init Database /////////////////

MongoClient.connect(db_url, function(err, db) {
  if(err) throw err;
  brokerDbo = db.db("broker_db");
  console.log("connected to broker db");
})

///////////// Handle App ///////////////////

app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/messages",  function(req, res){
	let query = brokerDbo.collection("messages").find({}).toArray(function(err, result) {
    	if (err) throw err;
    	res.send(result);
  	});
});

///////////// Handle Received Messages //////////////

client.on('message', function (topic, message) {
  // message is Buffer
  var msg = {
    topic: topic,
    message: message
  }
  console.log("Got new message! Topic: " + topic + "; Message: " + message)
  brokerDbo.collection("messages").insertOne(msg, function(err, res) {
     if (err) throw err;
     console.log("message saved");
  });
  // client.end()
})

//////// Instatiate the app ///////////

let serverPort = process.env.PORT || 5000;
	app.set("port", serverPort);

 	//Start the server on port 5000 
	app.listen(serverPort, function() {
    console.log(`Your app is ready at port ${serverPort}`);
});