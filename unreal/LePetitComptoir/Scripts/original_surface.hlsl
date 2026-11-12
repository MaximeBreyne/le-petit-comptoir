// Coordinates and palette follow SourceArt/Scene/renderer.js. World arrives in Unreal cm.
// Keep the original wood grain, brick courses, tiling and plank proportions.
struct ComptoirNoise
{
    float hash(float2 p) { float3 q=frac(float3(p.x,p.y,p.x)*float3(.1031,.1030,.0973)); q+=dot(q,q.yzx+33.33); return frac((q.x+q.y)*q.z); }
    float noise(float2 p) { float2 i=floor(p),f=frac(p); f=f*f*(3-2*f); return lerp(lerp(hash(i),hash(i+float2(1,0)),f.x),lerp(hash(i+float2(0,1)),hash(i+1),f.x),f.y); }
    float border(float2 p) { float2 f=frac(p); return min(min(f.x,1-f.x),min(f.y,1-f.y)); }
};
ComptoirNoise Noise;
float3 world=World.yzx*.01, n=Normal.yzx;
float2 uv=abs(n.y)>.65?world.xz:(abs(n.x)>.65?world.zy:world.xy);
float footprint=max(length(ddx(uv)),length(ddy(uv)));
float detail=1-smoothstep(.003,.018,footprint), variation=1;
if(Surface==1) {
    float broad=Noise.noise(uv*float2(9,1.5));
    float grain=Noise.noise(uv*float2(110,2.4)+float2(broad*5,0));
    variation=.91+.11*broad+(grain-.5)*.075*detail;
} else if(Surface==2) {
    float2 tile=uv*1.65;
    float edge=smoothstep(.003,.009+footprint*1.1,Noise.border(tile));
    variation=lerp(.68,.95+.06*Noise.hash(floor(tile)),edge);
} else if(Surface==3) {
    variation=.97+.045*Noise.noise(uv*2.7)+(Noise.noise(uv*90)-.5)*.025*detail;
} else if(Surface==4) {
    float2 brick=uv*float2(2.8,8); brick.x+=fmod(floor(brick.y),2)*.5;
    float edge=smoothstep(.012,.032+footprint*2.8,Noise.border(brick));
    return lerp(pow(float3(.39,.37,.33),2.2),Tint*pow(.88+.19*Noise.hash(floor(brick)),2.2),edge);
} else if(Surface==10) {
    float column=floor(world.x/.19), boardLength=1.15+.55*Noise.hash(float2(column,3));
    float2 plank=float2(world.x/.19,world.z/boardLength+Noise.hash(float2(column,8))),f=frac(plank);
    float joint=min(min(f.x,1-f.x)*.19,min(f.y,1-f.y)*boardLength);
    float edge=smoothstep(.0004,.0013+footprint*.55,joint),board=Noise.hash(floor(plank));
    float grain=Noise.noise(world.xz*float2(130,2.2)+board*9),wear=Noise.noise(world.xz*float2(3,.8));
    variation=lerp(.76,.91+.15*board,edge)*(.96+.06*wear+(grain-.5)*.065*detail);
} else if(Surface==12) {
    variation=.94+.11*Noise.noise(uv*5)+(Noise.noise(uv*155)-.5)*.065*detail;
} else if(Surface==15) {
    variation=.88+.20*Noise.noise(uv*.7)+(Noise.noise(uv*130)-.5)*.16*detail;
}
return Tint*pow(max(variation,.01),2.2);
