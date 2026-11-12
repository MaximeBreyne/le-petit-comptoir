// Generated material graph uses one evaluation for all PBR outputs.
// UV is in metres and is attached to each shape (moving objects never swim).
struct ComptoirSurface
{
    float hash(float2 p) { return frac(sin(dot(p,float2(127.1,311.7)))*43758.5453); }
    float noise(float2 p) {
        float2 i=floor(p),f=frac(p); f=f*f*(3-2*f);
        return lerp(lerp(hash(i),hash(i+float2(1,0)),f.x),lerp(hash(i+float2(0,1)),hash(i+1),f.x),f.y);
    }
    float edge(float2 p) { float2 f=frac(p); return min(min(f.x,1-f.x),min(f.y,1-f.y)); }
};
ComptoirSurface s;
float2 uv=UV;
if(Surface==10) uv=World.yx*.01; // Continuous parquet over the original floor.
float pixel=max(length(ddx(uv)),length(ddy(uv)));
float fine=1-smoothstep(.001,.008,pixel);
float medium=1-smoothstep(.008,.045,pixel);
float large=s.noise(uv*3.1),grain=s.noise(uv*170);
float3 colour=Tint.rgb;
float rough=BaseRoughness, height=0, ao=1;
if(Surface==0) { // Eggshell paint, fine orange peel.
    colour*=.96+.07*large; rough+=.045*(grain-.5)*fine;
    height=(grain-.5)*.012*fine;
}
if(Surface==1||Surface==10) {
    float plank=0,groove=1;
    float2 woodUV=uv;
    if(Surface==10) {
        float column=floor(uv.x/.18);
        float offset=s.hash(float2(column,7))*1.45;
        float2 cell=float2(uv.x/.18,(uv.y+offset)/1.45);
        plank=s.hash(floor(cell));
        float2 f=frac(cell),dist=min(f,1-f)*float2(.18,1.45);
        groove=smoothstep(.0008,.0028+pixel*.6,min(dist.x,dist.y));
        woodUV+=plank*13;
    }
    float warp=s.noise(woodUV*float2(7,.65));
    float fibres=s.noise(float2(woodUV.x*210+warp*7,woodUV.y*3.5));
    float ring=.5+.5*sin(woodUV.x*95+warp*9+s.noise(woodUV*2)*5);
    colour*=.78+.23*large+.10*ring*medium+.10*(fibres-.5)*fine;
    if(Surface==10) colour*=.88+.24*plank;
    colour*=lerp(.34,1,groove);
    rough+=.075*(1-ring)*medium+.05*(fibres-.5)*fine;
    height=(fibres-.5)*.022*fine-(1-groove)*.065*medium;
    ao=lerp(.7,1,groove);
}
if(Surface==2||Surface==4) {
    bool brick=Surface==4;
    float2 dimensions=brick?float2(.23,.075):float2(.30,.30);
    float2 cell=uv/dimensions;
    if(brick)cell.x+=fmod(abs(floor(cell.y)),2)*.5;
    float2 f=frac(cell),dist=min(f,1-f)*dimensions;
    float joint=brick?.004:.002;
    float edge=smoothstep(joint,joint+.002+pixel*.6,min(dist.x,dist.y));
    float variation=s.hash(floor(cell));
    float3 grout=brick?float3(.20,.19,.16):float3(.16,.17,.15);
    colour=lerp(grout,Tint.rgb*(.80+.3*variation+.09*(grain-.5)*fine),edge);
    rough=lerp(.92,BaseRoughness+.12*(variation-.5),edge);
    height=(edge-1)*(brick?.22:.08)*medium+(grain-.5)*(brick?.07:.009)*fine;
    ao=lerp(.78,1,edge);
}
if(Surface==3) { // Lime plaster: broad variation and submillimetre stipple.
    colour*=.93+.11*large; rough+=.06*(grain-.5)*fine;
    height=(s.noise(uv*35)-.5)*.035*medium+(grain-.5)*.025*fine;
}
if(Surface==5) { // Brushed brass / stainless; paint colours stay colour-authored.
    float brush=s.noise(uv*float2(550,5));
    colour*=.94+.08*large; rough+=.08*(brush-.5)*fine;
    height=(brush-.5)*.002*fine;
}
if(Surface==8||Surface==13) {
    float weave=sin(uv.x*2900)*sin(uv.y*2900);
    float pores=s.noise(uv*280);
    colour*=.94+.08*large+.045*weave*fine;
    rough+=.06*(pores-.5)*fine;
    height=Surface==8?weave*.018*fine:(pores-.5)*.018*fine;
}
if(Surface==9) { colour*=.97+.04*large; rough=.65; }
if(Surface==12) { // Honed stone, restrained veins and mineral flecks.
    float veins=pow(saturate(1-abs(sin(uv.x*4+uv.y*2+s.noise(uv*1.8)*5))),18);
    colour=lerp(Tint.rgb*(.90+.16*large),Tint.rgb*1.3,veins*.24*medium);
    rough+=.055*(grain-.5)*fine; height=(grain-.5)*.008*fine;
}
if(Surface==15) {
    colour*=.82+.22*large+.15*(grain-.5)*fine; rough=.92;
    height=(grain-.5)*.08*fine;
}
// Liquid stays amber in shadow; the separate glass shell supplies clear highlights.
if(Surface==16) {
    bool foam=Tint.b>.25&&Tint.r>.5;
    rough=foam?.78:.18; colour=Tint.rgb;
    height=foam?(grain-.5)*.018*fine:0;
}
Roughness=saturate(rough);
// Dark green/black metalwork is painted; only exposed brass and steel are metallic.
Metallic=Surface==5?lerp(.08,.88,smoothstep(.06,.17,dot(Tint.rgb,float3(.2126,.7152,.0722)))):0;
Occlusion=ao;
float3 n=normalize(Normal),dx=ddx(World),dy=ddy(World);
float3 r1=cross(dy,n),r2=cross(n,dx);
float determinant=dot(dx,r1);
float3 gradient=(ddx(height)*r1+ddy(height)*r2)*sign(determinant)/max(abs(determinant),.0001);
// Limit bump slopes at silhouettes and projection seams.
DetailNormal=normalize(n-clamp(gradient,-.35,.35));
float fresnel=pow(1-saturate(abs(dot(n,normalize(View)))),5);
GlassOpacity=.055+.30*fresnel;
return clamp(colour,0,.94);
