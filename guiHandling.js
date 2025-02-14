background=document.getElementById("background");
background.style.height="0px";//trigger a reflow to calcualte the minimum background height
background.style.height=document.documentElement.scrollHeight+"px";
bb = canvas.getBoundingClientRect(); 

document.addEventListener('scroll',(event)=>{
  bb = canvas.getBoundingClientRect(); 
});

window.addEventListener("resize",function(){
	background.style.height="0px";//trigger a reflow to calcualte the minimum background height
	background.style.height=document.documentElement.scrollHeight+"px";//(document.documentElement.scrollHeight+window.innerHeight)/2+"px";
	bb = canvas.getBoundingClientRect(); 
});

/*window.addEventListener("scroll",function(){
	scrollPercent=document.documentElement.scrollTop/(document.documentElement.scrollHeight-window.innerHeight);
	offsetTop=(window.innerHeight-background.offsetHeight)*scrollPercent;
	background.style.top=offsetTop+"px";
});*/ //parallax doesn't have any good implementations that work with asynchronous scrolling

var x;
var y;
scrollX=0;
scrollY=0;
scrollPixels=[0,0];

window.addEventListener("scroll",function(){
	scrollPixels=[(scrollX-document.documentElement.scrollLeft)/bb.width*width,
				  (scrollY-document.documentElement.scrollTop)/bb.height*height];
	scrollX=document.documentElement.scrollLeft;
	scrollY=document.documentElement.scrollTop;
	//console.log(scrollPixels);
	Array.from(document.querySelectorAll("body > div")).forEach(div => {
		bounds=div.getBoundingClientRect();
		bounds=[Math.max(Math.ceil((bounds.top - bb.top)/bb.height*height),0),
				Math.min(Math.floor((bounds.bottom - bb.top)/bb.height*height),height),
				Math.max(Math.ceil((bounds.left - bb.left)/bb.width*width),0),
				Math.min(Math.floor((bounds.right - bb.left)/bb.width*width),width)];
		for(y=bounds[0];y<bounds[1];y++){
			for(x=bounds[2];x<bounds[3];x++){
				fluidy[x+width*y]=3*scrollPixels[1];
			}
		}
		for(y=bounds[0];y<bounds[1];y++){
			fluidp[bounds[2]+width*y]=10;
			fluidp[bounds[3]-1+width*y]=10;
		}
		for(x=bounds[2];x<bounds[3];x++){
			fluidp[x+width*bounds[0]]=10;
			fluidp[x+width*(bounds[1]-1)]=10;
		}
	});
});
