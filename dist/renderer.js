/* Offline WebGL renderer: procedural materials, area lights, cached shadows and a label atlas. */
class BarRenderer {
 constructor(canvas,boxes){
  this.canvas=canvas;
  this.gl=canvas.getContext('webgl',{alpha:false,antialias:true,depth:true,preserveDrawingBuffer:false,powerPreference:'high-performance'});
  if(!this.gl)throw new Error('Le rendu 3D nécessite WebGL. Activez l’accélération graphique de Windows puis relancez le jeu.');
  const gl=this.gl;
  const derivatives=!!gl.getExtension('OES_standard_derivatives');
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
  const shadowPosition=`vec3 lightPosition(vec3 p){p-=vec3(6.0,0.8,5.0);return vec3(dot(p,vec3(0.614,0.0,-0.789))/9.0,dot(p,vec3(-0.649,0.574,-0.505))/9.0,-dot(p,vec3(0.452,0.823,0.351))/12.0);}`;
  const fragment=`${derivatives?'#extension GL_OES_standard_derivatives : enable':''}
   precision highp float;
   varying vec3 tint;varying vec3 world;varying vec3 faceNormal;varying float surface;varying vec2 labelUV;varying float viewDepth;
   uniform mediump vec3 camera;uniform float brightness;uniform sampler2D labels;uniform sampler2D shadowMap;uniform vec2 shadowInfo;uniform vec4 people[3];
   ${shadowPosition}
   float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
   float border(vec2 p){vec2 f=fract(p);return min(min(f.x,1.0-f.x),min(f.y,1.0-f.y));}
   float shadow(){
    if(shadowInfo.x<.5)return 1.0;
    vec3 q=lightPosition(world)*.5+.5;
    if(q.x<.005||q.x>.995||q.y<.005||q.y>.995||q.z<0.0||q.z>1.0)return 1.0;
    float sum=0.0,bias=.0014+.0014*(1.0-max(0.0,dot(normalize(faceNormal),vec3(.452,.823,.351))));
    for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){
     vec4 storedDepth=texture2D(shadowMap,q.xy+vec2(float(x),float(y))*shadowInfo.y);
     float d=storedDepth.r+storedDepth.g/255.0;
     sum+=q.z-bias<=d?1.0:0.0;
    }
    return .30+.70*sum/9.0;
   }
   vec3 bump(vec3 n,float height){
    ${derivatives?'vec3 dx=dFdx(world),dy=dFdy(world),r1=cross(dy,n),r2=cross(n,dx);float det=dot(dx,r1);return normalize(abs(det)*n-sign(det)*(dFdx(height)*r1+dFdy(height)*r2));':'return n;'}
   }
   void main(){
    vec3 n=normalize(faceNormal),base=tint;
    vec2 uv=abs(n.y)>.65?world.xz:(abs(n.x)>.65?world.zy:world.xy);
    float roughness=.7,spec=.055,height=0.0;
    if(surface>.5&&surface<1.5){
     float grain=noise(uv*vec2(96.0,1.6))+noise(uv*vec2(220.0,4.0))*.35;
     base*=.94+.055*grain;roughness=.5;spec=.10;height=grain*.00025;
    }else if(surface>1.5&&surface<2.5){
     vec2 tile=uv*1.65;float aa=${derivatives?'max(fwidth(tile.x),fwidth(tile.y))*.7':'.002'};float edge=smoothstep(.009,.023+aa,border(tile));
     base*=mix(.48,.92+.10*hash(floor(tile)),edge);base*=.98+.035*noise(uv*90.0);
     roughness=.36;spec=.13;height=0.0;
    }else if(surface>2.5&&surface<3.5){
     float plaster=noise(uv*120.0);base*=.98+.025*plaster;roughness=.95;height=plaster*.00015;
    }else if(surface>3.5&&surface<4.5){
     vec2 brick=uv*vec2(1.8,4.7);brick.x+=mod(floor(brick.y),2.0)*.5;
     float edge=smoothstep(.025,.07,border(brick));float variation=.84+.22*hash(floor(brick));
     base=mix(vec3(.22,.205,.18),base*variation,edge);base*=.95+.07*noise(uv*95.0);height=edge*.005;roughness=.95;
    }else if(surface>4.5&&surface<5.5){
     base*=.97+.04*noise(uv*vec2(6.0,180.0));roughness=.23;spec=.65;
    }else if(surface>5.5&&surface<6.5){roughness=.12;spec=.55;
    }else if(surface>7.5&&surface<8.5){float weave=noise(uv*180.0);base*=.96+.06*weave;height=weave*.0003;roughness=.92;
    }else if(surface>8.5&&surface<9.5){roughness=.75;spec=.08;
    }else if(surface>9.5&&surface<10.5){
     vec2 plank=world.xz/vec2(.18,1.2);plank.y+=mod(floor(plank.x),2.0)*.5;
     vec2 f=fract(plank);float joint=min(min(f.x,1.0-f.x)*.18,min(f.y,1.0-f.y)*1.2);
     float aa=${derivatives?'max(fwidth(world.x),fwidth(world.z))*.6':'.001'};
     float edge=smoothstep(.001,.003+aa,joint),grain=noise(world.xz*vec2(160.0,3.0));
     base*=mix(.55,.83+.20*hash(floor(plank)),edge)*(.94+.09*grain);roughness=.53;spec=.085;height=grain*.0002;
    }
    if(labelUV.x>=0.0){base=texture2D(labels,labelUV).rgb;roughness=.82;spec=.04;}
    n=bump(n,height);
    vec3 v=normalize(camera-world),linear=pow(max(base,vec3(.001)),vec3(2.2));
    float visibility=shadow();
    float contact=1.0;
    if(world.y<.04){for(int i=0;i<3;i++){vec2 d=(world.xz-people[i].xy)/max(people[i].z,.01);contact*=1.0-people[i].w*.40*exp(-dot(d,d)*1.8);}}
    // Cool daylight through the frontage, balanced with warm local pendant lights.
    vec3 ambient=mix(vec3(.30,.31,.33),vec3(.43,.47,.52),n.y*.5+.5);
    vec3 light=ambient*(.65+.35*visibility)*contact;
    vec3 key=normalize(vec3(.45,.82,.35));
    light+=vec3(.43,.49,.57)*max(0.0,dot(n,key))*visibility;
    vec3 reflection=vec3(0.0);float power=mix(120.0,7.0,roughness);
    for(int i=0;i<3;i++){
     vec3 delta=vec3(3.0+float(i)*3.0,2.62,4.5)-world;
     float attenuation=1.0/(1.0+dot(delta,delta)*.65);vec3 l=normalize(delta);
     vec3 lamp=vec3(1.55,1.19,.78)*attenuation;
     light+=lamp*max(0.0,dot(n,l));
     reflection+=lamp*pow(max(0.0,dot(n,normalize(l+v))),power)*spec;
    }
    float fresnel=pow(1.0-max(0.0,dot(n,v)),5.0);
    if(surface>5.5&&surface<6.5){linear=mix(linear,vec3(.17,.22,.25),fresnel*.55);reflection+=vec3(.10,.14,.17)*fresnel;}
    vec3 c=(linear*light+reflection)*brightness;
    if(surface>6.5&&surface<7.5)c=linear*1.65*brightness;
    // Filmic highlight rolloff followed by display gamma; neutral darks stay legible.
    c=clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.0,1.0);
    c=pow(c,vec3(1.0/2.2));
    float haze=clamp((viewDepth-12.0)*.006,0.0,.12);c=mix(c,vec3(.18,.21,.22),haze);
    gl_FragColor=vec4(c,1.0);
   }`;
  this.program=this.makeProgram(vertex,fragment);
  this.attributes=Object.fromEntries(['position','color','material','normal','texcoord'].map(k=>[k,gl.getAttribLocation(this.program,k)]));
  this.uniforms=Object.fromEntries(['camera','angle','projection','brightness','labels','shadowMap','shadowInfo','people[0]'].map(k=>[k,gl.getUniformLocation(this.program,k)]));
  this.shadowProgram=this.makeProgram(`precision highp float;attribute vec3 position;${shadowPosition}void main(){gl_Position=vec4(lightPosition(position),1.0);}`,`precision highp float;void main(){vec2 e=fract(gl_FragCoord.z*vec2(1.0,255.0));e.x-=e.y/255.0;gl_FragColor=vec4(e,0.0,1.0);}`);
  this.shadowAttribute=gl.getAttribLocation(this.shadowProgram,'position');
  this.staticBuffer=gl.createBuffer();this.dynamicBuffer=gl.createBuffer();this.shadowBuffer=gl.createBuffer();
  this.labelTexture=gl.createTexture();this.shadowTexture=gl.createTexture();this.shadowFramebuffer=gl.createFramebuffer();this.shadowDepth=gl.createRenderbuffer();
  this.people=new Float32Array(12);this.shadowSize=0;this.shadowDirty=true;
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
  this.atlas=document.createElement('canvas');this.atlas.width=4096;this.atlas.height=2048;this.atlasContext=this.atlas.getContext('2d');this.labelMap=new Map();this.atlasDirty=true;
 }
 label(b){
  if(!b.label&&!b.labelLines)return null;
  const lines=b.labelLines||String(b.label).split('\n');
  const key=JSON.stringify([lines,b.labelColor,b.labelBg||b.c,b.labelSize,b.labelAlign]);
  if(this.labelMap.has(key))return this.labelMap.get(key);
  const index=this.labelMap.size;if(index>=64)return null;
  const x=index%8*512,y=Math.floor(index/8)*256,ctx=this.atlasContext;
  ctx.fillStyle=b.labelBg||b.c;ctx.fillRect(x,y,512,256);
  ctx.fillStyle=b.labelColor||'#eee6d5';ctx.textAlign=b.labelAlign||'center';ctx.textBaseline='middle';
  const size=b.labelSize||Math.min(52,160/lines.length);ctx.font=`600 ${size}px Georgia, serif`;
  lines.forEach((line,i)=>ctx.fillText(String(line),x+(ctx.textAlign==='left'?28:256),y+128+(i-(lines.length-1)/2)*size*1.35,456));
  const rect={u0:(x+2)/4096,u1:(x+510)/4096,v0:1-(y+254)/2048,v1:1-(y+2)/2048};
  this.labelMap.set(key,rect);this.atlasDirty=true;return rect;
 }
 uploadAtlas(){
  if(!this.atlasDirty)return;const gl=this.gl;gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.labelTexture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.atlas);gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);this.atlasDirty=false;
 }
 mesh(boxes){
  const segments=16,rings=10;
  let needed=0;for(const b of boxes)needed+=(b.shape==='sphere'?segments*rings*6:b.round||b.shape==='cylinder'?segments*12:36)*12;
  if(this.scratch.length<needed)this.scratch=new Float32Array(Math.max(needed,this.scratch.length*2));
  const out=this.scratch;let offset=0;
  const corners=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
  const faces=[[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]],normals=[[0,0,-1],[0,0,1],[-1,0,0],[1,0,0],[0,1,0],[0,-1,0]];
  for(const b of boxes){
   let rgb=this.colors.get(b.c);if(!rgb){const hex=b.c||'#ffffff';rgb=[parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255];this.colors.set(b.c,rgb)}
   const mat=b.mat??b.wood??(['#b39872','#634631','#d4b27c','#ba9968','#a98555','#684d37'].includes(b.c)?1:0);
   const cx=Math.cos(b.rx||0),sx=Math.sin(b.rx||0),cy=Math.cos(b.ry||0),sy=Math.sin(b.ry||0),cz=Math.cos(b.rz||0),sz=Math.sin(b.rz||0);
   const emit=(x,y,z,nx,ny,nz,u=-1,v=-1)=>{
    x*=b.w/2;y*=b.h/2;z*=b.d/2;
    let a=y*cx-z*sx;z=y*sx+z*cx;y=a;a=x*cy+z*sy;z=-x*sy+z*cy;x=a;a=x*cz-y*sz;y=x*sz+y*cz;x=a;
    nx/=Math.max(.00001,b.w);ny/=Math.max(.00001,b.h);nz/=Math.max(.00001,b.d);
    a=ny*cx-nz*sx;nz=ny*sx+nz*cx;ny=a;a=nx*cy+nz*sy;nz=-nx*sy+nz*cy;nx=a;a=nx*cz-ny*sz;ny=nx*sz+ny*cz;nx=a;
    const length=Math.hypot(nx,ny,nz)||1;
    out[offset++]=b.x+x;out[offset++]=b.y+y;out[offset++]=b.z+z;out[offset++]=rgb[0];out[offset++]=rgb[1];out[offset++]=rgb[2];out[offset++]=mat;out[offset++]=nx/length;out[offset++]=ny/length;out[offset++]=nz/length;out[offset++]=u;out[offset++]=v;
   };
   if(b.shape==='sphere'){
    const point=(i,j)=>{const p=-Math.PI/2+i*Math.PI/rings,t=j*Math.PI*2/segments;return [Math.cos(p)*Math.cos(t),Math.sin(p),Math.cos(p)*Math.sin(t)]};
    for(let i=0;i<rings;i++)for(let j=0;j<segments;j++){
     const a=point(i,j),c=point(i+1,j),d=point(i+1,j+1),e=point(i,j+1);
     for(const p of [a,c,d,a,d,e])emit(...p,...p);
    }
   }else if(b.round||b.shape==='cylinder'){
    const top=b.topRadius??1,bottom=b.bottomRadius??1,slope=(bottom-top)/2;
    for(let i=0;i<segments;i++){
     const a=i*Math.PI*2/segments,c=(i+1)*Math.PI*2/segments,p=[Math.cos(a),Math.sin(a)],q=[Math.cos(c),Math.sin(c)];
     for(const [n,y]of [[p,-1],[q,-1],[q,1],[p,-1],[q,1],[p,1]]){const radius=y===1?top:bottom;emit(n[0]*radius,y,n[1]*radius,n[0],slope,n[1])}
     for(const y of [-1,1]){const radius=y===1?top:bottom;emit(0,y,0,0,y,0);emit(p[0]*radius,y,p[1]*radius,0,y,0);emit(q[0]*radius,y,q[1]*radius,0,y,0)}
    }
   }else{
    const label=this.label(b),labelFace={front:0,back:1,left:2,right:3,top:4,bottom:5}[b.labelFace||'front'];
    faces.forEach((face,i)=>{for(const k of [face[0],face[1],face[2],face[0],face[2],face[3]]){
     const p=corners[k],n=normals[i];let u=-1,v=-1;
     if(label&&i===labelFace){let tx=(p[0]+1)/2,ty=(p[1]+1)/2;if(i===1)tx=1-tx;if(i===2||i===3)tx=(p[2]+1)/2;if(i>=4)ty=(p[2]+1)/2;u=label.u0+tx*(label.u1-label.u0);v=label.v0+ty*(label.v1-label.v0)}
     emit(...p,...n,u,v);
    }});
   }
  }
  return out.subarray(0,offset);
 }
 setScene(boxes){
  const gl=this.gl;this.resetAtlas();let data=this.mesh(boxes);gl.bindBuffer(gl.ARRAY_BUFFER,this.staticBuffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);this.count=data.length/12;
  const casters=boxes.filter(b=>b.castShadow!==false&&b.shadow!==false&&b.mat!==6&&b.mat!==7&&b.y-b.h/2<2.7&&!(b.h>2.7&&(b.w>10||b.d>9))&&!(b.w>11&&b.d>9));
  data=this.mesh(casters);gl.bindBuffer(gl.ARRAY_BUFFER,this.shadowBuffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);this.shadowCount=data.length/12;this.shadowDirty=true;this.uploadAtlas();
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
   gl.bindFramebuffer(gl.FRAMEBUFFER,this.shadowFramebuffer);gl.viewport(0,0,size,size);gl.useProgram(this.shadowProgram);gl.clearColor(1,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   for(const attribute of Object.values(this.attributes))if(attribute!==this.shadowAttribute)gl.disableVertexAttribArray(attribute);
   gl.bindBuffer(gl.ARRAY_BUFFER,this.shadowBuffer);gl.enableVertexAttribArray(this.shadowAttribute);gl.vertexAttribPointer(this.shadowAttribute,3,gl.FLOAT,false,48,0);gl.drawArrays(gl.TRIANGLES,0,this.shadowCount);this.shadowDirty=false;
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
 }
 draw(buffer,count){
  const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  for(const [key,size,offset]of [['position',3,0],['color',3,12],['material',1,24],['normal',3,28],['texcoord',2,40]]){gl.enableVertexAttribArray(this.attributes[key]);gl.vertexAttribPointer(this.attributes[key],size,gl.FLOAT,false,48,offset)}
  gl.drawArrays(gl.TRIANGLES,0,count);
 }
 render(camera,dynamic,settings){
  if(this.lost)return;this.resize(settings);const gl=this.gl;
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);gl.depthMask(true);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.clearDepth(1);
  this.renderShadows(settings.quality==='high'?2048:1024);
  gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.useProgram(this.program);gl.clearColor(.13,.17,.19,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const focal=1/Math.tan(settings.fov*Math.PI/360);
  gl.uniform3f(this.uniforms.camera,camera.x,camera.y,camera.z);gl.uniform2f(this.uniforms.angle,camera.a,camera.pitch||0);gl.uniform2f(this.uniforms.projection,focal/(this.canvas.width/this.canvas.height),focal);gl.uniform1f(this.uniforms.brightness,settings.brightness/100);
  this.people.fill(0);let person=0;
  for(const b of dynamic){if(b.mat===8&&b.y>.85&&b.y<1.4&&b.w>.25&&person<3){this.people[person*4]=b.x;this.people[person*4+1]=b.z;this.people[person*4+2]=.43;this.people[person*4+3]=1;person++}}
  gl.uniform4fv(this.uniforms['people[0]'],this.people);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.labelTexture);gl.uniform1i(this.uniforms.labels,0);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.shadowTexture);gl.uniform1i(this.uniforms.shadowMap,1);gl.uniform2f(this.uniforms.shadowInfo,settings.quality!=='low'&&this.shadowSupported?1:0,1/this.shadowSize);
  this.draw(this.staticBuffer,this.count);
  if(dynamic.length){const data=this.mesh(dynamic);this.uploadAtlas();gl.bindBuffer(gl.ARRAY_BUFFER,this.dynamicBuffer);if(data.byteLength>this.dynamicCapacity){this.dynamicCapacity=Math.max(data.byteLength,this.dynamicCapacity*2);gl.bufferData(gl.ARRAY_BUFFER,this.dynamicCapacity,gl.DYNAMIC_DRAW)}gl.bufferSubData(gl.ARRAY_BUFFER,0,data);this.draw(this.dynamicBuffer,data.length/12)}
 }
}
