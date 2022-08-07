//Based on Jos Stam's paper: http://graphics.cs.cmu.edu/nsp/course/15-464/Fall09/papers/StamFluidforGames.pdf
//coloring inspiration from https://topaz1008.github.io/canvas-fluid-solver/

'use strict';

//temp variables
var x,y,i,j,k,a,temp,i0,j0,i1,j1,s,t,x1,y1,bb,h,m;
var tempf;
var run=true;

var mouseX=0; //mouse position in canvas pixel coords
var mouseY=0;
var pmouseX=0;  //mouse canvas coords last frame
var pmouseY=0;
var rawmx=0;  //mouse pos in raw pixel coords
var rawmy=0;

var timestep=.1;
var diff=0;
var visc=0;
var vorticity=.3;

function clamp(x,min,max){
    return x < min ? min :
           x > max ? max :
           x
    //return ((x-min)%(max-min)+(max-min))%(max-min)+min
}

function advect(fx,fy,f,f1,mw,mh,dt){
  for(i=0;i<mw;i++){
    for(j=0;j<mh;j++){
      x1=clamp(i-dt*fx[i+mw*j],0,mw-1);
      y1=clamp(j-dt*fy[i+mw*j],0,mh-1);
      i0=Math.floor(x1);i1=clamp(i0+1,0,mw-1);
      j0=Math.floor(y1);j1=clamp(j0+1,0,mh-1);
      s=x1-i0;t=y1-j0;
      f1[i+mw*j]=(1-s)*((1-t)*f[i0+mw*j0]+t*f[i0+mw*j1])
                    +s*((1-t)*f[i1+mw*j0]+t*f[i1+mw*j1]);
    }
  }
}

function project(fx,fy,p,div,mw,mh){
  for(i=0;i<mw;i++){
    for(j=0;j<mh;j++){
      div[i+mw*j]=-.5*(fx[clamp(i+1,0,mw-1)+mw*j]
                      -fx[clamp(i-1,0,mw-1)+mw*j]
                      +fy[i+mw*clamp(j+1,0,mh-1)]
                      -fy[i+mw*clamp(j-1,0,mh-1)]);
      p[i+mw*j]=0;
    }
  }
  for(k=0;k<20;k++){
    for(i=0;i<mw;i++){
      for(j=0;j<mh;j++){
        p[i+mw*j]=(div[i+mw*j]
                  +p[clamp(i-1,0,mw-1)+mw*j]
                  +p[clamp(i+1,0,mw-1)+mw*j]
                  +p[i+mw*clamp(j-1,0,mh-1)]
                  +p[i+mw*clamp(j+1,0,mh-1)])/4
      }
    }
  }
  for(i=0;i<mw;i++){
    for(j=0;j<mh;j++){
      fx[i+mw*j]-=.5*(p[clamp(i+1,0,mw-1)+mw*j]-p[clamp(i-1,0,mw-1)+mw*j])
      fy[i+mw*j]-=.5*(p[i+mw*clamp(j+1,0,mh-1)]-p[i+mw*clamp(j-1,0,mh-1)])
    }
  }
}

function set_bnd(fx,fy,mw,mh){
  for(i=0;i<mw;i++){
    fy[i]=-fy[i+mw];
    fy[i+mw*(mh-1)]=-fy[i+mw*(mh-2)];
  }
  for(j=0;j<mh;j++){
    fx[mw*j]=-fx[1+mw*j];
    fx[mw-1+mw*j]=-fx[mw-2+mw*j];
  }
}

function vorticity_confinement(fx,fy,c,mw,mh,coeff,dt){ //https://www.youtube.com/watch?v=TxxZ8gkGNAc and https://softologyblog.wordpress.com/2019/03/13/vorticity-confinement-for-eulerian-fluid-simulations/
  for(i=1;i<mw-1;i++){
    for(j=1;j<mh-1;j++){
        c[i+mw*j]=fx[i+mw*(j+1)]-fx[i+mw*(j-1)]
                 +fy[i-1+mw*j]-fy[i+1+mw*j];
    }
  }
  for(i=2;i<mw-2;i++){
    for(j=2;j<mh-2;j++){
      x1=Math.abs(c[i+mw*(j-1)])-Math.abs(c[i+mw*(j+1)]);
      y1=Math.abs(c[i+1+mw*j])-Math.abs(c[i-1+mw*j]);
      s=Math.sqrt(x1**2+y1**2+.001);
      x1*=coeff/s;
      y1*=coeff/s;
      fx[i+mw*j]+=dt*c[i+mw*j]*x1;
      fy[i+mw*j]+=dt*c[i+mw*j]*y1;
    }
  }
}

