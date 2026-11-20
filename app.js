(() => {
"use strict";
const $ = id => document.getElementById(id);
const KEY = "tlbb-ai-manager-bank-v1";
let bank = [], imageUrl = "", worker = null, workerLang = "", busy = false;
let crop = null, dragStart = null, displayRect = null;

try {
  const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
  bank = Array.isArray(raw) ? raw.filter(x => x && x.question && x.answer) : [];
} catch (_) { bank = []; }

function norm(s) {
  return String(s || "").toLocaleLowerCase("vi").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d")
    .replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();
}
function tokens(s) { return norm(s).split(" ").filter(x => x.length > 1); }
function similarity(a,b) {
  const A = new Set(tokens(a)), B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;
  let n = 0; A.forEach(x => { if (B.has(x)) n++; });
  return Math.max(2*n/(A.size+B.size), n/Math.min(A.size,B.size)*0.82);
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(bank)); $("questionStat").textContent = bank.length; render(); }
  catch (_) { $("ocrMessage").textContent = "Không lưu được. Bộ nhớ trình duyệt có thể đã đầy."; }
}
function render() {
  const box = $("questionList"); box.replaceChildren();
  const q = norm($("bankSearch").value);
  const rows = bank.filter(x => norm(`${x.question} ${x.answer} ${x.npc||""}`).includes(q));
  if (!rows.length) { const e=document.createElement("div");e.className="empty";e.textContent="Chưa có câu hỏi phù hợp.";box.append(e);return; }
  rows.forEach(x => {
    const d=document.createElement("div");d.className="question";
    const del=document.createElement("button");del.textContent="Xóa";del.onclick=()=>{if(confirm("Xóa câu hỏi này?")){bank=bank.filter(y=>y.id!==x.id);save();}};
    const b=document.createElement("b");b.textContent=x.question;
    const p=document.createElement("p");p.textContent="Đáp án: "+x.answer;
    const s=document.createElement("small");s.textContent="NPC: "+(x.npc||"Chưa phân loại");
    d.append(del,b,p,s);box.append(d);
  });
}
for(let i=1;i<=15;i++){
  const l=document.createElement("label");l.className="account";
  const wrap=document.createElement("span"),b=document.createElement("b"),s=document.createElement("small"),c=document.createElement("input");
  b.textContent="Account "+String(i).padStart(2,"0");s.textContent="Chưa kết nối";c.type="checkbox";
  c.onchange=e=>{s.textContent=e.target.checked?"Đang hoạt động":"Chưa kết nối";$("activeStat").textContent=document.querySelectorAll(".account input:checked").length;};
  wrap.append(b,s);l.append(wrap,c);$("accountGrid").append(l);
}
$("saveQuestionBtn").onclick=()=>{
  const question=$("newQuestion").value.trim(),answer=$("newAnswer").value.trim();
  if(!question||!answer){$("ocrMessage").textContent="Cần nhập câu hỏi và đáp án.";return;}
  bank.unshift({id:String(Date.now()),question,answer,npc:$("newNpc").value.trim()});
  $("newQuestion").value=$("newAnswer").value=$("newNpc").value="";
  save();$("ocrMessage").textContent="Đã lưu câu hỏi.";
};
$("bankSearch").oninput=render;

