var mqtt = require('mqtt')

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
});

client.subscribe('scs/home2/ctrl');

// client.publish('scs/home1', 'Hello im esp8266');
var temp = 0, humid = 0;

function sendData() {
    temp = Math.random() * (20 - 20.3) + 20.3;
    humid = Math.random() * (50 - 49) + 49;

    client.publish('scs/home2/data', `temp ${temp}`)
    client.publish('scs/home2/data', `humid ${humid}`)

    setTimeout(sendData, 2000);
}

sendData();

function sendControlMsg(){
    client.publish('scs/home2', 'ctrl 1');
    console.log("send control msg");
    setTimeout(sendControlMsg, 5000);
}

// sendControlMsg();