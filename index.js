
////////////////// REQUIRES /////////////////

const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const process = require("process");
var MongoClient = require('mongodb').MongoClient;
var mqtt = require('mqtt');


////////////////// SETTINGS /////////////////

var broker_url = "mongodb://mbare:ciao@ds239177.mlab.com:39177/broker_db";
var mqtt_url = 'mqtt://bqmqptlw:bUouMU6bIdPx@m14.cloudmqtt.com:10671';
var brokerDbo;

// var ascoltatore = {
//   //using ascoltatore
//   type: 'mongo',    
//   url: "mongodb://mbare:ciao@ds253959.mlab.com:53959/mqtt",
//   pubsubCollection: 'ascoltatori',
//   mongo: {}
// };

// var moscaSettings = {
//   port: 1883,
//   backend: ascoltatore,
//   persistence: {
//     factory: mosca.persistence.Mongo,
//     url: "mongodb://mbare:ciao@ds253959.mlab.com:53959/mqtt"
//   }
// };

///////////// Init Database /////////////////

var client = mqtt.connect(mqtt_url)

MongoClient.connect(broker_url, function(err, db) {
  if(err) throw err;
  brokerDbo = db.db("broker_db");
  console.log("connected to broker db");
})


// var server = new mosca.Server(moscaSettings);
// server.on('ready', setup);


////////////////// APP //////////////////


app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.get("/messages",  function(req, res){
	let query = brokerDbo.collection("messages").find({}).toArray(function(err, result) {
    	if (err) throw err;
    	res.send(result);
  	});
});

///////////// Manage Received Messages //////////////

client.on('message', function (topic, message) {
  // message is Buffer
  console.log("Got new message! Topic: " + topic + "; Message: " + message)
  brokerDbo.collection("messages").insertOne(message, function(err, res) {
     if (err) throw err;
     console.log("message saved");
  });
  // client.end()
})

// server.on('clientConnected', function(client) {
//   console.log('client connected', client.id);   
// });

// fired when a message is received
// server.on('published', function(packet, client) {
//   var message;
//   message = {
//     topic: packet.topic,
//     payload: packet.payload.toString()
//   };
//   console.log('Published', message);  
//   brokerDbo.collection("messages").insertOne(message, function(err, res) {
//     if (err) throw err;
//     console.log("message saved");
//   });
// });

// fired when the mqtt server is ready
// function setup() {
//   console.log('Mosca server is up and running')
// }

//////// Instatiate the app ///////////

let serverPort = process.env.PORT || 5000;
	app.set("port", serverPort);

 	//Start the server on port 5000 
	app.listen(serverPort, function() {
    console.log(`Your app is ready at port ${serverPort}`);
});