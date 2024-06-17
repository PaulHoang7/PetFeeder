#include <ESP32Servo.h>
#include <ESP32PWM.h>
#include "Arduino.h"
#include "WiFi.h"
#include "esp_camera.h"
#include "soc/soc.h"           // Disable brownout problems
#include "soc/rtc_cntl_reg.h"  // Disable brownout problems
#include "driver/rtc_io.h" 
#include <LittleFS.h>
#include <FS.h>
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>

//khai bao ip lien ket server python
//const uint16_t port = 8090;
//const char * host = "192.168.39.18";
//bool ConnectedSignal = false;

//Thiết lập wifi và Firebase storage
const char* ssid = "MELODY 3";
const char* password = "92nguyenluongban";
#define API_KEY "AIzaSyDKekclUFx6lNdLoEVDvzfrO4C2ygU6nYM"
#define USER_EMAIL "thelinhboy@gmail.com"
#define USER_PASSWORD "pbl5_2024"
#define STORAGE_BUCKET_ID "pbl5-94a59.appspot.com"
#define FIREBASE_HOST "pbl5-94a59-default-rtdb.firebaseio.com" // Thêm dòng này với URL của Firebase
#define FIREBASE_AUTH "D416qHQGzKumryQ0GZpmnenL3WZG9cSMqH6zAqlP"

//Đường dẫn lưu ảnh
const char* FILE_PHOTO_PATH[] = {"/photo1.jpg", "/photo2.jpg", "/photo3.jpg"};
#define BUCKET_PHOTO "/data/"

//Khai báo chân OV2640 camera module pins (CAMERA_MODEL_AI_THINKER)
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22
bool takeNewPhoto = true;
bool taskCompleted = false;
int old_light_cat;
int old_light_dog;
#define FIREBASE_TIMEOUT_MS 2000

//Define Firebase Data objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig configF;

//khai báo servo và cảm biến hồng ngoại và cảm biến quang trở 
Servo servo_dog;
Servo servo_cat;
int infared_sensor_pin = 14; // Chân GPIO để kết nối cảm biến hồng ngoại
int light_sensor_pin_dog = 2;
int light_sensor_pin_cat = 12;

//thực hiện việc chụp ảnh và lưu vào flash
void capturePhotoSaveLittleFS(const char* filePath) {
  // Dispose first pictures because of bad quality
  camera_fb_t* fb = NULL;
  // Skip first 3 frames (increase/decrease number as needed).
  for (int i = 0; i < 4; i++) {
    fb = esp_camera_fb_get();
    esp_camera_fb_return(fb);
    fb = NULL;
  }
  fb = NULL;  
  fb = esp_camera_fb_get();  
  if(!fb) {
    Serial.println("Camera capture failed"); 
    delay(1000);
    ESP.restart();
  }  
  Serial.printf("Picture file name: %s\n", filePath);
  File file = LittleFS.open(filePath, FILE_WRITE);
  if (!file) {
    Serial.println("Failed to open file in writing mode");
  }
  else {
    file.write(fb->buf, fb->len); // payload (image), payload length
    Serial.print("The picture has been saved in ");
    Serial.print(filePath);
    Serial.print(" - Size: ");
    Serial.print(fb->len);
    Serial.println(" bytes");
    
  }
  file.close();
  esp_camera_fb_return(fb);
  
}

//reset việc lưu vào bộ nhớ flash nếu lỗi 
void initLittleFS(){
  if (!LittleFS.begin(true)) {
    Serial.println("An Error has occurred while mounting LittleFS");
    ESP.restart();
  }
  else {
    delay(500);
    Serial.println("LittleFS mounted successfully");
  }
}

//Khai báo module camera
void initCamera(){
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_LATEST;
  if (psramFound()) {
    config.frame_size = FRAMESIZE_UXGA;
    config.jpeg_quality = 10;
    config.fb_count = 1;
  } else {
    config.frame_size = FRAMESIZE_SVGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    ESP.restart();
  } 
}

//Kiểm tra quá trình upload
void fcsUploadCallback(FCS_UploadStatusInfo info){
    if (info.status == firebase_fcs_upload_status_init){
      Serial.printf("\n");
        Serial.printf("Uploading file %s (%d) to %s\n", info.localFileName.c_str(), info.fileSize, info.remoteFileName.c_str());
    }
    else if (info.status == firebase_fcs_upload_status_complete)
    {
        Serial.println("Upload completed");
        FileMetaInfo meta = fbdo.metaData();
        Serial.printf("Name: %s\n", meta.name.c_str());
        Serial.printf("Size: %d\n", meta.size);      
    }
    else if (info.status == firebase_fcs_upload_status_error){
        Serial.printf("Upload failed, %s\n", info.errorMsg.c_str());
    }
}

//Kết nối đến server
void initWiFi(){
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  Serial.print("WiFi connected with IP: ");
  Serial.println(WiFi.localIP());
}

