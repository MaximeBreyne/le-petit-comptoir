/* Offline WebGL renderer: procedural materials, area lights, cached shadows and a label atlas. */
class BarRenderer {
 static maxContactPeople=29;
 constructor(canvas,boxes,{labels=[]}={}){
  this.canvas=canvas;
  this.sceneLabels=labels;
  this.gl=canvas.getContext('webgl',{alpha:false,antialias:true,depth:true,preserveDrawingBuffer:false,powerPreference:'high-performance'});
  if(!this.gl)throw new Error('Le rendu 3D nécessite WebGL. Activez l’accélération graphique de Windows puis relancez le jeu.');
  const gl=this.gl;
  const derivatives=!!gl.getExtension('OES_standard_derivatives');
  this.anisotropy=gl.getExtension('EXT_texture_filter_anisotropic');
  this.colors=new Map();this.scratch=new Float32Array(16384);this.dynamicCapacity=0;
  const vertex=`precision highp float;
   attribute vec3 position;attribute vec3 color;attribute float material;attribute vec3 normal;attribute vec2 texcoord;
   uniform mediump vec3 camera;uniform vec2 angle;uniform vec2 projection;
   varying vec3 tint;varying vec3 world;varying vec3 faceNormal;varying float surface;varying vec2 labelUV;varying float viewDepth;
   void main(){
    vec3 p=position-camera;float cy=cos(angle.x),sy=sin(angle.x),cp=cos(angle.y),sp=sin(angle.y);
    float x=p.x*cy-p.z*sy,z=p.x*sy+p.z*cy,y=p.y*cp-z*sp;z=p.y*sp+z*cp;
    gl_Position=vec4(x*projection.x,y*projection.y,1.002002*z-0.1001001,z);
    tint=color;world=position;faceNormal=normal;surface=material;labelUV=texcoord;viewDepth=z;
   }`;
  const shadowPosition=`uniform float buildingWidth;vec3 lightPosition(vec3 p){float extension=max(0.0,buildingWidth-12.0);p-=vec3(buildingWidth*.5,0.8,5.0);return vec3(dot(p,vec3(0.614,0.0,-0.789))/(9.0+extension*.45),dot(p,vec3(-0.649,0.574,-0.505))/(9.0+extension*.45),-dot(p,vec3(0.452,0.823,0.351))/(12.0+extension*.4));}`;
  const fragment=`${derivatives?'#extension GL_OES_standard_derivatives : enable':''}
   precision highp float;
   varying vec3 tint;varying vec3 world;varying vec3 faceNormal;varying float surface;varying vec2 labelUV;varying float viewDepth;
   uniform mediump vec3 camera;uniform float brightness;uniform float daylight;uniform float shadowFloor;uniform sampler2D labels;uniform sampler2D shadowMap;uniform vec2 shadowInfo;uniform vec4 people[${BarRenderer.maxContactPeople}];
   ${shadowPosition}
   float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
   float border(vec2 p){vec2 f=fract(p);return min(min(f.x,1.0-f.x),min(f.y,1.0-f.y));}
   float shadow(){
    if(shadowInfo.x<.5||world.y<shadowFloor-.05||world.y>shadowFloor+3.45)return 1.0;
    vec3 q=lightPosition(world)*.5+.5;
    if(q.x<.005||q.x>.995||q.y<.005||q.y>.995||q.z<0.0||q.z>1.0)return 1.0;
    // Compare each filter tap with the receiving plane at that tap, not with
    // the center depth. A fixed bias leaves diagonal acne on vertical faces.
    vec3 n=normalize(faceNormal),u=vec3(.614,0.0,-.789),v=vec3(-.649,.574,-.505),w=vec3(-.452,-.823,-.351);
    float extension=max(0.0,buildingWidth-12.0),ratio=(9.0+extension*.45)/(12.0+extension*.4),divisor=dot(n,cross(u,v));
    divisor=abs(divisor)<.05?(divisor<0.0?-.05:.05):divisor;
    vec2 slope=clamp(-ratio*vec2(dot(n,cross(v,w)),dot(n,cross(w,u)))/divisor,vec2(-8.0),vec2(8.0));
    float sum=0.0,bias=.00018;
    vec2 texel=q.xy/shadowInfo.y-.5,cell=floor(texel),blend=fract(texel);
    for(int x=0;x<=1;x++)for(int y=0;y<=1;y++){
     vec2 corner=vec2(float(x),float(y)),uv=(cell+corner+.5)*shadowInfo.y;
     vec4 storedDepth=texture2D(shadowMap,uv);
     float d=storedDepth.r+storedDepth.g/255.0;
     vec2 weight=mix(1.0-blend,blend,corner);
     sum+=(q.z+dot(slope,uv-q.xy)-bias<=d?1.0:0.0)*weight.x*weight.y;
    }
    return .30+.70*sum;
   }
   vec3 bump(vec3 n,float height){
    ${derivatives?'vec3 dx=dFdx(world),dy=dFdy(world),r1=cross(dy,n),r2=cross(n,dx);float det=dot(dx,r1);return normalize(abs(det)*n-sign(det)*(dFdx(height)*r1+dFdy(height)*r2));':'return n;'}
   }
   vec3 environment(vec3 direction){
    // A broad frontage and warm ceiling bounce give metal and varnish something
    // to reflect without a second scene render or a screen-space history buffer.
    vec3 sky=mix(vec3(.13,.15,.21),vec3(.56,.65,.73),daylight);
    vec3 room=mix(vec3(.11,.085,.055),vec3(.29,.27,.22),smoothstep(-.2,.8,direction.y));
    float frontage=smoothstep(.25,.85,direction.z)*(1.0-smoothstep(.45,.85,abs(direction.y)));
    float mullion=1.0-.45*(1.0-smoothstep(.018,.055,abs(direction.x)));
    return mix(room,sky,frontage*mullion);
   }
   void main(){
    vec3 n=normalize(faceNormal),base=tint;
    vec2 uv=abs(n.y)>.65?world.xz:(abs(n.x)>.65?world.zy:world.xy);
    float footprint=${derivatives?'max(length(dFdx(uv)),length(dFdy(uv)))':'.004'};
    float detail=1.0-smoothstep(.003,.018,footprint);
    float roughness=.65,spec=.055,height=0.0;
    if(surface>.5&&surface<1.5){
     float broad=noise(uv*vec2(9.0,1.5)),grain=noise(uv*vec2(110.0,2.4)+vec2(broad*5.0,0.0));
     base*=.91+.11*broad+(grain-.5)*.075*detail;roughness=.40+.14*broad;spec=.17;height=(grain-.5)*detail*.00018;
    }else if(surface>1.5&&surface<2.5){
     vec2 tile=uv*1.65;float aa=footprint*1.1;float edge=smoothstep(.003,.009+aa,border(tile));
     base*=mix(.68,.95+.06*hash(floor(tile)),edge);base*=.99+(noise(uv*90.0)-.5)*.025*detail;
     roughness=mix(.8,.32,edge);spec=.15;
    }else if(surface>2.5&&surface<3.5){
     float plaster=noise(uv*90.0);base*=.97+.045*noise(uv*2.7)+(plaster-.5)*.025*detail;roughness=.96;height=(plaster-.5)*detail*.00012;
    }else if(surface>3.5&&surface<4.5){
     vec2 brick=uv*vec2(2.8,8.0);brick.x+=mod(floor(brick.y),2.0)*.5;
     float edge=smoothstep(.012,.032+footprint*2.8,border(brick)),variation=.88+.19*hash(floor(brick));
     base=mix(vec3(.39,.37,.33),base*variation,edge);base*=.99+(noise(uv*70.0)-.5)*.09*detail;height=edge*.0018;roughness=.96;spec=.02;
    }else if(surface>4.5&&surface<5.5){
     base*=.98+(noise(uv*vec2(5.0,160.0))-.5)*.045*detail;roughness=.23;spec=.72;
    }else if(surface>5.5&&surface<6.5){roughness=.14;spec=.48;
    }else if(surface>7.5&&surface<8.5){float weave=noise(uv*150.0);base*=.98+(weave-.5)*.035*detail;height=(weave-.5)*detail*.00012;roughness=.94;spec=.018;
    }else if(surface>8.5&&surface<9.5){roughness=.68;spec=.065;
    }else if(surface>9.5&&surface<10.5){
     float column=floor(world.x/.19),length=1.15+.55*hash(vec2(column,3.0));
     vec2 plank=vec2(world.x/.19,world.z/length+hash(vec2(column,8.0))),f=fract(plank);
     float joint=min(min(f.x,1.0-f.x)*.19,min(f.y,1.0-f.y)*length);
     float edge=smoothstep(.0004,.0013+footprint*.55,joint),board=hash(floor(plank));
     float grain=noise(world.xz*vec2(130.0,2.2)+board*9.0),wear=noise(world.xz*vec2(3.0,.8));
     base*=mix(.76,.91+.15*board,edge)*(.96+.06*wear+(grain-.5)*.065*detail);
     roughness=.39+.19*wear;spec=.14;height=(grain-.5)*detail*.00015;
    }else if(surface>10.5&&surface<11.5){roughness=.09;spec=.58;
    }else if(surface>11.5&&surface<12.5){
     float stone=noise(uv*5.0),fleck=noise(uv*155.0);
     base*=.94+.11*stone+(fleck-.5)*.065*detail;roughness=.28+.12*stone;spec=.23;height=(fleck-.5)*detail*.00008;
    }else if(surface>12.5&&surface<13.5){
     float pores=noise(uv*130.0),folds=noise(uv*8.0);
     base*=.92+.09*folds+(pores-.5)*.045*detail;roughness=.47+.12*folds;spec=.19;height=(pores-.5)*detail*.00013;
    }
    if(labelUV.x>=0.0){base=texture2D(labels,labelUV).rgb;roughness=.82;spec=.04;height=0.0;}
    n=bump(n,height);
    vec3 v=normalize(camera-world),linear=pow(max(base,vec3(.001)),vec3(2.2));
    if(surface>10.5&&surface<11.5&&dot(n,v)<0.0)n=-n;
    float visibility=shadow();
    float contact=1.0;
    if(n.y>.5){for(int i=0;i<${BarRenderer.maxContactPeople};i++){if(abs(world.y-people[i].z)<.04){vec2 d=(world.xz-people[i].xy)/.43;contact*=1.0-people[i].w*.48*exp(-dot(d,d)*1.8);}}}
    // Cool daylight through the frontage, balanced with warm local pendant lights.
    float inside=1.0-smoothstep(9.9,10.4,world.z);
    float club=step(24.1,world.x)*(1.0-step(3.5,world.y));
    vec3 ambient=mix(mix(vec3(.23,.215,.19),vec3(.35,.38,.42),daylight),vec3(.22,.24,.34),club);
    ambient*=mix(.68+.32*daylight,1.0,inside)*(.78+.22*(n.y*.5+.5));
    if(labelUV.x>=0.0)ambient=max(ambient,vec3(.30,.29,.27));
    vec3 light=ambient*(.65+.35*visibility)*contact;
    vec3 key=normalize(vec3(.45,.82,.35));
    light+=mix(vec3(.065,.09,.14),vec3(.43,.49,.57),daylight)*max(0.0,dot(n,key))*visibility*(1.0-club*.7);
    vec3 reflection=vec3(0.0);float power=mix(120.0,7.0,roughness);
    for(int i=0;i<17;i++){
     if(i>=7&&buildingWidth<23.5)continue;
     if(i>=13&&buildingWidth<31.5)continue;
     float index=float(i-3);vec3 lampPosition=i<3?vec3(3.0+float(i)*3.0,2.62,4.5):vec3(14.25+floor(index*.5)*4.5,2.62,6.2+mod(index,2.0)*2.2);
     vec3 lampColor=vec3(1.72,1.28,.82);
     if(i>=7&&i<11){index=float(i-7);lampPosition=vec3(14.25+floor(index*.5)*4.5,6.22,6.2+mod(index,2.0)*2.2);}
     if(i==11)lampPosition=vec3(22.5,2.8,4.7);
     if(i==12)lampPosition=vec3(22.5,6.2,8.7);
     if(i>=13){index=float(i-13);lampPosition=vec3(26.0+mod(index,2.0)*4.0,2.8,6.0+floor(index*.5)*2.7);lampColor=mod(index,2.0)<.5?vec3(1.15,.56,1.75):vec3(.42,1.48,1.72);}
     float sameFloor=world.x>21.1&&world.x<23.9?1.0:(lampPosition.y>4.0?step(3.5,world.y):1.0-step(3.5,world.y));
     vec3 delta=lampPosition-world;
     float attenuation=inside*sameFloor*step(lampPosition.x,buildingWidth-.25)/(1.0+dot(delta,delta)*.42);vec3 l=normalize(delta);
     vec3 lamp=lampColor*attenuation*(.55+.45*max(0.0,l.y));
     light+=lamp*max(0.0,dot(n,l));
     reflection+=lamp*pow(max(0.0,dot(n,normalize(l+v))),power)*spec;
    }
    float fresnel=pow(1.0-max(0.0,dot(n,v)),5.0);
    vec3 reflected=environment(reflect(-v,n));
    float sheen=spec*(.04+.22*fresnel)*pow(1.0-roughness,2.0);
    reflection+=reflected*sheen*(surface>4.5&&surface<5.5?mix(vec3(.6),base,.65):vec3(1.0));
    if(surface>5.5&&surface<6.5)reflection+=reflected*(.045+.21*fresnel);
    if(surface>8.5&&surface<9.5)light+=vec3(.065,.025,.014)*pow(1.0-max(0.0,dot(n,v)),2.0);
    vec3 c=(linear*light+reflection)*brightness;
    if(surface>6.5&&surface<7.5)c=linear*1.65*brightness;
    // Filmic highlight rolloff followed by display gamma; neutral darks stay legible.
    c=clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.0,1.0);
    c=pow(c,vec3(1.0/2.2));
    float haze=clamp((viewDepth-12.0)*.006,0.0,.12);c=mix(c,vec3(.18,.21,.22),haze);
    // Only dedicated clear glass enters the sorted transparent pass. Existing
    // colored bottles remain opaque, avoiding transparency sorting artifacts.
    float alpha=1.0;
    if(surface>10.5&&surface<11.5){c=mix(base*.52,reflected,.55+.35*fresnel);alpha=.075+.38*fresnel;}
    gl_FragColor=vec4(c,alpha);
   }`;
  this.program=this.makeProgram(vertex,fragment);
  this.attributes=Object.fromEntries(['position','color','material','normal','texcoord'].map(k=>[k,gl.getAttribLocation(this.program,k)]));
  this.uniforms=Object.fromEntries(['camera','angle','projection','brightness','daylight','labels','shadowMap','shadowInfo','shadowFloor','buildingWidth','people[0]'].map(k=>[k,gl.getUniformLocation(this.program,k)]));
  this.shadowProgram=this.makeProgram(`precision highp float;attribute vec3 position;${shadowPosition}void main(){gl_Position=vec4(lightPosition(position),1.0);}`,`precision highp float;void main(){vec2 e=fract(gl_FragCoord.z*vec2(1.0,255.0));e.x-=e.y/255.0;gl_FragColor=vec4(e,0.0,1.0);}`);
  this.shadowAttribute=gl.getAttribLocation(this.shadowProgram,'position');
  this.shadowBuildingWidth=gl.getUniformLocation(this.shadowProgram,'buildingWidth');
  this.staticBuffer=gl.createBuffer();this.dynamicBuffer=gl.createBuffer();this.shadowBuffer=gl.createBuffer();this.glassBuffer=gl.createBuffer();this.glassCapacity=0;
  this.labelTexture=gl.createTexture();this.shadowTexture=gl.createTexture();this.shadowFramebuffer=gl.createFramebuffer();this.shadowDepth=gl.createRenderbuffer();
  this.people=new Float32Array(BarRenderer.maxContactPeople*4);this.shadowSize=0;this.shadowDirty=true;
  this.setScene(boxes);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;const error=document.getElementById('graphicsError');if(error)error.hidden=false;});
  canvas.addEventListener('webglcontextrestored',()=>location.reload());
 }
 makeProgram(vertex,fragment){
  const gl=this.gl,program=gl.createProgram();
  for(const [type,source]of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
   const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
   if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
   gl.attachShader(program,shader);gl.deleteShader(shader);
  }
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));return program;
 }
 resetAtlas(){
  const limit=this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE);
  this.atlas=document.createElement('canvas');this.atlas.width=Math.min(4096,limit);this.atlas.height=Math.min(2048,limit);
  this.atlasContext=this.atlas.getContext('2d');this.labelMap=new Map();this.atlasFreeRects=[{x:0,y:0,w:this.atlas.width,h:this.atlas.height}];this.atlasDirty=true;
 }
 labelAspect(b){
  const face=b.labelFace||'front',width=face==='left'||face==='right'?b.d:b.w,height=face==='top'||face==='bottom'?b.d:b.h;
  return Number((width/height).toFixed(5));
 }
 labelDimensions(b){
  const aspect=this.labelAspect(b),pixels=Math.min(1008,Math.max(64,b.labelPixels||1008)),resolution=this.atlas.width/4096;
  const w=Math.max(1,Math.round(Math.min(pixels,496*aspect)*resolution)),h=Math.max(1,Math.round(w/aspect));
  return {aspect,pixels,w,h,gutter:8};
 }
 allocateLabel(w,h){
  // MaxRects keeps gaps below short signs available to later labels. Existing
  // rectangles never move, so dynamic additions preserve already-uploaded UVs.
  let best=null,shortest=Infinity,longest=Infinity;
  for(const rect of this.atlasFreeRects){
   if(w>rect.w||h>rect.h)continue;
   const short=Math.min(rect.w-w,rect.h-h),long=Math.max(rect.w-w,rect.h-h);
   if(short<shortest||(short===shortest&&(long<longest||(long===longest&&(!best||rect.y<best.y||(rect.y===best.y&&rect.x<best.x)))))){best={x:rect.x,y:rect.y,w,h};shortest=short;longest=long;}
  }
  if(!best)throw Error('La texture des panneaux est pleine.');
  const next=[],right=best.x+w,bottom=best.y+h;
  for(const rect of this.atlasFreeRects){
   const farX=rect.x+rect.w,farY=rect.y+rect.h;
   if(right<=rect.x||best.x>=farX||bottom<=rect.y||best.y>=farY){next.push(rect);continue;}
   if(best.x>rect.x)next.push({x:rect.x,y:rect.y,w:best.x-rect.x,h:rect.h});
   if(right<farX)next.push({x:right,y:rect.y,w:farX-right,h:rect.h});
   if(best.y>rect.y)next.push({x:rect.x,y:rect.y,w:rect.w,h:best.y-rect.y});
   if(bottom<farY)next.push({x:rect.x,y:bottom,w:rect.w,h:farY-bottom});
  }
  this.atlasFreeRects=next.filter((rect,index)=>!next.some((other,otherIndex)=>otherIndex!==index&&other.x<=rect.x&&other.y<=rect.y&&other.x+other.w>=rect.x+rect.w&&other.y+other.h>=rect.y+rect.h&&(otherIndex<index||other.x!==rect.x||other.y!==rect.y||other.w!==rect.w||other.h!==rect.h)));
  return best;
 }
 label(b){
  if(!b.label&&!b.labelLines)return null;
  const lines=(b.labelLines||String(b.label).split('\n')).map(String);
  const {aspect,pixels,w,h,gutter}=this.labelDimensions(b),font=b.labelFont||'Arial, sans-serif';
  const key=JSON.stringify([lines,b.labelColor,b.labelBg||b.c,font,b.labelAlign,aspect,pixels]);
  if(this.labelMap.has(key))return this.labelMap.get(key);
  // Each sampled rectangle has the physical face's aspect ratio. Fixed 2:1
  // rectangles used to squash lettering on shelf tags and stretch wall posters.
  const packedW=w+gutter*2,packedH=h+gutter*2,allocation=this.allocateLabel(packedW,packedH);
  const x=allocation.x+gutter,y=allocation.y+gutter,ctx=this.atlasContext;
  ctx.fillStyle=b.labelBg||b.c;ctx.fillRect(allocation.x,allocation.y,packedW,packedH);
  ctx.fillStyle=b.labelColor||'#eee6d5';ctx.textAlign=b.labelAlign||'center';ctx.textBaseline='alphabetic';
  ctx.font=`700 100px ${font}`;
  const metrics=lines.map(line=>ctx.measureText(line)),ascent=Math.max(1,...metrics.map(m=>m.actualBoundingBoxAscent)),descent=Math.max(0,...metrics.map(m=>m.actualBoundingBoxDescent));
  const padX=w*.06,padY=h*.16,scale=Math.min((w-padX*2)/Math.max(1,...metrics.map(m=>m.width)),(h-padY*2)/(ascent+descent+(lines.length-1)*130));
  const blockHeight=(ascent+descent+(lines.length-1)*130)*scale;
  ctx.font=`700 ${100*scale}px ${font}`;
  const textX=x+(ctx.textAlign==='left'?padX:ctx.textAlign==='right'?w-padX:w/2);
  lines.forEach((line,i)=>ctx.fillText(line,textX,y+(h-blockHeight)/2+(ascent+i*130)*scale));
  const rect={u0:x/this.atlas.width,u1:(x+w)/this.atlas.width,v0:1-(y+h)/this.atlas.height,v1:1-y/this.atlas.height};
  this.labelMap.set(key,rect);this.atlasDirty=true;return rect;
 }
 uploadAtlas(){
  if(!this.atlasDirty)return;const gl=this.gl;gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.labelTexture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.atlas);gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  if(this.anisotropy)gl.texParameterf(gl.TEXTURE_2D,this.anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(this.anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);this.atlasDirty=false;
 }
 static topology(){
  if(this.unitGeometry)return this.unitGeometry;
  // Cache unit meshes once, retaining JS double precision until the final
  // transformed vertices are written to the GPU's Float32 buffer.
  const segments=16,rings=10,sphere=new Float64Array(segments*rings*6*3),circle=new Float64Array((segments+1)*2);
  let offset=0;
  const point=(i,j)=>{const p=-Math.PI/2+i*Math.PI/rings,t=j*Math.PI*2/segments;return [Math.cos(p)*Math.cos(t),Math.sin(p),Math.cos(p)*Math.sin(t)];};
  for(let i=0;i<rings;i++)for(let j=0;j<segments;j++){
   const a=point(i,j),c=point(i+1,j),d=point(i+1,j+1),e=point(i,j+1);
   for(const p of [a,c,d,a,d,e]){sphere[offset++]=p[0];sphere[offset++]=p[1];sphere[offset++]=p[2];}
  }
  for(let i=0;i<=segments;i++){const angle=i*Math.PI*2/segments;circle[i*2]=Math.cos(angle);circle[i*2+1]=Math.sin(angle);}
  return this.unitGeometry={segments,rings,sphere,circle,corners:[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],faces:[[0,1,2,0,2,3],[5,4,7,5,7,6],[4,0,3,4,3,7],[1,5,6,1,6,2],[3,2,6,3,6,7],[4,5,1,4,1,0]],normals:[[0,0,-1],[0,0,1],[-1,0,0],[1,0,0],[0,1,0],[0,-1,0]]};
 }
 sphereModel(b){
  // Heads, facial details and joints mostly translate between frames. Cache
  // their rotated/scaled mesh independently of position, color and material.
  // A strict LRU bound keeps continuously moving limbs from growing memory.
  if(!this.sphereModels)this.sphereModels=new Map();
  const key=[b.w,b.h,b.d,b.rx||0,b.ry||0,b.rz||0].join(','),cache=this.sphereModels;
  if(cache.has(key)){const hit=cache.get(key);cache.delete(key);cache.set(key,hit);return hit;}
  const source=BarRenderer.topology().sphere,data=new Float64Array(source.length*2);
  const cx=Math.cos(b.rx||0),sx=Math.sin(b.rx||0),cy=Math.cos(b.ry||0),sy=Math.sin(b.ry||0),cz=Math.cos(b.rz||0),sz=Math.sin(b.rz||0);
  for(let i=0,j=0;i<source.length;i+=3,j+=6){
   let x=source[i]*b.w/2,y=source[i+1]*b.h/2,z=source[i+2]*b.d/2;
   let nx=source[i]/Math.max(.00001,b.w),ny=source[i+1]/Math.max(.00001,b.h),nz=source[i+2]/Math.max(.00001,b.d);
   let a=y*cx-z*sx;z=y*sx+z*cx;y=a;a=x*cy+z*sy;z=-x*sy+z*cy;x=a;a=x*cz-y*sz;y=x*sz+y*cz;x=a;
   a=ny*cx-nz*sx;nz=ny*sx+nz*cx;ny=a;a=nx*cy+nz*sy;nz=-nx*sy+nz*cy;nx=a;a=nx*cz-ny*sz;ny=nx*sz+ny*cz;nx=a;
   const length=Math.hypot(nx,ny,nz)||1;
   data[j]=x;data[j+1]=y;data[j+2]=z;data[j+3]=nx/length;data[j+4]=ny/length;data[j+5]=nz/length;
  }
  if(cache.size>=256)cache.delete(cache.keys().next().value);cache.set(key,data);return data;
 }
 mesh(boxes){
  const {segments,rings,circle,corners,faces,normals}=BarRenderer.topology();
  let needed=0;for(const b of boxes)needed+=(b.shape==='sphere'?segments*rings*6:b.round||b.shape==='cylinder'?segments*12:36)*12;
  if(this.scratch.length<needed)this.scratch=new Float32Array(Math.max(needed,this.scratch.length*2));
  const out=this.scratch;let offset=0;
  for(const b of boxes){
   let rgb=this.colors.get(b.c);if(!rgb){const hex=b.c||'#ffffff';rgb=[parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255];this.colors.set(b.c,rgb)}
   let sideRGB=rgb;if(b.sideColor){sideRGB=this.colors.get(b.sideColor);if(!sideRGB){sideRGB=[1,3,5].map(index=>parseInt(b.sideColor.slice(index,index+2),16)/255);this.colors.set(b.sideColor,sideRGB)}}
   const mat=b.mat??b.wood??(['#b39872','#634631','#d4b27c','#ba9968','#a98555','#684d37'].includes(b.c)?1:0);
   const cx=Math.cos(b.rx||0),sx=Math.sin(b.rx||0),cy=Math.cos(b.ry||0),sy=Math.sin(b.ry||0),cz=Math.cos(b.rz||0),sz=Math.sin(b.rz||0);
   const halfW=b.w/2,halfH=b.h/2,halfD=b.d/2,normalW=Math.max(.00001,b.w),normalH=Math.max(.00001,b.h),normalD=Math.max(.00001,b.d);
   const emit=(x,y,z,nx,ny,nz,u=-1,v=-1)=>{
    const color=Math.abs(ny)<.25?sideRGB:rgb;
    x*=halfW;y*=halfH;z*=halfD;
    let a=y*cx-z*sx;z=y*sx+z*cx;y=a;a=x*cy+z*sy;z=-x*sy+z*cy;x=a;a=x*cz-y*sz;y=x*sz+y*cz;x=a;
    nx/=normalW;ny/=normalH;nz/=normalD;
    a=ny*cx-nz*sx;nz=ny*sx+nz*cx;ny=a;a=nx*cy+nz*sy;nz=-nx*sy+nz*cy;nx=a;a=nx*cz-ny*sz;ny=nx*sz+ny*cz;nx=a;
    const length=Math.hypot(nx,ny,nz)||1;
    out[offset++]=b.x+x;out[offset++]=b.y+y;out[offset++]=b.z+z;out[offset++]=color[0];out[offset++]=color[1];out[offset++]=color[2];out[offset++]=mat;out[offset++]=nx/length;out[offset++]=ny/length;out[offset++]=nz/length;out[offset++]=u;out[offset++]=v;
   };
   if(b.shape==='sphere'){
    const model=this.sphereModel(b);
    for(let i=0;i<model.length;i+=6){
     out[offset++]=b.x+model[i];out[offset++]=b.y+model[i+1];out[offset++]=b.z+model[i+2];
     out[offset++]=rgb[0];out[offset++]=rgb[1];out[offset++]=rgb[2];out[offset++]=mat;
     out[offset++]=model[i+3];out[offset++]=model[i+4];out[offset++]=model[i+5];out[offset++]=-1;out[offset++]=-1;
    }
   }else if(b.round||b.shape==='cylinder'){
    const top=b.topRadius??1,bottom=b.bottomRadius??1,slope=(bottom-top)/2;
    for(let i=0;i<segments;i++){
     const px=circle[i*2],pz=circle[i*2+1],qx=circle[i*2+2],qz=circle[i*2+3];
     const bx=px*bottom,bz=pz*bottom,cx=qx*bottom,cz=qz*bottom,tx=px*top,tz=pz*top,ux=qx*top,uz=qz*top;
     emit(bx,-1,bz,px,slope,pz);emit(cx,-1,cz,qx,slope,qz);emit(ux,1,uz,qx,slope,qz);
     emit(bx,-1,bz,px,slope,pz);emit(ux,1,uz,qx,slope,qz);emit(tx,1,tz,px,slope,pz);
     emit(0,-1,0,0,-1,0);emit(bx,-1,bz,0,-1,0);emit(cx,-1,cz,0,-1,0);
     emit(0,1,0,0,1,0);emit(tx,1,tz,0,1,0);emit(ux,1,uz,0,1,0);
    }
   }else{
    const label=this.label(b),labelFace={front:0,back:1,left:2,right:3,top:4,bottom:5}[b.labelFace||'front'];
    for(let i=0;i<faces.length;i++)for(const k of faces[i]){
     const p=corners[k],n=normals[i];let u=-1,v=-1;
     if(label&&i===labelFace){let tx=(p[0]+1)/2,ty=(p[1]+1)/2;if(i===1)tx=1-tx;if(i===2)tx=(1-p[2])/2;if(i===3)tx=(p[2]+1)/2;if(i===4)ty=(p[2]+1)/2;if(i===5)ty=(1-p[2])/2;u=label.u0+tx*(label.u1-label.u0);v=label.v0+ty*(label.v1-label.v0)}
     emit(p[0],p[1],p[2],n[0],n[1],n[2],u,v);
    }
   }
  }
  return out.subarray(0,offset);
 }
 setScene(boxes){
  const gl=this.gl;this.resetAtlas();
  this.buildingWidth=Math.max(12,...boxes.filter(box=>box.roomFloor||box.mat===10&&box.y<0).map(box=>box.x+box.w/2));
  this.hasUpstairs=boxes.some(box=>box.roomFloor&&box.y>3);
  // Largest regions first; stable ties keep packing deterministic across reloads.
  [...boxes,...this.sceneLabels].filter(b=>b.label||b.labelLines).map(b=>({box:b,...this.labelDimensions(b)})).sort((a,b)=>(b.w+16)*(b.h+16)-(a.w+16)*(a.h+16)||b.h-a.h||b.w-a.w).forEach(item=>this.label(item.box));
  this.staticGlass=boxes.filter(b=>b.mat===11);
  let data=this.mesh(boxes.filter(b=>b.mat!==11));gl.bindBuffer(gl.ARRAY_BUFFER,this.staticBuffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);this.count=data.length/12;
  const casters=boxes.filter(b=>b.castShadow!==false&&b.shadow!==false&&b.mat!==6&&b.mat!==7&&b.mat!==11&&!(b.h>2.7&&(b.w>10||b.d>9))&&!(b.w>11&&b.d>9));
  this.groundShadowMesh=this.mesh(casters.filter(b=>b.y-b.h/2<2.7)).slice();
  this.upperShadowMesh=this.hasUpstairs?this.mesh(casters.filter(b=>b.y-b.h/2>=3.5&&b.y-b.h/2<6.3)).slice():null;
  data=this.groundShadowMesh;gl.bindBuffer(gl.ARRAY_BUFFER,this.shadowBuffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);this.shadowCount=data.length/12;this.shadowFloor=0;this.shadowDirty=true;this.uploadAtlas();
 }
 resize(settings){
  const ratio={low:.65,medium:1,high:Math.min(Math.max(devicePixelRatio||1,1.5),2)}[settings.quality]||1;
  const width=Math.max(1,Math.round(this.canvas.clientWidth*ratio)),height=Math.max(1,Math.round(this.canvas.clientHeight*ratio));
  if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height}
 }
 renderShadows(size){
  const gl=this.gl;if(this.shadowSize!==size){
   this.shadowSize=size;this.shadowDirty=true;gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.shadowTexture);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,size,size,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   gl.bindRenderbuffer(gl.RENDERBUFFER,this.shadowDepth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,size,size);
   gl.bindFramebuffer(gl.FRAMEBUFFER,this.shadowFramebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.shadowTexture,0);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,this.shadowDepth);
   this.shadowSupported=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
  }
  if(this.shadowDirty&&this.shadowSupported){
   // Dithering color channels corrupts our packed RG depth by a full 1/255,
   // producing patterned self-shadowing on metal, walls and shelving.
   const dither=gl.isEnabled(gl.DITHER);gl.disable(gl.DITHER);
   gl.bindFramebuffer(gl.FRAMEBUFFER,this.shadowFramebuffer);gl.viewport(0,0,size,size);gl.useProgram(this.shadowProgram);gl.clearColor(1,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   gl.uniform1f(this.shadowBuildingWidth,this.buildingWidth);
   for(const attribute of Object.values(this.attributes))if(attribute!==this.shadowAttribute)gl.disableVertexAttribArray(attribute);
   gl.bindBuffer(gl.ARRAY_BUFFER,this.shadowBuffer);gl.enableVertexAttribArray(this.shadowAttribute);gl.vertexAttribPointer(this.shadowAttribute,3,gl.FLOAT,false,48,0);gl.drawArrays(gl.TRIANGLES,0,this.shadowCount);this.shadowDirty=false;
   if(dither)gl.enable(gl.DITHER);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
 }
 draw(buffer,count){
  const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  for(const [key,size,offset]of [['position',3,0],['color',3,12],['material',1,24],['normal',3,28],['texcoord',2,40]]){gl.enableVertexAttribArray(this.attributes[key]);gl.vertexAttribPointer(this.attributes[key],size,gl.FLOAT,false,48,offset)}
  gl.drawArrays(gl.TRIANGLES,0,count);
 }
 static daylightAt(time=1020){
  const t=Math.max(0,Math.min(1,((Number.isFinite(time)?time:1020)-1050)/330));
  return 1-t*t*(3-2*t);
 }
 static characterVisible(bounds,camera,fov,aspect){
  const dx=bounds.x-camera.x,dy=bounds.y-camera.y,dz=bounds.z-camera.z,radius=bounds.radius;
  if(![dx,dy,dz,radius,fov,aspect].every(Number.isFinite)||radius<=0||aspect<=0)return true;
  const cosine=Math.cos(camera.a),sine=Math.sin(camera.a),cp=Math.cos(camera.pitch||0),sp=Math.sin(camera.pitch||0);
  const x=dx*cosine-dz*sine,forward=dx*sine+dz*cosine,y=dy*cp-forward*sp,z=dy*sp+forward*cp;
  // Reject only wholly invisible spheres. Near-plane intersections and generous
  // limb/head margins remain visible, including on the staircase and at edges.
  if(z < -radius)return false;if(Math.hypot(dx,dy,dz)<=radius)return true;
  const tangentY=Math.tan(fov*Math.PI/360),tangentX=tangentY*aspect;
  return Math.abs(x)<=z*tangentX+radius*Math.hypot(1,tangentX)&&Math.abs(y)<=z*tangentY+radius*Math.hypot(1,tangentY);
 }
 contactShadows(dynamic){
  this.people.fill(0);let person=0;
  for(const b of dynamic){if(b.contactShadow&&person<BarRenderer.maxContactPeople){this.people[person*4]=b.x;this.people[person*4+1]=b.z;this.people[person*4+2]=Number.isFinite(b.contactFloor)?b.contactFloor:0;this.people[person*4+3]=1;person++}}
 }
 render(camera,dynamic,settings,serviceTime=1020){
  if(this.lost)return;this.resize(settings);const gl=this.gl;
  const shadowFloor=this.hasUpstairs&&camera.y>4.5?3.6:0;
  if(shadowFloor!==this.shadowFloor){const mesh=shadowFloor?this.upperShadowMesh:this.groundShadowMesh;gl.bindBuffer(gl.ARRAY_BUFFER,this.shadowBuffer);gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);this.shadowCount=mesh.length/12;this.shadowFloor=shadowFloor;this.shadowDirty=true;}
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);gl.depthMask(true);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.clearDepth(1);
  this.renderShadows(settings.quality==='high'?2048:1024);
  gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.useProgram(this.program);gl.clearColor(.13,.17,.19,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const focal=1/Math.tan(settings.fov*Math.PI/360);
  gl.uniform3f(this.uniforms.camera,camera.x,camera.y,camera.z);gl.uniform2f(this.uniforms.angle,camera.a,camera.pitch||0);gl.uniform2f(this.uniforms.projection,focal/(this.canvas.width/this.canvas.height),focal);gl.uniform1f(this.uniforms.brightness,settings.brightness/100);gl.uniform1f(this.uniforms.daylight,BarRenderer.daylightAt(serviceTime));
  gl.uniform1f(this.uniforms.buildingWidth,this.buildingWidth);
  gl.uniform1f(this.uniforms.shadowFloor,this.shadowFloor);
  this.contactShadows(dynamic);
  gl.uniform4fv(this.uniforms['people[0]'],this.people);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.labelTexture);gl.uniform1i(this.uniforms.labels,0);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.shadowTexture);gl.uniform1i(this.uniforms.shadowMap,1);gl.uniform2f(this.uniforms.shadowInfo,settings.quality!=='low'&&this.shadowSupported?1:0,1/this.shadowSize);
  this.draw(this.staticBuffer,this.count);
  const opaque=[],glass=[...this.staticGlass],visibility=new Map();let visibleCharacters=0;
  for(const shape of dynamic){
   const bounds=shape.characterBounds;
   if(bounds){
    if(!visibility.has(bounds)){const visible=BarRenderer.characterVisible(bounds,camera,settings.fov,this.canvas.width/this.canvas.height);visibility.set(bounds,visible);if(visible)visibleCharacters++;}
    if(!visibility.get(bounds))continue;
   }
   (shape.mat===11?glass:opaque).push(shape);
  }
  this.visibleCharacters=visibleCharacters;this.totalCharacters=visibility.size;
  if(opaque.length){const data=this.mesh(opaque);this.uploadAtlas();gl.bindBuffer(gl.ARRAY_BUFFER,this.dynamicBuffer);if(data.byteLength>this.dynamicCapacity){this.dynamicCapacity=Math.max(data.byteLength,this.dynamicCapacity*2);gl.bufferData(gl.ARRAY_BUFFER,this.dynamicCapacity,gl.DYNAMIC_DRAW)}gl.bufferSubData(gl.ARRAY_BUFFER,0,data);this.draw(this.dynamicBuffer,data.length/12)}
  if(glass.length){
   const cp=Math.cos(camera.pitch||0),fx=Math.sin(camera.a)*cp,fy=Math.sin(camera.pitch||0),fz=Math.cos(camera.a)*cp;
   // Transparent panes retain opaque depth testing but never hide the objects
   // behind them. Sort in view direction, not distance, for oblique views.
   glass.sort((a,b)=>(b.x-a.x)*fx+(b.y-a.y)*fy+(b.z-a.z)*fz);
   const data=this.mesh(glass);gl.bindBuffer(gl.ARRAY_BUFFER,this.glassBuffer);
   if(data.byteLength>this.glassCapacity){this.glassCapacity=Math.max(data.byteLength,this.glassCapacity*2);gl.bufferData(gl.ARRAY_BUFFER,this.glassCapacity,gl.DYNAMIC_DRAW)}
   gl.bufferSubData(gl.ARRAY_BUFFER,0,data);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
   this.draw(this.glassBuffer,data.length/12);gl.depthMask(true);gl.disable(gl.BLEND);
  }
 }
}
