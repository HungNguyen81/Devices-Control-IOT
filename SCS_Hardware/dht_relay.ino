#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <time.h>
#include <TZ.h>
#include <FS.h>
#include <LittleFS.h>
#include <CertStoreBearSSL.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define DHTPIN 13 // what digital pin(D7) we're connected to DHT
#define DHTTYPE DHT11 // DHT 11
#define physics_button 1
#define virtual_button 2
// define the GPIO connected with Relays
const int NumOfRelays = 4;
const int RelayPin[] = {14,12,10,9}; // D5, D6, SD3, SD2
bool RelayState[] = {1,1,1,1}; // //Define integer to remember the toggle state for relay 1, 2, 3, 4 ( ON_0 / OFF_1 )

int i=0;
int state, old = 0;

DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(0x27,16,2);  // set the LCD address to 0x27 for a 16 chars and 2 line display

// These values use for connecting home's wifi and hiveMQ
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
void updateServer() {
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

// Control relays via physical buttons
int PushButtons(int value) {
  if (value < 100) return 0;
  else if (value > 305 && value < 340) {
    return 4;
  } 
  else if (value > 605 && value < 635) {
    return 3;
  } 
  else if (value > 895 && value < 940) {
    return 2;
  } 
  else if (value > 1015 && value < 1030) {
    return 1;
  }
  else return 0;
}

// Subscribe messages and Control relays via wifi
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  for (i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();

  // Switch on/off the relay if receive a message 'ctrl'
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
  Serial.begin(115200);
  delay(500);
  
  lcd.init();                      // initialize the lcd 
  lcd.backlight();

  LittleFS.begin();
  setup_wifi();
  setDateTime();
  
  lcd.setCursor(0,0);
  lcd.print("Connecting to ");
  lcd.setCursor(0,1);
  lcd.print(ssid);
  

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
  
  dht.begin();  //initialize the DHT11 sensor
  
  lcd.clear();
  lcd.setCursor(0,0);
  lcd.print("Loading data...");
  
  for(i=0; i<NumOfRelays; i++) {
    pinMode(RelayPin[i], OUTPUT);
    digitalWrite(RelayPin[i], RelayState[i]); //During Starting all Relays should TURN OFF
  }
  updateServer();   //send all relays state to the server when connecting
  delay(5000);
}

void loop() {
  if (!client->connected()) {
    reconnect();
    updateServer();   //send all relays state to the server when connecting
  }
  client->loop();
  
  int cur_analog = analogRead(A0);
  state = PushButtons(cur_analog);    //listen to the button's state
  if(state != old){
    if(state != 0) {
      Serial.print("Button: ");
      Serial.println(state);
      relayOnOff(state-1,physics_button);
      delay(400);
    }
    old = state;
  }

  unsigned long now = millis();
  if (now - lastMsg > 3000) {
    lastMsg = now;

    float h = dht.readHumidity();
    float t = dht.readTemperature();

    if (isnan(h) || isnan(t)) {
      Serial.println("Failed to read from DHT sensor!");
      return;
    }
    snprintf(t_msg, MSG_BUFFER_SIZE, "temp %.2f", t);
    snprintf(h_msg, MSG_BUFFER_SIZE, "humid %.2f", h);

    lcd.clear();
    lcd.setCursor(0,0);
    lcd.print(t_msg);
    lcd.setCursor(0,1);
    lcd.print(h_msg);
    
    Serial.println("Publish message: ");
    Serial.print("                 ");
    Serial.println(t_msg);
    Serial.print("                 ");
    Serial.println(h_msg);
    client->publish("scs/home1/data", t_msg);
    client->publish("scs/home1/data", h_msg);
  }
}
