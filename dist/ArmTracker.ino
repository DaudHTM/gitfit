// ESP32 Dev Module, Arduino-ESP32 3.x, NimBLE-Arduino 2.3.6.
// Mount each sensor securely in any orientation. Calibrate arm-down, then right-arm T-pose.
#include <Arduino.h>
#include <Wire.h>
#include <NimBLEDevice.h>
#include <atomic>
#include <math.h>

void setup();
void loop();
constexpr bool DEBUG_IMU = false; // Enable your original serial diagnostics when needed.
constexpr int SDA_PIN=21, SCL_PIN=22;
constexpr char SERVICE[]="8c310001-7a94-4b2d-b7bb-5de91f2d9a10";
constexpr char DATA[]="8c310002-7a94-4b2d-b7bb-5de91f2d9a10";
constexpr char CONTROL[]="8c310003-7a94-4b2d-b7bb-5de91f2d9a10";
// BEGIN CALIBRATION MATH
struct Q {float w=1,x=0,y=0,z=0;};
struct V {float x=0,y=0,z=0;};
Q mul(Q a,Q b);
Q normalize(Q q);
Q mul(Q a,Q b){return {a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z,a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w};}
Q normalize(Q q){float n=sqrtf(q.w*q.w+q.x*q.x+q.y*q.y+q.z*q.z);if(n<1e-9f)return {};return {q.w/n,q.x/n,q.y/n,q.z/n};}
float dot(V a,V b);
V cross(V a,V b);
V unit(V a);
bool frameFromPoses(V downGravity,V tGravity,Q &frame);
float dot(V a,V b){return a.x*b.x+a.y*b.y+a.z*b.z;}
V cross(V a,V b){return {a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x};}
V unit(V a){float n=sqrtf(dot(a,a));return n>1e-6f?V{a.x/n,a.y/n,a.z/n}:V{};}
bool frameFromPoses(V downGravity,V tGravity,Q &frame){
 if(dot(downGravity,downGravity)<.25f||dot(tGravity,tGravity)<.25f)return false;
 V z=unit(downGravity),tx=unit(tGravity);float projection=dot(z,tx);
 if(fabsf(projection)>.4f)return false; // Poses should differ by about 90 degrees.
 V x=unit({tx.x-projection*z.x,tx.y-projection*z.y,tx.z-projection*z.z});
 V y=cross(z,x);
 // Rows of sensor-to-world rotation: world X=right, Y=forward, Z=up.
 float m00=x.x,m01=x.y,m02=x.z,m10=y.x,m11=y.y,m12=y.z,m20=z.x,m21=z.y,m22=z.z;
 float trace=m00+m11+m22;Q q;
 if(trace>0){float k=2*sqrtf(trace+1);q={.25f*k,(m21-m12)/k,(m02-m20)/k,(m10-m01)/k};}
 else if(m00>m11&&m00>m22){float k=2*sqrtf(1+m00-m11-m22);q={(m21-m12)/k,.25f*k,(m01+m10)/k,(m02+m20)/k};}
 else if(m11>m22){float k=2*sqrtf(1+m11-m00-m22);q={(m02-m20)/k,(m01+m10)/k,.25f*k,(m12+m21)/k};}
 else{float k=2*sqrtf(1+m22-m00-m11);q={(m10-m01)/k,(m02+m20)/k,(m12+m21)/k,.25f*k};}
 frame=normalize(q);return true;
}
// END CALIBRATION MATH
// BEGIN POSE STABILITY
struct PoseWindow {
 unsigned count=0;
 float gyroMean[3]={},gyroM2[3]={},accMean[3]={},accM2[3]={};
 // Welford moments avoid subtracting nearly equal floating-point values.
 void add(const float a[3],const float g[3]){
  count++;
  for(int j=0;j<3;j++){
   float d=g[j]-gyroMean[j];gyroMean[j]+=d/count;gyroM2[j]+=d*(g[j]-gyroMean[j]);
   d=a[j]-accMean[j];accMean[j]+=d/count;accM2[j]+=d*(a[j]-accMean[j]);
  }
 }
 // 1 rotation, 2 gyro instability, 3 acceleration instability, 4 invalid acceleration.
 unsigned check(const float a[3],const float g[3]) const {
  float norm=sqrtf(a[0]*a[0]+a[1]*a[1]+a[2]*a[2]);
  if(norm<.65f||norm>1.35f)return 4;
  for(int j=0;j<3;j++)if(fabsf(g[j])>.95f)return 1;
  if(count>=100)for(int j=0;j<3;j++){
   if(fabsf(gyroMean[j])>.4f)return 1; // Reject sustained rotation, even if its speed is steady.
   if(gyroM2[j]/(count-1)>.04f)return 2; // stddev 0.20 rad/s: average natural hand tremor
   if(accM2[j]/(count-1)>.0225f)return 3; // stddev 0.15 g: tolerate gentle pose wobble
  }
  return 0;
 }
};
// Brief bumps pause sample collection instead of discarding the whole capture.
struct PoseStabilityGate {
 unsigned rejectedSamples=0;
 bool restart(unsigned reason){
  if(!reason){rejectedSamples=0;return false;}
  return ++rejectedSamples>=30; // 150 ms of sustained movement at 200 Hz
 }
};
// END POSE STABILITY
struct Imu{
 uint8_t addr;float a[3]={},g[3]={},bias[3]={};
 float downMean[3]={},downBias[3]={};
 PoseWindow pose;
 Q q{},reference{};
};
bool initImu(Imu &s);
bool readImu(Imu &s);
void fuse(Imu &s,float dt);
Imu imus[2]={{0x68},{0x69}};
NimBLEServer* server;NimBLECharacteristic* dataCharacteristic;
std::atomic<uint8_t> requestCalibration{0};
bool calibrated=false,calibrating=false,rejected=false,fault=false,poseError=false;
uint8_t calibrationStage=0; // 0 idle, 1 capturing down, 2 waiting for T, 3 capturing T
uint16_t samples=0,sequence=0;
uint32_t calibrationStart=0,windowStart=0,lastResetAt=0;
uint8_t resetReason=0;
constexpr uint32_t POSE_HOLD_MS=3000;
constexpr unsigned POSE_SAMPLES=600;
PoseStabilityGate stabilityGate;
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
void clearPoseWindow(){
 samples=0;windowStart=millis();stabilityGate=PoseStabilityGate{};
 for(auto &s:imus)s.pose=PoseWindow{};
}
void restartPoseWindow(uint8_t reason){
 resetReason=reason;lastResetAt=millis();
 static uint32_t printed=0;
 if(uint32_t(millis()-printed)>1000){printed=millis();Serial.printf("Calibration window restarted: sensor=%u reason=%u (1=rotation 2=gyro variation 3=accel variation 4=accel range)\n",(reason-1)/4,(reason-1)%4+1);}
 clearPoseWindow();
}
void beginCalibration(uint8_t command){
 resetReason=0;
 if(command==3){calibrationStage=0;calibrating=false;calibrated=false;rejected=false;poseError=false;return;}
 if(command==1){calibrationStage=1;for(auto &s:imus){s.q={};s.reference={};}}
 else if(command==2&&calibrationStage==2)calibrationStage=3;
 else return;
 calibrated=false;calibrating=true;rejected=false;poseError=false;calibrationStart=millis();clearPoseWindow();
}
void rejectPose(bool geometry){
 calibrating=false;calibrated=false;rejected=true;poseError=geometry;
 calibrationStage=calibrationStage==3?2:0; // Keep first capture so T can be retried.
}
void calibrationSample(){
 if(uint32_t(millis()-calibrationStart)>20000){rejectPose(false);return;}
 // Skip isolated bad samples from either sensor; only sustained movement resets.
 uint8_t bad=0;
 for(int i=0;i<2;i++){
  auto &s=imus[i];unsigned reason=s.pose.check(s.a,s.g);
  if(reason){bad=uint8_t(i*4+reason);break;}
 }
 if(bad){if(stabilityGate.restart(bad))restartPoseWindow(bad);return;}
 stabilityGate.restart(0);
 for(auto &s:imus)s.pose.add(s.a,s.g);
 samples++;
 if(uint32_t(millis()-windowStart)<POSE_HOLD_MS||samples<POSE_SAMPLES)return;
 // Include the final sample in the stability decision before accepting a pose.
 for(int i=0;i<2;i++)if(unsigned reason=imus[i].pose.check(imus[i].a,imus[i].g)){
  restartPoseWindow(uint8_t(i*4+reason));return;
 }
 if(calibrationStage==1){
  for(auto &s:imus)for(int j=0;j<3;j++){s.downMean[j]=s.pose.accMean[j];s.downBias[j]=s.pose.gyroMean[j];}
  calibrationStage=2;calibrating=false;samples=0;resetReason=0;Serial.println("Arm-down captured. Extend right arm sideways, palm down, then capture T-pose.");return;
 }
 Q frames[2];
 for(int i=0;i<2;i++){
  Imu &s=imus[i];V d={s.downMean[0],s.downMean[1],s.downMean[2]};V t={s.pose.accMean[0],s.pose.accMean[1],s.pose.accMean[2]};
  if(!frameFromPoses(d,t,frames[i])){rejectPose(true);Serial.println("T-pose rejected: keep elbow straight and arm horizontal to your right.");return;}
 }
 // At completion the person is still in T-pose, not arm-down.
 const Q downToT={.70710678f,0,-.70710678f,0};
 for(int i=0;i<2;i++){
  Imu &s=imus[i];s.reference=frames[i];s.q=mul(downToT,s.reference);
  for(int j=0;j<3;j++)s.bias[j]=.5f*(s.downBias[j]+s.pose.gyroMean[j]);
 }
 calibrationStage=0;calibrating=false;calibrated=true;rejected=false;poseError=false;resetReason=0;
 Serial.println("Two-pose calibration complete. Sensor mounting frames and gyro biases learned.");
}
class ServerCallbacks:public NimBLEServerCallbacks{void onConnect(NimBLEServer* s,NimBLEConnInfo& c)override{s->updateConnParams(c.getConnHandle(),6,12,0,200);}void onDisconnect(NimBLEServer*,NimBLEConnInfo&,int)override{requestCalibration.store(3);NimBLEDevice::startAdvertising();}} serverCallbacks;
class ControlCallbacks:public NimBLECharacteristicCallbacks{void onWrite(NimBLECharacteristic* c,NimBLEConnInfo&)override{auto v=c->getValue();if(v.size()==1&&uint8_t(v[0])>=1&&uint8_t(v[0])<=3)requestCalibration.store(uint8_t(v[0]));}} controlCallbacks;
void sendPacket(){uint8_t b[20]={};b[0]=sequence&255;b[1]=sequence>>8;sequence++;b[2]=128|(calibrated?1:0)|(calibrating?2:0)|(fault?4:0)|(rejected?8:0)|(calibrationStage>=2?16:0)|(calibrationStage==3?32:0)|(poseError?64:0);
 uint32_t progress=(millis()-windowStart)*100/POSE_HOLD_MS;
 uint32_t sampleProgress=uint32_t(samples)*100/POSE_SAMPLES;
 if(sampleProgress<progress)progress=sampleProgress;
 b[3]=calibrating?uint8_t(progress>99?99:progress):(calibrated||calibrationStage==2?100:0);
 if(resetReason&&((calibrating&&uint32_t(millis()-lastResetAt)<1000)||(rejected&&!poseError)))b[3]=128+resetReason;
 for(int i=0;i<2;i++){Q r=imus[i].reference;Q q=mul(imus[i].q,{r.w,-r.x,-r.y,-r.z});float values[4]={q.w,q.x,q.y,q.z};for(int j=0;j<4;j++){int16_t v=lroundf(fmaxf(-1,fminf(1,values[j]))*32767);b[4+i*8+j*2]=uint16_t(v)&255;b[5+i*8+j*2]=uint16_t(v)>>8;}}
 dataCharacteristic->setValue(b,sizeof(b));dataCharacteristic->notify();}