const canvas = document.getElementById('background');
var width=canvas.width;
var height=canvas.height;
const ctx = canvas.getContext('2d');
//https://hacks.mozilla.org/2011/12/faster-canvas-pixel-manipulation-with-typed-arrays/
var imageData = ctx.getImageData(0, 0, width, height);
var data = imageData.data;
data.fill(255);

var fluidx=new Float32Array(width*height).fill(0.);
var fluidy=new Float32Array(width*height).fill(0.);
var fluidp=new Float32Array(width*height).fill(0.);
var fluidtemp0=new Float32Array(width*height).fill(0.);
var fluidtemp1=new Float32Array(width*height).fill(0.);

bb = canvas.getBoundingClientRect(); 

document.addEventListener('mousemove',(event)=>{
  rawmx = event.clientX; 
  rawmy = event.clientY;
})

document.addEventListener('touchmove',(event)=>{ //https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/HTML-canvas-guide/AddingMouseandTouchControlstoCanvas/AddingMouseandTouchControlstoCanvas.html
  event.preventDefault();
  rawmx = event.targetTouches[0].clientX; 
  rawmy = event.targetTouches[0].clientY;
})

//setInterval(function(){
//  draw();
//}, 15);

var time=Date.now();


function draw(){
  mouseX = Math.floor( (rawmx - bb.left) / bb.width * width ); //from https://stackoverflow.com/questions/72379573/get-canvas-pixel-position-from-mouse-coordinates
  mouseY = Math.floor( (rawmy - bb.top) / bb.height * height );

  window.requestAnimationFrame(draw);
  if(run && (Date.now()-time)>15){
  time=Date.now();
  advect(fluidx,fluidy,fluidp,fluidtemp0,width,height,timestep);
  tempf=fluidtemp0;//swap
  fluidtemp0=fluidp;
  fluidp=tempf;
  advect(fluidx,fluidy,fluidx,fluidtemp0,width,height,timestep);  
  advect(fluidx,fluidy,fluidy,fluidtemp1,width,height,timestep);
  tempf=fluidtemp0;//swap
  fluidtemp0=fluidx;
  fluidx=tempf;
  tempf=fluidtemp1;//swap
  fluidtemp1=fluidy;
  fluidy=tempf;
  //addVelocity
  if(!(pmouseX==0 || pmouseY==0) && !((mouseX-pmouseX)==0 && (mouseY-pmouseY)==0)){
    for(x=-4;x<=4;x++){
      for(y=-4;y<=4;y++){
        fluidx[clamp(mouseX+x,0,width-1)+width*clamp(mouseY+y,0,height-1)]+=(mouseX-pmouseX);
        fluidy[clamp(mouseX+x,0,width-1)+width*clamp(mouseY+y,0,height-1)]+=(mouseY-pmouseY);
      }
    }
    fluidp[mouseX+width*mouseY]=255;
  }
  vorticity_confinement(fluidx,fluidy,fluidtemp0,width,height,vorticity,timestep);
  set_bnd(fluidx,fluidy,width,height);
  project(fluidx,fluidy,fluidtemp0,fluidtemp1,width,height);
  for(x=0;x<width;x++){
    for(y=0;y<height;y++){
      fluidp[x+width*y]*=.998
      //ctx.fillStyle="hsl("+180*(Math.atan2(fluidy[x+width*y],fluidx[x+width*y])/Math.PI+1)+","+100+"%,"+clamp(10*fluidp[x+width*y],0,50)+"%)";
      //ctx.fillRect(x, y, 1, 1);
      data[4*(x+width*y)]=clamp(10*fluidp[x+width*y],0,255)*x/width*2;
      data[4*(x+width*y)+1]=clamp(10*fluidp[x+width*y],0,255)*y/height*2;
      data[4*(x+width*y)+2]=clamp(10*fluidp[x+width*y],0,255);
    }
  }
  ctx.putImageData(imageData, 0, 0);
  pmouseX=mouseX;
  pmouseY=mouseY;
  }
}

draw();
