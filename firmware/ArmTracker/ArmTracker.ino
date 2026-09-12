// ESP32 Dev Module, Arduino-ESP32 3.x, NimBLE-Arduino 2.3.6.
// Sensor X toward wrist, Y forward, Z to your right in arm-down pose.
#include <Arduino.h>
#include <Wire.h>
#include <NimBLEDevice.h>
#include <atomic>
#include <math.h>
constexpr int SDA_PIN=21, SCL_PIN=22;
constexpr char SERVICE[]="8c310001-7a94-4b2d-b7bb-5de91f2d9a10";
constexpr char DATA[]="8c310002-7a94-4b2d-b7bb-5de91f2d9a10";
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
std::atomic<bool> requestCalibration{false};
bool calibrated=false,calibrating=false,rejected=false,fault=false;uint16_t samples=0,sequence=0;uint32_t calibrationStart=0;
bool regWrite(uint8_t addr,uint8_t reg,uint8_t value){Wire.beginTransmission(addr);Wire.write(reg);Wire.write(value);return Wire.endTransmission()==0;}
bool readRegs(uint8_t addr,uint8_t reg,uint8_t* out,size_t n){Wire.beginTransmission(addr);Wire.write(reg);if(Wire.endTransmission(false)!=0)return false;if(Wire.requestFrom(addr,n,true)!=n)return false;for(size_t i=0;i<n;i++)out[i]=Wire.read();return true;}
bool initImu(Imu &s){uint8_t who=0;if(!readRegs(s.addr,0x75,&who,1)||(who&0x7e)!=0x68)return false;
 return regWrite(s.addr,0x6B,0x01)&&regWrite(s.addr,0x1A,0x02)&&regWrite(s.addr,0x19,0x04)&&regWrite(s.addr,0x1B,0x08)&&regWrite(s.addr,0x1C,0x08); // 94/98 Hz DLPF, 200 Hz, +/-500 dps, +/-4g
}
bool readImu(Imu &s){uint8_t b[14];if(!readRegs(s.addr,0x3B,b,14))return false;for(int i=0;i<3;i++){s.a[i]=int16_t((uint16_t(b[2*i])<<8)|b[2*i+1])/8192.0f;s.g[i]=int16_t((uint16_t(b[8+2*i])<<8)|b[9+2*i])*(PI/180.0f/65.5f);}return true;}
void fuse(Imu &s,float dt){float gx=s.g[0]-s.bias[0],gy=s.g[1]-s.bias[1],gz=s.g[2]-s.bias[2];Q q=s.q;float n=sqrtf(s.a[0]*s.a[0]+s.a[1]*s.a[1]+s.a[2]*s.a[2]);
 // Proportional gravity correction; suppress during substantial linear acceleration.
 if(n>.85f&&n<1.15f){float ax=s.a[0]/n,ay=s.a[1]/n,az=s.a[2]/n;float vx=2*(q.x*q.z-q.w*q.y),vy=2*(q.w*q.x+q.y*q.z),vz=1-2*(q.x*q.x+q.y*q.y);constexpr float kp=1.5f;gx+=kp*(ay*vz-az*vy);gy+=kp*(az*vx-ax*vz);gz+=kp*(ax*vy-ay*vx);}
 Q dq=mul(q,{0,gx,gy,gz});s.q=normalize({q.w+.5f*dq.w*dt,q.x+.5f*dq.x*dt,q.y+.5f*dq.y*dt,q.z+.5f*dq.z*dt});}
void beginCalibration(){calibrating=true;calibrated=false;rejected=false;samples=0;calibrationStart=millis();for(auto &s:imus)for(int j=0;j<3;j++)s.sum[j]=s.square[j]=0;}
void calibrationSample(){bool still=true;for(auto &s:imus){float n=sqrtf(s.a[0]*s.a[0]+s.a[1]*s.a[1]+s.a[2]*s.a[2]);if(n<.95f||n>1.05f||s.a[0]>-.95f||fabsf(s.a[1])>.15f||fabsf(s.a[2])>.15f)still=false;for(int j=0;j<3;j++)if(fabsf(s.g[j])>.15f)still=false;}
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
 NimBLEDevice::init("Armature-ESP32");server=NimBLEDevice::createServer();server->setCallbacks(&serverCallbacks);auto service=server->createService(SERVICE);dataCharacteristic=service->createCharacteristic(DATA,NIMBLE_PROPERTY::NOTIFY);auto control=service->createCharacteristic(CONTROL,NIMBLE_PROPERTY::WRITE);control->setCallbacks(&controlCallbacks);service->start();auto adv=NimBLEDevice::getAdvertising();adv->setName("Armature-ESP32");adv->addServiceUUID(SERVICE);adv->enableScanResponse(true);adv->start();Serial.println("Ready. Connect in Chrome, then calibrate.");}
void loop(){static uint32_t previous=micros(),sent=micros();uint32_t now=micros();if(uint32_t(now-previous)<5000){delay(1);return;}float dt=uint32_t(now-previous)*1e-6f;previous=now;if(requestCalibration.exchange(false))beginCalibration();bool okA=readImu(imus[0]),okB=readImu(imus[1]);fault=!okA||!okB;
 if(fault){calibrated=false;calibrating=false;}else if(calibrating){calibrationSample();}else if(calibrated){if(dt>.025f){calibrated=false;}else for(auto &s:imus)fuse(s,dt);}
 if(uint32_t(now-sent)>=10000){sent=now;if(server->getConnectedCount())sendPacket();}}
