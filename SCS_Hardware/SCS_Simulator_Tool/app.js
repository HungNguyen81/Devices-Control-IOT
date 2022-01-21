var mqtt = require('mqtt')
const express = require("express");
const app = express();

app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(express.json());

app.listen(3000, () => { console.log("Server started at port 3000!"); })

var options = {
    host: '1af8e2f5e0ae40308432e82daf1071e0.s1.eu.hivemq.cloud',
    port: 8883,
    protocol: 'mqtts',
    username: 'scs-home1',
    password: 'SCS-home1'
}

//initialize the MQTT client
var client = mqtt.connect(options);

//setup the callbacks
client.on('connect', () => {
    console.log('Connected');
});

client.on('error', error => {
    console.log(error);
});

client.on('message', (topic, message) => {
    //Called each time a message is received
    console.log('Received from topic:', topic, 'message:', message.toString());
    if(message == 'r'){
        console.log("Request received");
        client.publish(`${topic}`, 'updated')
    } else if (message == 'updated'){
        console.log("UPDATED msg sent to ", topic);
    }
});


// client.publish('scs/home1', 'Hello im esp8266');
var temp = 0, humid = 0;
var timeout;

app.get('/', (req, res) => {

    devices = [
        { id: 1, name: "Device 1", status: 0 },
        { id: 2, name: "Device 2", status: 0 },
        { id: 3, name: "Device 3", status: 0 },
        { id: 4, name: "Device 4", status: 0 }
    ]
    res.render("index", { devices: devices });
})
app.post('/start', (req, res) => {
    let topic = req.body.topic
    let tempMin = req.body.minTemp
    let tempMax = req.body.maxTemp
    let humiMin = req.body.minHumi
    let humiMax = req.body.maxHumi

    temp = Math.round((Math.random() * (tempMax - tempMin) + tempMin) * 100) / 100;
    humid = Math.round((Math.random() * (humiMax - humiMin) + humiMin) * 100) / 100;

    // client.publish(`scs/${topic}`, 'updated')
    client.subscribe(`scs/${topic}`)
    client.publish(`scs/${topic}/data`, `temp ${temp}`)
    client.publish(`scs/${topic}/data`, `humid ${humid}`)

    res.status(200).json({ msg: [`temp ${temp}`, `humid ${humid}`] })
})


app.post('/control', (req, res) => {
    try {
        let topic = req.body.topic
        let id = req.body.id
        let stt = req.body.stt
        console.log("body", req.body);
        client.publish(`scs/${topic}`, `ctrl ${id} ${stt}`);
        res.status(200).end()
    } catch (error) {
        console.log(error);
        res.status(500).end()
    }

})

// sendControlMsg();