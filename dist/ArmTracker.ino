// ESP32 Dev Module, Arduino-ESP32 3.x, NimBLE-Arduino 2.3.6.
// Sensor X toward wrist, Y forward, Z to your right in arm-down pose.
#include <Arduino.h>
#include <Wire.h>
#include <NimBLEDevice.h>
#include <atomic>
#include <math.h>
#include <heartRate.h>

void setup();
void loop();
constexpr bool DEBUG_IMU = false; // Enable your original serial diagnostics when needed.
constexpr int SDA_PIN=21, SCL_PIN=22;
constexpr char SERVICE[]="8c310001-7a94-4b2d-b7bb-5de91f2d9a10";
constexpr char DATA[]="8c310002-7a94-4b2d-b7bb-5de91f2d9a10";
constexpr char HEART[]="8c310004-7a94-4b2d-b7bb-5de91f2d9a10";
constexpr char CONTROL[]="8c310003-7a94-4b2d-b7bb-5de91f2d9a10";
struct Q {float w=1,x=0,y=0,z=0;};
Q mul(Q a,Q b);
Q normalize(Q q);
Q mul(Q a,Q b){return {a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z,a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w};}
Q normalize(Q q){float n=sqrtf(q.w*q.w+q.x*q.x+q.y*q.y+q.z*q.z);if(n<1e-9f)return {};return {q.w/n,q.x/n,q.y/n,q.z/n};}
const Q reference={.70710678f,0,.70710678f,0};
struct Imu{uint8_t addr;float a[3]={},g[3]={},bias[3]={},sum[3]={},square[3]={};Q q=reference;};
bool initImu(Imu &s);
bool readImu(Imu &s);
void fuse(Imu &s,float dt);
Imu imus[2]={{0x68},{0x69}};
NimBLEServer* server;NimBLECharacteristic* dataCharacteristic;
NimBLECharacteristic* heartCharacteristic;
// One owner (loop) for the shared Wire bus: MPU6050 0x68/0x69, MAX30102 0x57.
// No sensor task or cross-task I2C access. Heart work runs after due IMU reads.
constexpr uint8_t HEART_ADDRESS=0x57;
constexpr uint32_t FINGER_IR_MIN=50000;
bool regWrite(uint8_t addr,uint8_t reg,uint8_t value);
bool readRegs(uint8_t addr,uint8_t reg,uint8_t* out,size_t n);
uint8_t heartFlags=0; // bit0 present, bit1 finger, bit2 valid, bit3 fault
uint16_t heartBpm10=0;
uint32_t heartBeatAt=0;
void publishHeartState(uint8_t flags,uint16_t bpm,uint32_t beatAt){
  heartFlags=flags;heartBpm10=bpm;heartBeatAt=beatAt;
}
void serviceHeart(){
  static bool online=false,finger=false;
  static uint32_t nextPoll=0,retryAt=0,resetDeadline=0,sampleTime=0,lastBeatSample=0;
  static uint32_t lastDataAt=0,fingerSince=0,beatWall=0;
  static float intervals[4]={};
  static uint8_t count=0,index=0,stage=0,configIndex=0;
  // MAX30102 register settings: interrupts off, averaging 1, FIFO rollover,
  // ADC range 4096, 100 Hz, 411 us, red+IR LEDs. One write per service call.
  static const uint8_t config[][2]={
    {0x02,0x00},{0x03,0x00},{0x08,0x10},{0x0A,0x27},
    {0x0C,0x1F},{0x0D,0x1F},{0x04,0x00},{0x05,0x00},{0x06,0x00},{0x09,0x03}
  };
  uint32_t now=millis();
  if(int32_t(now-nextPoll)<0)return;
  nextPoll=now+2;
  auto unavailable=[&](){online=false;stage=0;retryAt=now+2000;finger=false;count=0;index=0;lastBeatSample=0;beatWall=0;publishHeartState(8,0,0);};
  if(!online){
    if(int32_t(now-retryAt)<0)return;
    uint8_t value=0;
    switch(stage){
      case 0:
        if(!readRegs(HEART_ADDRESS,0xFF,&value,1)||value!=0x15){unavailable();return;}
        stage=1;publishHeartState(1,0,0);return;
      case 1:
        if(!regWrite(HEART_ADDRESS,0x09,0x40)){unavailable();return;}
        resetDeadline=now+100;stage=2;return;
      case 2:
        if(!readRegs(HEART_ADDRESS,0x09,&value,1)){unavailable();return;}
        if(value&0x40){if(int32_t(now-resetDeadline)>=0)unavailable();return;}
        configIndex=0;stage=3;return;
      case 3:
        if(!regWrite(HEART_ADDRESS,config[configIndex][0],config[configIndex][1])){unavailable();return;}
        if(++configIndex==sizeof(config)/sizeof(config[0])){
          online=true;lastDataAt=now;count=0;index=0;lastBeatSample=0;beatWall=0;finger=false;
        }
        return;
    }
  }
  uint8_t pointers[3];
  if(!readRegs(HEART_ADDRESS,0x04,pointers,3)){unavailable();return;}
  uint8_t available=(pointers[0]-pointers[2])&31;
  if(pointers[1]||available>4){
    // Reinitialize in short steps rather than blocking while flushing a backlog.
    unavailable();retryAt=now;publishHeartState(1,0,0);return;
  }
  if(!available){if(uint32_t(now-lastDataAt)>250)unavailable();return;}
  // At most one optical sample per call, allowing IMUs to run between samples.
  uint8_t raw[6];
  if(!readRegs(HEART_ADDRESS,0x07,raw,6)){unavailable();return;}
  uint32_t ir=((uint32_t(raw[3])<<16)|(uint32_t(raw[4])<<8)|raw[5])&0x3FFFF;
  sampleTime+=10;lastDataAt=now;
  bool beat=checkForBeat(int32_t(ir));
  if(ir<FINGER_IR_MIN||ir>=260000){
    finger=false;count=0;index=0;lastBeatSample=0;beatWall=0;publishHeartState(1,0,0);return;
  }
  if(!finger){finger=true;fingerSince=sampleTime;count=0;index=0;lastBeatSample=0;beatWall=0;}
  if(uint32_t(sampleTime-fingerSince)<2000){publishHeartState(3,0,0);return;}
  if(beat){
    uint32_t interval=sampleTime-lastBeatSample;
    if(lastBeatSample&&interval>=273&&interval<=1714){
      intervals[index]=float(interval);index=(index+1)%4;if(count<4)count++;
      float sum=0,lo=2000,hi=0;
      for(uint8_t j=0;j<count;j++){sum+=intervals[j];lo=fminf(lo,intervals[j]);hi=fmaxf(hi,intervals[j]);}
      float average=sum/count;
      bool valid=count>=3&&(hi-lo)<average*.25f;
      beatWall=now;
      publishHeartState(valid?7:3,valid?uint16_t(lroundf(600000.0f/average)):0,beatWall);
    }else{count=0;index=0;publishHeartState(3,0,0);}
    lastBeatSample=sampleTime;
  }
  if(!beatWall||uint32_t(now-beatWall)>2500){
    publishHeartState(3,0,0);
    if(lastBeatSample&&uint32_t(sampleTime-lastBeatSample)>2500){count=0;index=0;lastBeatSample=0;}
  }
}
void sendHeartPacket(){
  static uint16_t heartSequence=0;
  uint8_t flags;uint16_t bpm;uint32_t beatAt;
  flags=heartFlags;bpm=heartBpm10;beatAt=heartBeatAt;
  uint32_t age=beatAt?uint32_t(millis()-beatAt):65535;
  if(age>2500){flags&=~4;bpm=0;} // Never send an old estimate as valid.
  uint16_t age16=uint16_t(age>65535?65535:age);
  uint8_t packet[8]={1,flags,uint8_t(bpm),uint8_t(bpm>>8),uint8_t(age16),uint8_t(age16>>8),uint8_t(heartSequence),uint8_t(heartSequence>>8)};
  heartSequence++;heartCharacteristic->setValue(packet,sizeof(packet));heartCharacteristic->notify();
}
std::atomic<bool> requestCalibration{false};
bool calibrated=false,calibrating=false,rejected=false,fault=false;uint16_t samples=0,sequence=0;uint32_t calibrationStart=0;
bool regWrite(uint8_t addr,uint8_t reg,uint8_t value){Wire.beginTransmission(addr);Wire.write(reg);Wire.write(value);return Wire.endTransmission()==0;}
bool readRegs(uint8_t addr,uint8_t reg,uint8_t* out,size_t n){Wire.beginTransmission(addr);Wire.write(reg);if(Wire.endTransmission(false)!=0)return false;if(Wire.requestFrom(addr,n,true)!=n)return false;for(size_t i=0;i<n;i++)out[i]=Wire.read();return true;}
bool initImu(Imu &s){
 uint8_t who=0;
 bool got=readRegs(s.addr,0x75,&who,1);
 Serial.printf("addr 0x%02x: readRegs=%d who=0x%02x\n", s.addr, got, who);
 if(!got) return false;
 if((who&0x7e)!=0x68 && who!=0x98) return false;
 return regWrite(s.addr,0x6B,0x01)&&regWrite(s.addr,0x1A,0x02)&&regWrite(s.addr,0x19,0x04)&&regWrite(s.addr,0x1B,0x08)&&regWrite(s.addr,0x1C,0x08); // 94/98 Hz DLPF, 200 Hz, +/-500 dps, +/-4g
}
bool readImu(Imu &s){uint8_t b[14];if(!readRegs(s.addr,0x3B,b,14))return false;for(int i=0;i<3;i++){s.a[i]=int16_t((uint16_t(b[2*i])<<8)|b[2*i+1])/8192.0f;s.g[i]=int16_t((uint16_t(b[8+2*i])<<8)|b[9+2*i])*(PI/180.0f/65.5f);}return true;}
void fuse(Imu &s,float dt){float gx=s.g[0]-s.bias[0],gy=s.g[1]-s.bias[1],gz=s.g[2]-s.bias[2];Q q=s.q;float n=sqrtf(s.a[0]*s.a[0]+s.a[1]*s.a[1]+s.a[2]*s.a[2]);
 // Proportional gravity correction; suppress during substantial linear acceleration.
 if(n>.85f&&n<1.15f){float ax=s.a[0]/n,ay=s.a[1]/n,az=s.a[2]/n;float vx=2*(q.x*q.z-q.w*q.y),vy=2*(q.w*q.x+q.y*q.z),vz=1-2*(q.x*q.x+q.y*q.y);constexpr float kp=1.5f;gx+=kp*(ay*vz-az*vy);gy+=kp*(az*vx-ax*vz);gz+=kp*(ax*vy-ay*vx);}
 Q dq=mul(q,{0,gx,gy,gz});s.q=normalize({q.w+.5f*dq.w*dt,q.x+.5f*dq.x*dt,q.y+.5f*dq.y*dt,q.z+.5f*dq.z*dt});}