void setup() {
  Serial.begin(115200);
  initWiFi();
  initLittleFS();
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
  initCamera();
  configF.api_key = API_KEY;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;
  configF.host = FIREBASE_HOST;  // Thêm dòng này để cấu hình URL của Firebase
  configF.signer.tokens.legacy_token = FIREBASE_AUTH;
  configF.token_status_callback = tokenStatusCallback; 
  Firebase.begin(&configF, &auth);
  Firebase.reconnectWiFi(true);
  //Sensor và servo
  servo_cat.attach(13);
  servo_cat.write(0);
  servo_dog.attach(15);
  servo_dog.write(0);
  pinMode(infared_sensor_pin, INPUT);
  pinMode(light_sensor_pin_cat,INPUT);
  pinMode(light_sensor_pin_dog,INPUT);
}

void loop() {
  // kiểm tra kết nối firebase
  if(Firebase.ready()){
    int isObstacle = digitalRead(infared_sensor_pin);
    int light_cat  = digitalRead(light_sensor_pin_cat);
    int light_dog  = digitalRead(light_sensor_pin_dog);
    Serial.println(isObstacle);
    Serial.println(light_cat);
    Serial.println(light_dog);
    if(light_cat == 1 && light_cat != old_light_cat) {
      old_light_cat = light_cat;
      if (Firebase.RTDB.setBool(&fbdo, "/light_cat", false)) {
        Serial.println("Successfully set light_cat to false");
      } else {
        Serial.println("Failed to set light_cat to false");
        Serial.println(fbdo.errorReason());
      }
    }
    if(light_dog == 1 && light_dog != old_light_dog) {
      old_light_dog = light_dog;
      if (Firebase.RTDB.setBool(&fbdo, "/light_dog", false)) {
        Serial.println("Successfully set light_dog to false");
      } else {
        Serial.println("Failed to set light_dog to false");
        Serial.println(fbdo.errorReason());
      }
    }
    if(light_cat == 0 && light_cat != old_light_cat) {
      old_light_cat = light_cat;
      if (Firebase.RTDB.setBool(&fbdo, "/light_cat", true)) {
        Serial.println("Successfully set light_cat to true");
      } else {
        Serial.println("Failed to set light_cat to true");
        Serial.println(fbdo.errorReason());
      }
    }
    if(light_dog == 0 && light_dog != old_light_dog) {
      old_light_dog = light_dog;
      if (Firebase.RTDB.setBool(&fbdo, "/light_dog", true)) {
        Serial.println("Successfully set light_dog to true");
      } else {
        Serial.println("Failed to set light_dog to true");
        Serial.println(fbdo.errorReason());
      }
    }
    
    if(isObstacle == 0) {
      if (Firebase.RTDB.setString(&fbdo, "/detect",  "Detecting")) {
        Serial.println("Successfully set detect value");
      } else {
        Serial.println("Failed to set detect value");
        Serial.println(fbdo.errorReason());
      }
      for (int i = 0; i < 3; i++) {
        capturePhotoSaveLittleFS(FILE_PHOTO_PATH[i]);
        delay(1000); // Delay between each capture
      }
      for (int i = 0; i < 3; i++) {
        String bucketPath = BUCKET_PHOTO  + String(i + 1) + ".jpg";
        if (Firebase.Storage.upload(&fbdo, STORAGE_BUCKET_ID, FILE_PHOTO_PATH[i], mem_storage_type_flash, bucketPath.c_str(), "image/jpeg", fcsUploadCallback)) {
            Serial.printf("Download URL %d: %s\n", i + 1, fbdo.downloadURL().c_str());
            if(i==2){
              Serial.printf("Send request\n");
              if (Firebase.RTDB.setBool(&fbdo, "/download", true)) {
                Serial.println("Successfully set download value");
              } else {
                Serial.println("Failed to set download value");
                Serial.println(fbdo.errorReason());
              }
              taskCompleted = false;
            }
        } else {
            Serial.printf("Upload failed %d, %s\n", i + 1, fbdo.errorReason());
        }
        delay(1000); // Delay between each upload
      }
      
    }
    if (Firebase.RTDB.getString(&fbdo, "/detect")){
      String detectType = fbdo.stringData();
      Serial.println(detectType);
      if (detectType == "dog and cat"){
        servo_cat.write(120);
        servo_dog.write(120);
        delay(5000);
        servo_cat.write(0);
        servo_dog.write(0);
        if (Firebase.RTDB.setString(&fbdo, "/detect",  "No detections")) {
          Serial.println("Successfully set detect value");
        } else {
          Serial.println("Failed to set detect value");
          Serial.println(fbdo.errorReason());
        }
      }
      else if (detectType == "cat"){
        servo_cat.write(100);
        delay(5000);
        servo_cat.write(0);
        if (Firebase.RTDB.setString(&fbdo, "/detect",  "No detections")) {
          Serial.println("Successfully set detect value");
        } else {
          Serial.println("Failed to set detect value");
          Serial.println(fbdo.errorReason());
        }
      } else if (detectType == "dog"){
        servo_dog.write(100);
        delay(5000);
        servo_dog.write(0);
        if (Firebase.RTDB.setString(&fbdo, "/detect",  "No detections")) {
          Serial.println("Successfully set detect value");
        } else {
          Serial.println("Failed to set detect value");
          Serial.println(fbdo.errorReason());
        }
      }
    }else{
      Serial.println(fbdo.errorReason());
    }
  }
  else{
    Serial.print("Firebase not ready");
  }
    delay(1000);
  }