$("imageInput").onchange=e=>{
  const f=e.target.files&&e.target.files[0];if(!f)return;
  if(!/^image\/(png|jpeg|webp)$/.test(f.type)){ $("ocrMessage").textContent="Chỉ hỗ trợ PNG, JPG, WEBP.";return; }
  if(f.size>15*1024*1024){$("ocrMessage").textContent="Ảnh lớn hơn 15 MB. Hãy cắt hoặc nén ảnh.";return;}
  if(imageUrl)URL.revokeObjectURL(imageUrl);
  imageUrl=URL.createObjectURL(f);$("preview").src=imageUrl;$("preview").hidden=false;$("previewEmpty").hidden=true;
  crop=null;$("cropShade").hidden=true;$("ocrConfidence").textContent="Độ tin cậy OCR: --";$("ocrDuration").textContent="";
  $("ocrMessage").textContent="Đã chọn ảnh. Có thể kéo trên ảnh để khoanh vùng chữ, hoặc OCR toàn ảnh.";
  $("preview").onload=updateDisplayRect;
};
function updateDisplayRect(){
  const img=$("preview"),box=$("previewArea");
  const ir=img.getBoundingClientRect(),br=box.getBoundingClientRect();
  displayRect={left:ir.left,top:ir.top,width:ir.width,height:ir.height};
}
function pointerPoint(e){
  const r=$("preview").getBoundingClientRect();
  return {x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};
}
$("previewArea").addEventListener("pointerdown",e=>{
  if($("preview").hidden)return;
  $("previewArea").setPointerCapture(e.pointerId);
  dragStart=pointerPoint(e);crop={x:dragStart.x,y:dragStart.y,w:0,h:0};drawCrop();
});
$("previewArea").addEventListener("pointermove",e=>{
  if(!dragStart)return;const p=pointerPoint(e);
  crop={x:Math.min(dragStart.x,p.x),y:Math.min(dragStart.y,p.y),w:Math.abs(p.x-dragStart.x),h:Math.abs(p.y-dragStart.y)};
  drawCrop();
});
function finishCrop(){if(!dragStart)return;dragStart=null;if(!crop||crop.w<0.025||crop.h<0.025){crop=null;$("cropShade").hidden=true;$("ocrMessage").textContent="Vùng chọn quá nhỏ; OCR sẽ dùng toàn ảnh.";}else $("ocrMessage").textContent="Đã khoanh vùng chữ. Nhấn Chạy OCR V1.3.";}
$("previewArea").addEventListener("pointerup",finishCrop);
$("previewArea").addEventListener("pointercancel",finishCrop);
function drawCrop(){
  const shade=$("cropShade");if(!crop){shade.hidden=true;return;}
  shade.hidden=false;shade.style.left=(crop.x*100)+"%";shade.style.top=(crop.y*100)+"%";
  shade.style.width=(crop.w*100)+"%";shade.style.height=(crop.h*100)+"%";
}
$("clearCropBtn").onclick=()=>{crop=null;dragStart=null;$("cropShade").hidden=true;$("ocrMessage").textContent="Đã bỏ vùng chọn; OCR sẽ dùng toàn ảnh.";};