void setup(){Serial.begin(115200);Wire.begin(SDA_PIN,SCL_PIN,400000);Wire.setTimeOut(5);delay(100);bool ok=true;for(auto &s:imus){bool found=initImu(s);Serial.printf("MPU 0x%02x: %s\n",s.addr,found?"OK":"FAILED");ok&=found;}if(!ok){Serial.println("Fix wiring and reset ESP32.");while(true)delay(1000);}delay(100);
calibrated=false;
Serial.println("Two-pose calibration required: arm down, then right-arm T-pose.");
 NimBLEDevice::init("GitFit-ESP32");server=NimBLEDevice::createServer();server->setCallbacks(&serverCallbacks);auto service=server->createService(SERVICE);dataCharacteristic=service->createCharacteristic(DATA,NIMBLE_PROPERTY::NOTIFY);auto control=service->createCharacteristic(CONTROL,NIMBLE_PROPERTY::WRITE);control->setCallbacks(&controlCallbacks);service->start();auto adv=NimBLEDevice::getAdvertising();adv->setName("GitFit-ESP32");adv->addServiceUUID(SERVICE);adv->enableScanResponse(true);adv->start();
 Serial.println("Ready. Connect in Chrome, then calibrate.");}
void loop(){
  static uint32_t previous=micros(),sent=micros();uint32_t now=micros();if(uint32_t(now-previous)<5000){
    delay(1);return;
  }float dt=uint32_t(now-previous)*1e-6f;previous=now;uint8_t command=requestCalibration.exchange(0);if(command)beginCalibration(command);bool okA=readImu(imus[0]),okB=readImu(imus[1]);fault=!okA||!okB;
   static uint32_t dbg=0;
 if(DEBUG_IMU && millis()-dbg>300){dbg=millis();
  Serial.printf("imu0 a=[%.3f %.3f %.3f] g=[%.3f %.3f %.3f] ok=%d | imu1 a=[%.3f %.3f %.3f] g=[%.3f %.3f %.3f] ok=%d fault=%d\n",
   imus[0].a[0],imus[0].a[1],imus[0].a[2],imus[0].g[0],imus[0].g[1],imus[0].g[2],okA,
   imus[1].a[0],imus[1].a[1],imus[1].a[2],imus[1].g[0],imus[1].g[1],imus[1].g[2],okB,fault);
 }
 if(fault){calibrated=false;calibrating=false;calibrationStage=0;}else if(calibrating){calibrationSample();}else if(calibrated){if(dt>.025f){calibrated=false;}else for(auto &s:imus)fuse(s,dt);}
 if(uint32_t(now-sent)>=10000){sent=now;if(server->getConnectedCount())sendPacket();}
}
