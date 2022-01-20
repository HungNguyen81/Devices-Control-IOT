#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <time.h>
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

# define ON 0
# define OFF 1
bool RelayState[] = {OFF,OFF,OFF,OFF}; // //Define integer to remember the toggle state for relay 1, 2, 3, 4 ( ON_0 / OFF_1 )

int i=0;
int state, old = 0;

DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(0x27,16,2);  // set the LCD address to 0x27 for a 16 chars and 2 line display

byte degree[8] = {
  B00111,
  B00101,
  B00111,
  B00000,
  B00000,
  B00000,
  B00000,
  B00000
};
byte icon_temp[8] = {
  B00100,
  B01010,
  B01010,
  B01110,
  B01110,
  B11111,
  B11111,
  B01110,
};
byte icon_humid[8] = {
  B00100,
  B00100,
  B01110,
  B01110,
  B11111,
  B11111,
  B10111,
  B01110
};


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
unsigned int analog_val = 0, print_time = 20;
time_t wake_up_time;

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
  configTime(3600*7, 0, "pool.ntp.org");    //connect to NTP server (Network Time Protocol)
  Serial.print("Waiting for NTP time sync: ");
  Serial.println();
  delay(1000);
  
  time_t now;
  struct tm * timeinfo;
  time (&now);
  timeinfo = localtime (&now);
  Serial.println(asctime(timeinfo));
  wake_up_time = now;
}


//Check the time, display it, and set the deep sleep mode from 0 AM to 5 AM
void time_control()
{
  //get time from NTP server
  time_t now;
  struct tm * timeinfo;
  time (&now);
  timeinfo = localtime (&now);

  //Set deep sleep mode from 00:00 am to 5:00 am
  if((timeinfo->tm_hour < 5) && ((now-wake_up_time) > 600)) {
    lcd.clear();
    lcd.setCursor(0,0);
    lcd.print("Deep Sleep Mode");
    lcd.setCursor(0,1);
    lcd.print("  0 AM to 5 AM");
    delay(5000);
    unsigned int time_sleep = (5 - timeinfo->tm_hour)*60 - timeinfo->tm_min;
    ESP.deepSleep(time_sleep*60e6);
  }

  //Display the time on the LCD screen
  lcd.setCursor(0,0);
  if(timeinfo->tm_hour < 10) lcd.print("0");
  lcd.print(timeinfo->tm_hour);
  lcd.print(":");
  if(timeinfo->tm_min < 10) lcd.print("0");
  lcd.print(timeinfo->tm_min);
  lcd.print(" ");
  if(timeinfo->tm_mday < 10) lcd.print("0");
  lcd.print(timeinfo->tm_mday);
  lcd.print("-");
  if(timeinfo->tm_mon < 10) lcd.print("0");
  lcd.print(timeinfo->tm_mon +1);
  lcd.print("-");
  lcd.print(timeinfo->tm_year +1900);
}


//Send all relays state to the server when connecting
void updateServer() {
    for(i=0; i<NumOfRelays; i++) {
      snprintf(relay_msg, MSG_BUFFER_SIZE, "ctrl %d %d", i+1, !RelayState[i]);
      client->publish("scs/home1", relay_msg);
    }

    // Hưng coded this line
    client->publish("scs/home1", "updated");
} 

// Turn relay ON/OFF
void relayOnOff(int relay, int source) {
  if(RelayState[relay] == OFF) {
    digitalWrite(RelayPin[relay], LOW);     //turn the relay on
    snprintf(relay_msg, MSG_BUFFER_SIZE, "ctrl %d 1", relay+1);
    if(source == physics_button) {
      Serial.print("Publish message: [");
      Serial.print(relay_msg);
      Serial.print("] \n");
      client->publish("scs/home1", relay_msg);
    }
    RelayState[relay] = ON;
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
    RelayState[relay] = OFF;
    Serial.printf("Device %d OFF\n",relay+1);
  }
}

// Control relays via physical buttons
int PushButtons(int analog_val) {
  if (analog_val < 100) return 0;
  else if (analog_val > 310 && analog_val < 354) {
    return 4;
  } 
  else if (analog_val > 610 && analog_val < 640) {
    return 3;
  } 
  else if (analog_val > 890 && analog_val < 940) {
    return 2;
  } 
  else if (analog_val > 1015 && analog_val < 1030) {
    return 1;
  }
  else return 0;
}

// Send temperature, humidity to HiveMQ and display them on LCD screen
void data_processing(float t, float h) {
  //Display temperature on LCD
  lcd.setCursor(0,1);
  lcd.write(byte(1));
  lcd.setCursor(2,1);
  lcd.print(t,1);
  lcd.write(byte(0));
  lcd.print("C");
  if(t < 10) lcd.print(" ");

  //Display humidity on LCD
  lcd.setCursor(10,1);
  lcd.write(byte(2));
  lcd.setCursor(12,1);
  lcd.print(h,0);
  lcd.print("%");

  //Send data to HiveMQ
  snprintf(t_msg, MSG_BUFFER_SIZE, "temp %.2f", t);
  snprintf(h_msg, MSG_BUFFER_SIZE, "humid %.2f", h);
  Serial.println("Publish message: ");
  Serial.print("                 ");
  Serial.println(t_msg);
  Serial.print("                 ");
  Serial.println(h_msg);
  client->publish("scs/home1/data", t_msg);
  client->publish("scs/home1/data", h_msg);
}

// Receive messages and Control relays via wifi
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
      char tmp = i+1+'0';
      if((char)payload[5] == tmp) {  //the position of the controlled relay
        if(((char)payload[7] == '1') ^ (RelayState[i] == ON)) {
          relayOnOff(i,virtual_button);
          return;
        }
      }
    }
  } else if((char)payload[0] == 'r'){
    // Hưng update request 'r' msg
    updateServer();
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
  lcd.createChar(0,degree);
  lcd.createChar(1,icon_temp);
  lcd.createChar(2,icon_humid);
  lcd.setCursor(0,0);
  lcd.print("Connecting to ");
  lcd.setCursor(0,1);
  lcd.print(ssid);
  
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
    updateServer();   //send all relays state to the server when reconnecting
  }
  client->loop();
  
  //listen to the button's state
  int cur_analog = analogRead(A0);
  state = PushButtons(cur_analog);
  if(state != old){
    if(state != 0) {
      Serial.print("Button: ");
      Serial.println(state);
      relayOnOff(state-1,physics_button);
      delay(400);
    }
    old = state;
  }

  //read DHT sensor every 3s
  unsigned long now = millis();
  if (now - lastMsg > 3000) {
    lastMsg = now;
    
    if(print_time > 19) {
      lcd.clear();
      time_control();
      print_time = 0;
    }
    print_time++;
    
    float humid = dht.readHumidity();
    float temperature = dht.readTemperature();

    if (isnan(humid) || isnan(temperature)) {
      Serial.println("Failed to read from DHT sensor!");
      return;
    }
    data_processing(temperature, humid); 
  }
}
