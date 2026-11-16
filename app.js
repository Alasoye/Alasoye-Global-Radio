const $=s=>document.querySelector(s);let music=[],shows=[],deferredPrompt=null;
const audio=$("#audio");
$("#year").textContent=new Date().getFullYear();
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));document.querySelectorAll(".panel").forEach(p=>p.hidden=p.id!==b.dataset.tab)}));
function addTrack(file,type){const item={name:file.name.replace(/\.[^.]+$/,""),url:URL.createObjectURL(file),file};(type==="show"?shows:music).push(item);render();}
function render(){const draw=(items,target,kind)=>{const el=$(target);el.innerHTML="";if(!items.length){el.innerHTML='<p class="empty">Nothing added yet.</p>';return;}items.forEach((t,i)=>{const row=document.createElement("div");row.className="track";const name=document.createElement("strong");name.textContent=t.name;const play=document.createElement("button");play.textContent="Play";play.onclick=()=>{audio.src=t.url;audio.play();$("#nowTitle").textContent=t.name;$("#nowSub").textContent=kind==="show"?"Recorded programme":"Music";};row.append(name,play);el.append(row);});};draw(music,"#tracks","music");draw(shows,"#showsList","show");$("#trackCount").textContent=`${music.length} / 15 tracks`;}
$("#loginBtn").onclick=()=>{if($("#pin").value==="2468"){$("#login").hidden=true;$("#adminTools").hidden=false;}else alert("Incorrect PIN.");};
$("#lockBtn").onclick=()=>{$("#adminTools").hidden=true;$("#login").hidden=false;$("#pin").value="";};
$("#musicFiles").onchange=e=>{const fs=[...e.target.files].slice(0,Math.max(0,15-music.length));fs.forEach(f=>addTrack(f,"music"));$("#adminStatus").textContent=`Added ${fs.length} song(s). ${music.length} of 15 used.`;e.target.value="";};
$("#showFile").onchange=e=>{if(e.target.files[0])addTrack(e.target.files[0],"show");e.target.value="";};
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("#installBtn").hidden=false;});
$("#installBtn").onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("#installBtn").hidden=true;}};
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
render();