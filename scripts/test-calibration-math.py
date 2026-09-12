from pathlib import Path
import subprocess,tempfile
source=Path('firmware/ArmTracker/ArmTracker.ino').read_text().split('// BEGIN CALIBRATION MATH')[1].split('// END CALIBRATION MATH')[0]
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
 Q result;assert(!frameFromPoses({0,0,1},{0,0,1},result));assert(!frameFromPoses({0,0,1},{0,0,-1},result));assert(!frameFromPoses({0,0,0},{1,0,0},result));
 std::cout<<"Passed 2000 arbitrary sensor mounts, T-pose initialization, and degenerate-pose rejection.\n";
}
'''
with tempfile.TemporaryDirectory(prefix='armature-calibration-') as tmp:
 file=Path(tmp)/'test.cpp';binary=Path(tmp)/'test';file.write_text('#include <cmath>\n'+source+test)
 subprocess.run(['/usr/bin/clang++','-std=c++17',str(file),'-o',str(binary)],check=True)
 subprocess.run([str(binary)],check=True)
