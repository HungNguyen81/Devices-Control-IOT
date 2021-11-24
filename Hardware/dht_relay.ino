#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <time.h>
#include <TZ.h>
#include <FS.h>
#include <LittleFS.h>
#include <CertStoreBearSSL.h>
#include "DHT.h"

#define DHTPIN 12 // what digital pin(D6) we're connected to
#define DHTTYPE DHT11 // DHT 11
#define physics_button 1
#define virtual_button 2
// define the GPIO connected with Relays and Buttons
const int NumOfRelays = 2;
const int RelayPin[] = {5,4}; // D1, D2
const int ButtonPin[] = {10,9}; // SD3, SD2
bool RelayState[] = {1,1}; // //Define integer to remember the toggle state for relay 1, 2

int i=0;

DHT dht(DHTPIN, DHTTYPE);


// Update these with values suitable for your network.
const char* ssid = "Tony";
const char* password = "buihuy0866689";
const char* mqtt_server = "1af8e2f5e0ae40308432e82daf1071e0.s1.eu.hivemq.cloud";

// A single, global CertStore which can be used by all connections.
// Needs to stay live the entire time any of the WiFiClientBearSSLs
// are present.
BearSSL::CertStore certStore;

WiFiClientSecure espClient;
PubSubClient * client;
unsigned long lastMsg = 0;
#define MSG_BUFFER_SIZE (500)
char t_msg[MSG_BUFFER_SIZE], h_msg[MSG_BUFFER_SIZE];
char relay_msg[MSG_BUFFER_SIZE];
int value = 0;

void setup_wifi() {
  delay(10);
  // We start by connecting to a WiFi network
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  randomSeed(micros());

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}


void setDateTime() {
  // You can use your own timezone, but the exact time is not used at all.
  // Only the date is needed for validating the certificates.
  configTime(TZ_Europe_Berlin, "pool.ntp.org", "time.nist.gov");

  Serial.print("Waiting for NTP time sync: ");
  time_t now = time(nullptr);
  while (now < 8 * 3600 * 2) {
    delay(100);
    Serial.print(".");
    now = time(nullptr);
  }
  Serial.println();

  struct tm timeinfo;
  gmtime_r(&now, &timeinfo);
  Serial.printf("%s %s", tzname[0], asctime(&timeinfo));
}

//Send all relays state to the server when connecting
void resetServer() {
    for(i=0; i<NumOfRelays; i++) {
      snprintf(relay_msg, MSG_BUFFER_SIZE, "ctrl %d %d", i+1, !RelayState[i]);
      client->publish("scs/home1", relay_msg);
    }
} 

// Turn relay ON/OFF
void relayOnOff(int relay, int source) {
  if(RelayState[relay] == 1) {
    digitalWrite(RelayPin[relay], LOW);     //turn the relay on
    snprintf(relay_msg, MSG_BUFFER_SIZE, "ctrl %d 1", relay+1);
    if(source == physics_button) {
      Serial.print("Publish message: [");
      Serial.print(relay_msg);
      Serial.print("] \n");
      client->publish("scs/home1", relay_msg);
    }
    RelayState[relay] = 0;
    Serial.printf("Device %d ON\n",relay+1);   
  }
  else {
    digitalWrite(RelayPin[relay], HIGH);    //turn the relay off
    snprintf(relay_msg, MSG_BUFFER_SIZE, "ctrl %d 0", relay+1);
    if(source == physics_button) {
      Serial.print("Publish message: [");
      Serial.print(relay_msg);
      Serial.print("] \n");
      client->publish("scs/home1", relay_msg);
    }
    RelayState[relay] = 1;
    Serial.printf("Device %d OFF\n",relay+1);
  }
}

// Control via buttons
void PushButtons() {
  for(i=0; i<NumOfRelays; i++) {
    if(digitalRead(ButtonPin[i]) == LOW) {  //check if the button is pressed 
      delay(400);
      relayOnOff(i,physics_button);
    }
  }    
}

// Control via wifi
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  for (i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();

  // Switch on the relay if the first character is present
  if ((char)payload[0] == 'c' && (char)payload[1] == 't' && (char)payload[2] == 'r' && (char)payload[3] == 'l') {
    for(i=0; i<NumOfRelays; i++) {
      char temp = i+1+'0';
      if((char)payload[5] == temp) {  //the position of the controlled relay
        if(((char)payload[7] == '1') ^ (RelayState[i] == 0)) {
          relayOnOff(i,virtual_button);
          return;
        }
      }
    }
  }
}


void reconnect() {
  // Loop until we’re reconnected
  while (!client->connected()) {
    Serial.print("Attempting MQTT connection…");
    String clientId = "ESP8266Client - MyClient";
    // Attempt to connect
    // Insert your password
    if (client->connect(clientId.c_str(), "scs-home1", "SCS-home1")) {
      Serial.println("connected");
      // Once connected, publish an announcement…
//      client->publish("scs/home1/", "hello world");
      // … and resubscribe
      client->subscribe("scs/home1");
      
    } else {
      Serial.print("failed, rc = ");
      Serial.print(client->state());
      Serial.println(" try again in 5 seconds");
      // Wait 5 seconds before retrying
      delay(5000);
    }
  }
}


void setup() {
  delay(500);
  // When opening the Serial Monitor, select 9600 Baud
  Serial.begin(9600);
  delay(500);

  LittleFS.begin();
  setup_wifi();
  setDateTime();


  // you can use the insecure mode, when you want to avoid the certificates
  //espclient->setInsecure();

  int numCerts = certStore.initCertStore(LittleFS, PSTR("/certs.idx"), PSTR("/certs.ar"));
  Serial.printf("Number of CA certs read: %d\n", numCerts);
  if (numCerts == 0) {
    Serial.printf("No certs found. Did you run certs-from-mozilla.py and upload the LittleFS directory before running?\n");
    return; // Can't connect to anything w/o certs!
  }

  BearSSL::WiFiClientSecure *bear = new BearSSL::WiFiClientSecure();
  // Integrate the cert store with this connection
  bear->setCertStore(&certStore);

  client = new PubSubClient(*bear);

  client->setServer(mqtt_server, 8883);
  client->setCallback(callback);
  dht.begin();

  for(i=0; i<NumOfRelays; i++) {
    pinMode(RelayPin[i], OUTPUT);
    pinMode(ButtonPin[i], INPUT_PULLUP);
    digitalWrite(RelayPin[i], RelayState[i]); //During Starting all Relays should TURN OFF
  }
  resetServer();   //send all relays state to the server when connecting
}

void loop() {
  if (!client->connected()) {
    reconnect();
    resetServer();   //send all relays state to the server when connecting
  }
  client->loop();
  PushButtons();  //listen to the button's state

  unsigned long now = millis();
  if (now - lastMsg > 3000) {
    lastMsg = now;
//    ++value;

    float h = dht.readHumidity();
    float t = dht.readTemperature();

    if (isnan(h) || isnan(t)) {
      Serial.println("Failed to read from DHT sensor!");
      return;
    }
    snprintf(t_msg, MSG_BUFFER_SIZE, "temp %f", t);
    snprintf(h_msg, MSG_BUFFER_SIZE, "humid %f", h);
    
    Serial.println("Publish message: ");
    Serial.print("                 ");
    Serial.println(t_msg);
    Serial.print("                 ");
    Serial.println(h_msg);
    client->publish("scs/home1/data", t_msg);
    client->publish("scs/home1/data", h_msg);
  }
}
