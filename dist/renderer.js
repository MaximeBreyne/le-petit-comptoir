/* Depth-tested WebGL renderer. Opaque geometry writes depth; no painter sorting. */
class BarRenderer {
 constructor(canvas,boxes){
  this.canvas=canvas;this.gl=canvas.getContext('webgl',{alpha:false,antialias:true,depth:true,preserveDrawingBuffer:true});
  if(!this.gl)throw new Error('Le rendu 3D nécessite WebGL. Activez l’accélération graphique de Windows puis relancez le jeu.');
  const gl=this.gl;
  const vertex=`attribute vec3 position; attribute vec3 color; attribute float material;
   uniform vec3 camera; uniform vec2 angle; uniform vec2 projection;
   varying vec3 tint; varying vec3 world; varying float depth; varying float surface;
   void main(){ vec3 p=position-camera;float cy=cos(angle.x),sy=sin(angle.x);float cp=cos(angle.y),sp=sin(angle.y);
    float x=p.x*cy-p.z*sy;float z=p.x*sy+p.z*cy;float y=p.y*cp-z*sp;z=p.y*sp+z*cp;
    gl_Position=vec4(x*projection.x+0.15*z,y*projection.y,1.002002*z-0.1001001,z);
    tint=color;world=position;depth=z;surface=material;
   }`;
  const fragment=`precision mediump float; varying vec3 tint;varying vec3 world;varying float depth;varying float surface;
   uniform float brightness;
   void main(){float pattern=1.0;
    if(surface>0.5){float grain=sin(world.x*27.0+sin(world.z*5.0)*1.4+world.y*13.0);pattern=0.95+0.045*grain;}
    vec3 c=tint*pattern*brightness;
    float fog=clamp((depth-8.0)/35.0,0.0,0.34);c=mix(c,vec3(0.12,0.20,0.18),fog);
    gl_FragColor=vec4(c,1.0);
   }`;
  const shader=(type,source)=>{let s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
  this.program=gl.createProgram();gl.attachShader(this.program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(this.program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(this.program);
  if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));
  this.attributes=Object.fromEntries(['position','color','material'].map(k=>[k,gl.getAttribLocation(this.program,k)]));
  this.uniforms=Object.fromEntries(['camera','angle','projection','brightness'].map(k=>[k,gl.getUniformLocation(this.program,k)]));
  this.staticBuffer=gl.createBuffer();this.dynamicBuffer=gl.createBuffer();this.setScene(boxes);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;document.getElementById('graphicsError').hidden=false;});
  canvas.addEventListener('webglcontextrestored',()=>location.reload());
 }
 mesh(boxes){
  const output=[],corners=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
  const faces=[[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]],light=[.82,.96,.72,.88,1,.6];
  for(const b of boxes){const rgb=b.c.slice(1).match(/../g).map(v=>parseInt(v,16)/255),wood=b.wood??(['#b39872','#634631','#d4b27c','#ba9968','#a98555','#684d37'].includes(b.c)?1:0);
   faces.forEach((f,i)=>{for(const k of [f[0],f[1],f[2],f[0],f[2],f[3]]){const v=corners[k];output.push(b.x+v[0]*b.w/2,b.y+v[1]*b.h/2,b.z+v[2]*b.d/2,...rgb.map(c=>c*light[i]),wood)}});
  }return new Float32Array(output);
 }
 setScene(boxes){const gl=this.gl,data=this.mesh(boxes);gl.bindBuffer(gl.ARRAY_BUFFER,this.staticBuffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);this.count=data.length/7;}
 resize(settings){const q={low:.65,medium:1,high:Math.min(Math.max(devicePixelRatio||1,1.5),2)}[settings.quality]||1;
  const width=Math.max(1,Math.round(this.canvas.clientWidth*q)),height=Math.max(1,Math.round(this.canvas.clientHeight*q));
  if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height}this.gl.viewport(0,0,width,height);
 }
 draw(buffer,count){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);for(const [key,size,offset]of [['position',3,0],['color',3,12],['material',1,24]]){gl.enableVertexAttribArray(this.attributes[key]);gl.vertexAttribPointer(this.attributes[key],size,gl.FLOAT,false,28,offset)}gl.drawArrays(gl.TRIANGLES,0,count)}
 render(camera,dynamic,settings){if(this.lost)return;this.resize(settings);const gl=this.gl;gl.useProgram(this.program);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);gl.depthMask(true);gl.disable(gl.BLEND);gl.clearDepth(1);gl.clearColor(.14,.22,.20,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const focal=1/Math.tan(settings.fov*Math.PI/360);gl.uniform3f(this.uniforms.camera,camera.x,camera.y,camera.z);gl.uniform2f(this.uniforms.angle,camera.a,camera.pitch||0);gl.uniform2f(this.uniforms.projection,focal/(this.canvas.width/this.canvas.height),focal);gl.uniform1f(this.uniforms.brightness,settings.brightness/100);
  this.draw(this.staticBuffer,this.count);if(dynamic.length){const data=this.mesh(dynamic);gl.bindBuffer(gl.ARRAY_BUFFER,this.dynamicBuffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);this.draw(this.dynamicBuffer,data.length/7)}
 }
}
