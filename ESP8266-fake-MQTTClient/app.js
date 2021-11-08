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
    console.log('Received message:', topic, message.toString());
});

// client.subscribe('scs/home1');

// client.publish('scs/home1', 'Hello im esp8266');
var temp = 0, humid = 0;

function sendData() {
    temp = Math.random() * (27 - 26) + 26;
    humid = Math.random() * (99 - 89) + 89;

    client.publish('scs/home1', `temp ${temp}`)
    client.publish('scs/home1', `humid ${humid}`)

    setTimeout(sendData, 1000);
}

sendData();
