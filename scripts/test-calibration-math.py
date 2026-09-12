from pathlib import Path
import subprocess,tempfile
source=Path('firmware/ArmTracker/ArmTracker.ino').read_text().split('// BEGIN CALIBRATION MATH')[1].split('// END CALIBRATION MATH')[0]
source+=Path('firmware/ArmTracker/ArmTracker.ino').read_text().split('// BEGIN POSE STABILITY')[1].split('// END POSE STABILITY')[0]
test=r'''
#include <cassert>
#include <random>
#include <iostream>
V rotate(Q q,V v){Q a=mul(mul(q,{0,v.x,v.y,v.z}),{q.w,-q.x,-q.y,-q.z});return {a.x,a.y,a.z};}
float agreement(Q a,Q b){return fabsf(a.w*b.w+a.x*b.x+a.y*b.y+a.z*b.z);}
int main(){
 std::mt19937 generator(42);std::normal_distribution<float> random(0,1);
 const Q tRotation={.70710678f,0,-.70710678f,0};
 for(int i=0;i<2000;i++){
   Q expected=normalize({random(generator),random(generator),random(generator),random(generator)});
   Q inverse={expected.w,-expected.x,-expected.y,-expected.z};
   V down=rotate(inverse,{0,0,1}),t=rotate(inverse,{1,0,0});Q learned;
   assert(frameFromPoses(down,t,learned));assert(agreement(expected,learned)>.99999f);
   Q current=mul(tRotation,learned);Q relative=mul(current,{learned.w,-learned.x,-learned.y,-learned.z});
   V direction=rotate(relative,{0,0,-1});assert(fabsf(direction.x-1)<1e-5f);assert(fabsf(direction.z)<1e-5f);
   // The learned current frame must predict actual gravity in the T-pose.
   V gravity=rotate({current.w,-current.x,-current.y,-current.z},{0,0,1});
   assert(fabsf(gravity.x-t.x)<1e-5f&&fabsf(gravity.y-t.y)<1e-5f&&fabsf(gravity.z-t.z)<1e-5f);
 }
 PoseWindow stationary;std::normal_distribution<float> noise(0,.02f);
 for(int i=0;i<600;i++){float a[3]={noise(generator),noise(generator),1+noise(generator)};float g[3]={.12f+noise(generator),noise(generator),noise(generator)};stationary.add(a,g);assert(stationary.check(a,g)==0);}
 assert(stationary.gyroM2[0]/599>.0001f); // This realistic noise failed the former threshold.
 assert(fabsf(stationary.gyroMean[0]-.12f)<.01f);
 float a[3]={0,0,1},fast[3]={.7f,0,0};assert(stationary.check(a,fast)==1);
 // Small 8 Hz tremor is accepted while the mean pose and gyro bias remain accurate.
 PoseWindow tremor;
 for(int i=0;i<600;i++){
  float wave=sinf(i*2*3.1415926535f*8/200),cosine=cosf(i*2*3.1415926535f*8/200);
  float a[3]={.055f*wave,.035f*cosine,1+.015f*wave};float g[3]={.12f+.10f*wave,.08f*cosine,.04f*wave};
  tremor.add(a,g);assert(tremor.check(a,g)==0);
 }
 assert(fabsf(tremor.accMean[0])<.001f&&fabsf(tremor.accMean[1])<.001f);
 assert(fabsf(tremor.gyroMean[0]-.12f)<.001f);
 PoseWindow unstable;unsigned reason=0;
 for(int i=0;i<50;i++){float g[3]={i%2?.2f:-.2f,0,0};unstable.add(a,g);reason=unstable.check(a,g);}
 assert(reason==2);
 PoseWindow shaking;
 for(int i=0;i<50;i++){float b[3]={i%2?.15f:-.15f,0,1},g[3]={0,0,0};shaking.add(b,g);reason=shaking.check(b,g);}
 assert(reason==3);
 float invalid[3]={0,0,0},zero[3]={0,0,0};assert(stationary.check(invalid,zero)==4);
 std::cout<<"Passed stationary noise, small-tremor acceptance, bias averaging, and large-movement rejection.\n";
 Q result;assert(!frameFromPoses({0,0,1},{0,0,1},result));assert(!frameFromPoses({0,0,1},{0,0,-1},result));assert(!frameFromPoses({0,0,0},{1,0,0},result));
 std::cout<<"Passed 2000 arbitrary sensor mounts, T-pose initialization, and degenerate-pose rejection.\n";
}
'''
with tempfile.TemporaryDirectory(prefix='armature-calibration-') as tmp:
 file=Path(tmp)/'test.cpp';binary=Path(tmp)/'test';file.write_text('#include <cmath>\n'+source+test)
 subprocess.run(['/usr/bin/clang++','-std=c++17',str(file),'-o',str(binary)],check=True)
 subprocess.run([str(binary)],check=True)