function loadImg(file){return new Promise((resolve,reject)=>{const im=new Image(),u=URL.createObjectURL(file);im.onload=()=>{URL.revokeObjectURL(u);resolve(im);};im.onerror=()=>{URL.revokeObjectURL(u);reject(Error("Không đọc được ảnh."));};im.src=u;});}
function clamp(v){return Math.max(0,Math.min(255,v));}
async function prepare(file,mode){
  const im=await loadImg(file);
  let sx=0,sy=0,sw=im.width,sh=im.height;
  if(crop&&crop.w>0.025&&crop.h>0.025){sx=Math.round(crop.x*im.width);sy=Math.round(crop.y*im.height);sw=Math.round(crop.w*im.width);sh=Math.round(crop.h*im.height);}
  // Upscale small dialogue crops for small in-game fonts, but cap canvas size for Android memory.
  const factor=Math.min(4,Math.max(1.6,1800/Math.max(sw,sh)));
  const maxPixels=7_000_000;
  let outW=Math.round(sw*factor),outH=Math.round(sh*factor);
  if(outW*outH>maxPixels){const k=Math.sqrt(maxPixels/(outW*outH));outW=Math.round(outW*k);outH=Math.round(outH*k);}
  const c=document.createElement("canvas");c.width=outW;c.height=outH;
  const ctx=c.getContext("2d",{willReadFrequently:true});
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";ctx.drawImage(im,sx,sy,sw,sh,0,0,outW,outH);
  if(mode!=="original"){
    const data=ctx.getImageData(0,0,outW,outH),p=data.data;
    const gray=new Uint8Array(outW*outH);let min=255,max=0;
    for(let i=0,j=0;i<p.length;i+=4,j++){const v=Math.round(.299*p[i]+.587*p[i+1]+.114*p[i+2]);gray[j]=v;if(v<min)min=v;if(v>max)max=v;}
    const invert=mode==="light-on-dark";
    // Robust contrast stretch, then optional polarity normalization.
    const lo=Math.max(0,min-8),hi=Math.min(255,max+8),range=Math.max(30,hi-lo);
    const temp=new Uint8Array(gray.length);
    for(let i=0;i<gray.length;i++){let v=clamp((gray[i]-lo)*255/range);if(invert)v=255-v;temp[i]=v;}
    // Mild 3x3 unsharp mask; keep edges readable without aggressive ringing.
    const sharpen=new Uint8Array(temp.length);
    for(let y=0;y<outH;y++)for(let x=0;x<outW;x++){
      const i=y*outW+x,center=temp[i];
      const l=temp[y*outW+Math.max(0,x-1)],r=temp[y*outW+Math.min(outW-1,x+1)];
      const u=temp[Math.max(0,y-1)*outW+x],d=temp[Math.min(outH-1,y+1)*outW+x];
      sharpen[i]=clamp(center*1.45-(l+r+u+d)*0.1125);
    }
    for(let i=0,j=0;i<p.length;i+=4,j++){let v=sharpen[j];if(mode==="threshold")v=v>150?255:0;p[i]=p[i+1]=p[i+2]=v;p[i+3]=255;}
    ctx.putImageData(data,0,0);
  }
  return await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(Error("Không xuất được ảnh đã xử lý.")),"image/png"));
}
async function getWorker(lang){
  if(!window.Tesseract)throw Error("Thư viện OCR chưa tải. Kiểm tra Internet rồi tải lại trang.");
  if(worker&&workerLang===lang)return worker;
  if(worker){await worker.terminate();worker=null;workerLang="";}
  $("ocrMessage").textContent="Đang tải bộ dữ liệu OCR "+lang+" lần đầu...";
  worker=await Tesseract.createWorker(lang,1,{logger:m=>{
    if(m.status){const pct=m.progress!=null?" "+Math.round(m.progress*100)+"%":"";$("ocrMessage").textContent="OCR: "+m.status+pct;}
  }});
  workerLang=lang;return worker;
}
function psmList(v){return v==="block"?["6"]:v==="sparse"?["11"]:v==="line"?["7"]:["6","11","12"];}
$("runOcrBtn").onclick=async()=>{
  const file=$("imageInput").files&&$("imageInput").files[0];
  if(!file){$("ocrMessage").textContent="Hãy chọn ảnh trước.";return;}
  if(busy)return;busy=true;const btn=$("runOcrBtn");btn.disabled=true;$("ocrStat").textContent="Đang chạy";
  const start=performance.now();
  try{
    const w=await getWorker($("ocrLang").value),mode=$("ocrMode").value,psms=psmList($("psmMode").value);
    const modes=mode==="auto"?["light-on-dark","dark-on-light","original"]:mode==="light-on-dark"?["light-on-dark"]:mode==="dark-on-light"?["dark-on-light"]:["original"];
    let best=null;const total=modes.length*psms.length;let n=0;
    for(const m of modes){
      const blob=await prepare(file,m);
      for(const psm of psms){
        n++;$("ocrMessage").textContent=`Đang thử ${n}/${total}: ${m}, PSM ${psm}...`;
        await w.setParameters({tessedit_pageseg_mode:psm,preserve_interword_spaces:"1"});
        const r=await w.recognize(blob),txt=(r.data.text||"").trim(),conf=Number(r.data.confidence||0);
        const vi=(txt.match(/[ăâđêôơưĂÂĐÊÔƠƯà-ỹÀ-Ỹ]/g)||[]).length;
        const letters=(txt.match(/[A-Za-zÀ-ỹĐđ]/g)||[]).length;
        const score=conf+Math.min(txt.length,450)*.035+Math.min(vi,12)*.22+(letters>0?1:0);
        if(txt&&(!best||score>best.score))best={txt,conf,score,mode:m,psm};
      }
    }
    if(best){
      $("ocrText").value=best.txt;
      $("ocrConfidence").textContent="Độ tin cậy OCR: "+Math.round(best.conf)+"% (tham khảo)";
      $("ocrMessage").textContent=`Xong: ${best.mode}, PSM ${best.psm}. Hãy soát lại dấu tiếng Việt và ký tự trước khi tra cứu.`;
    }else{$("ocrText").value="";$("ocrConfidence").textContent="Độ tin cậy OCR: --";$("ocrMessage").textContent="Không tìm thấy chữ. Hãy chụp rõ hơn hoặc khoanh sát vùng hội thoại.";}
    $("ocrDuration").textContent=((performance.now()-start)/1000).toFixed(1)+" giây";$("ocrStat").textContent="Sẵn sàng";
  }catch(e){$("ocrMessage").textContent="OCR lỗi: "+(e.message||String(e));$("ocrStat").textContent="Có lỗi";}
  finally{btn.disabled=false;busy=false;}
};
$("searchBtn").onclick=()=>{
  const q=$("ocrText").value.trim();if(!q){$("ocrMessage").textContent="Hãy nhập hoặc nhận diện câu hỏi trước.";return;}
  $("answerEmpty").hidden=true;$("answerResult").hidden=false;let best=null,sc=0;
  bank.forEach(x=>{const n=similarity(q,x.question);if(n>sc){sc=n;best=x;}});
  $("confidence").textContent=Math.round(sc*100)+"%";$("meterFill").style.width=Math.round(sc*100)+"%";
  if(best&&sc>=.28){$("answerText").textContent=best.answer;$("answerNote").textContent="Câu gần nhất: "+best.question+" · NPC: "+(best.npc||"Không rõ")+". Điểm tương đồng văn bản, không phải xác suất đáp án đúng.";}
  else{$("answerText").textContent="Chưa tìm thấy đáp án phù hợp";$("answerNote").textContent="Hãy kiểm tra OCR hoặc bổ sung câu hỏi vào ngân hàng local.";}
};
$("exportBtn").onclick=()=>{
  const data={version:1,exportedAt:new Date().toISOString(),questions:bank};
  const u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
  const a=document.createElement("a");a.href=u;a.download="tlbb-question-bank.json";a.click();setTimeout(()=>URL.revokeObjectURL(u),1200);
};
$("importBtn").onclick=()=>$("importFile").click();
$("importFile").onchange=async e=>{
  const f=e.target.files&&e.target.files[0];if(!f)return;
  try{const j=JSON.parse(await f.text()),rows=Array.isArray(j)?j:j.questions;if(!Array.isArray(rows))throw Error();
    let added=0;rows.forEach(x=>{if(x&&typeof x.question==="string"&&typeof x.answer==="string"&&x.question.trim()&&x.answer.trim()){bank.push({id:Date.now()+"-"+added,question:x.question.trim(),answer:x.answer.trim(),npc:String(x.npc||"")});added++;}});
    save();$("ocrMessage").textContent="Đã nhập "+added+" câu hỏi.";
  }catch(_){alert("JSON không hợp lệ.");}e.target.value="";
};
window.addEventListener("beforeunload",()=>{if(worker)worker.terminate();if(imageUrl)URL.revokeObjectURL(imageUrl);});
$("questionStat").textContent=bank.length;render();
})();