void beginCalibration(){calibrating=true;calibrated=false;rejected=false;samples=0;calibrationStart=millis();for(auto &s:imus)for(int j=0;j<3;j++)s.sum[j]=s.square[j]=0;}
void calibrationSample(){bool still=true;for(auto &s:imus){float n=sqrtf(s.a[0]*s.a[0]+s.a[1]*s.a[1]+s.a[2]*s.a[2]);if(n<.95f||n>1.05f||s.a[0]>-.95f||fabsf(s.a[1])>.15f||fabsf(s.a[2])>.15f)still=false;for(int j=0;j<3;j++)if(fabsf(s.g[j])>.15f)still=false;}
 static uint32_t lastPrint=0;
 if(DEBUG_IMU && millis()-lastPrint>300){lastPrint=millis();
  for(int i=0;i<2;i++){
   Imu &s=imus[i];
   float n=sqrtf(s.a[0]*s.a[0]+s.a[1]*s.a[1]+s.a[2]*s.a[2]);
   Serial.printf("imu%d n=%.3f(need 0.95-1.05) a0=%.3f(need<=-0.95) a1=%.3f(need<=0.15abs) a2=%.3f(need<=0.15abs) g0=%.3f(need<=0.15abs) g1=%.3f(need<=0.15abs) g2=%.3f(need<=0.15abs) samples=%u\n",
    i, n, s.a[0], s.a[1], s.a[2], s.g[0], s.g[1], s.g[2], samples);
  }
 }
 if(!still){samples=0;for(auto &s:imus)for(int j=0;j<3;j++)s.sum[j]=s.square[j]=0;}else{samples++;for(auto &s:imus)for(int j=0;j<3;j++){s.sum[j]+=s.g[j];s.square[j]+=s.g[j]*s.g[j];}}
 if(samples>=600){bool stable=true;for(auto &s:imus)for(int j=0;j<3;j++){float mean=s.sum[j]/samples;if(s.square[j]/samples-mean*mean>.0001f)stable=false;}
 if(stable){for(auto &s:imus){for(int j=0;j<3;j++)s.bias[j]=s.sum[j]/samples;s.q=reference;}calibrated=true;calibrating=false;Serial.println("Calibration complete");}else{calibrating=false;rejected=true;}}
 if(calibrating&&millis()-calibrationStart>12000){calibrating=false;rejected=true;Serial.println("Calibration rejected: movement or incorrect sensor pose");}}
