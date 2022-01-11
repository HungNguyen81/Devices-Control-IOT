#include <DHT.h>
#include <Wire.h> 
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27,16,2);

const int DHTPIN = 2;
const int DHTTYPE = DHT11;
DHT dht(DHTPIN, DHTTYPE);

byte degree[8] = {
  0B01110,
  0B01010,
  0B01110,
  0B00000,
  0B00000,
  0B00000,
  0B00000,
  0B00000
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
  B01010,
  B01010,
  B10001,
  B10001,
  B10001,
  B10001,
  B01110
};

void setup() {
  lcd.init();  
  lcd.backlight();
  lcd.setCursor(2,0);
  lcd.print("HUNG-HUY-ANH");
  lcd.createChar(0,degree);
  lcd.createChar(1,icon_temp);
  lcd.createChar(2,icon_humid);
  dht.begin();  
}

void loop() {
  float h = dht.readHumidity();
  float t = dht.readTemperature();

  if (isnan(t) || isnan(h)) { // Kiểm tra xem thử việc đọc giá trị có bị thất bại hay không. Hàm isnan bạn xem tại đây http://arduino.vn/reference/isnan
  } 
  else {
    lcd.setCursor(0,1);
    lcd.write(byte(1));
    lcd.setCursor(1,1);
    lcd.print(t,2);
    lcd.write(byte(0));
    lcd.print("C");

    lcd.setCursor(9,1);
    lcd.write(byte(2));
    lcd.setCursor(10,1);
    lcd.print(h,2);
    lcd.print("%");    
  }
}
/*
Hãy print ra xem thử bạn nhận được gì! VÀ hãy thử khám phá từng dòng code mới trong này nhé ;)
*/