class ServerCallbacks:public NimBLEServerCallbacks{void onConnect(NimBLEServer* s,NimBLEConnInfo& c)override{s->updateConnParams(c.getConnHandle(),6,12,0,200);}void onDisconnect(NimBLEServer*,NimBLEConnInfo&,int)override{NimBLEDevice::startAdvertising();}} serverCallbacks;
class ControlCallbacks:public NimBLECharacteristicCallbacks{void onWrite(NimBLECharacteristic* c,NimBLEConnInfo&)override{auto v=c->getValue();if(v.size()==1&&uint8_t(v[0])==1)requestCalibration.store(true);}} controlCallbacks;
void sendPacket(){uint8_t b[20]={};b[0]=sequence&255;b[1]=sequence>>8;sequence++;b[2]=(calibrated?1:0)|(calibrating?2:0)|(fault?4:0)|(rejected?8:0);b[3]=calibrating?uint8_t(samples*100/600):(calibrated?100:0);
 for(int i=0;i<2;i++){Q q=mul(imus[i].q,{reference.w,-reference.x,-reference.y,-reference.z});float values[4]={q.w,q.x,q.y,q.z};for(int j=0;j<4;j++){int16_t v=lroundf(fmaxf(-1,fminf(1,values[j]))*32767);b[4+i*8+j*2]=uint16_t(v)&255;b[5+i*8+j*2]=uint16_t(v)>>8;}}
 dataCharacteristic->setValue(b,sizeof(b));dataCharacteristic->notify();}
void setup(){Serial.begin(115200);Wire.begin(SDA_PIN,SCL_PIN,400000);Wire.setTimeOut(5);delay(100);bool ok=true;for(auto &s:imus){bool found=initImu(s);Serial.printf("MPU 0x%02x: %s\n",s.addr,found?"OK":"FAILED");ok&=found;}if(!ok){Serial.println("Fix wiring and reset ESP32.");while(true)delay(1000);}delay(100);
for(auto &s:imus){for(int j=0;j<3;j++)s.bias[j]=0;s.q=reference;}
calibrated=true;
Serial.println("Calibration bypassed - using raw gyro, no bias correction.");
 NimBLEDevice::init("Armature-ESP32");server=NimBLEDevice::createServer();server->setCallbacks(&serverCallbacks);auto service=server->createService(SERVICE);dataCharacteristic=service->createCharacteristic(DATA,NIMBLE_PROPERTY::NOTIFY);heartCharacteristic=service->createCharacteristic(HEART,NIMBLE_PROPERTY::NOTIFY);auto control=service->createCharacteristic(CONTROL,NIMBLE_PROPERTY::WRITE);control->setCallbacks(&controlCallbacks);service->start();auto adv=NimBLEDevice::getAdvertising();adv->setName("Armature-ESP32");adv->addServiceUUID(SERVICE);adv->enableScanResponse(true);adv->start();
 Serial.println("Ready. Connect in Chrome, then calibrate.");}
void loop(){
  static uint32_t heartSent=0;
  if(uint32_t(millis()-heartSent)>=250){heartSent=millis();if(server->getConnectedCount())sendHeartPacket();}
  static uint32_t previous=micros(),sent=micros();uint32_t now=micros();if(uint32_t(now-previous)<5000){
    if(uint32_t(now-previous)<3000)serviceHeart(); // Leave headroom before the next IMU deadline.
    delay(1);return;
  }float dt=uint32_t(now-previous)*1e-6f;previous=now;if(requestCalibration.exchange(false))beginCalibration();bool okA=readImu(imus[0]),okB=readImu(imus[1]);fault=!okA||!okB;
   static uint32_t dbg=0;
 if(DEBUG_IMU && millis()-dbg>300){dbg=millis();
  Serial.printf("imu0 a=[%.3f %.3f %.3f] g=[%.3f %.3f %.3f] ok=%d | imu1 a=[%.3f %.3f %.3f] g=[%.3f %.3f %.3f] ok=%d fault=%d\n",
   imus[0].a[0],imus[0].a[1],imus[0].a[2],imus[0].g[0],imus[0].g[1],imus[0].g[2],okA,
   imus[1].a[0],imus[1].a[1],imus[1].a[2],imus[1].g[0],imus[1].g[1],imus[1].g[2],okB,fault);
 }
 if(fault){calibrated=false;calibrating=false;}else if(calibrating){calibrationSample();}else if(calibrated){if(dt>.025f){calibrated=false;}else for(auto &s:imus)fuse(s,dt);}
 if(uint32_t(now-sent)>=10000){sent=now;if(server->getConnectedCount())sendPacket();}
  if(uint32_t(micros()-previous)<3000)serviceHeart();
}

