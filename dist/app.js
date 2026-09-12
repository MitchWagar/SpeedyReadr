'use strict';
const $=id=>document.getElementById(id);
let chapters=[],words=[],index=0,timer=null,playing=false,finished=false,keyboard=false,uploadVersion=0,title="Sample text",paragraphVersion=1;
const pointers=new Set();
let showOpening=false, viewVersion=0, initialView=-1, featuredLoading=true;
function featuredSnapshot(){return {id:FEATURED_ID,title:'Cold-Keep Reprisal — James Lurid',words:FEATURED_BOOK,index:0,paragraphVersion:1,speed:250};}
function syncDelete(){const included=$('bookmarks').value===FEATURED_ID;$('deleteBookmark').hidden=included;$('deleteBookmark').disabled=included;}
let activeBook=null, autosaveTimer=null, storageQueue=Promise.resolve();
function queueStorage(work){const job=storageQueue.then(work);storageQueue=job.catch(()=>{});return job;}
function storageError(error){$('bookmarkMessage').textContent='Could not save on this device: '+error.message;}
function beginLocalBook(){const snapshot={title,words,chapters,index,paragraphVersion,speed:Number($('speed').value)};activeBook=queueStorage(async()=>{const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(snapshot.words.map(({text,parts})=>({text,parts})))));const id=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');await api('/'+id,{method:'PUT',body:JSON.stringify(snapshot)});await refreshBookmarks();$('bookmarkMessage').textContent='Document saved on this device. Your position saves automatically.';return id;});activeBook.catch(storageError);}
function savePosition(){clearTimeout(autosaveTimer);autosaveTimer=null;if(!activeBook)return Promise.resolve();const book=activeBook,snapshot={index,speed:Number($('speed').value),finished};return queueStorage(async()=>{const id=await book;await api('/'+id,{method:'PATCH',body:JSON.stringify(snapshot)});if(!playing)await refreshBookmarks();}).catch(storageError);}
function scheduleLocalSave(){if(!activeBook||(featuredLoading&&viewVersion===initialView))return;if(!playing){savePosition();return;}if(!autosaveTimer)autosaveTimer=setTimeout(savePosition,1000);}

function delay(word,speed=Number($('speed').value)){const text=typeof word==='string'?word:word.text;const clean=text.replace(/["\u201d\u2019'\])}]+$/u,'');const beat=60000/speed;const multiplier=/[.!?…]$/u.test(clean)?4:/[,;:]$/u.test(clean)?2.5:1;const hyphenated=/[-\u00ad\u2010\u2011\u2014\ufe63\uff0d]/u.test(text)&&/[\p{L}\p{N}]/u.test(text);const length=(text.match(/[\p{L}\p{N}]/gu)||[]).length;const extra=hyphenated?1+length/4:0;return beat*(multiplier+extra+(word.paragraphEnd?3:0));}
function plainText(tokens){return tokens.map((w,i)=>w.text+(i<tokens.length-1?(w.paragraphEnd?'\n\n':' '):'')).join('');}

function fit(){const el=$('word');el.style.fontSize='';const size=parseFloat(getComputedStyle(el).fontSize);if(el.scrollWidth>$('pad').clientWidth-44)el.style.fontSize=Math.max(8,size*($('pad').clientWidth-44)/el.scrollWidth)+'px';}
function render(){syncChapter(); $('featuredOpening').hidden=!showOpening;$('word').hidden=showOpening;$('pad').classList.toggle('opening',showOpening); $('word').replaceChildren(); for(const part of (words[index]?.parts||[{text:'Ready.',italic:false}])){const span=document.createElement(part.italic?'em':'span');span.textContent=part.text;$('word').append(span);} $('position').textContent=words.length?`${index+1} / ${words.length.toLocaleString()} words`:'0 words';const pct=finished?100:words.length>1?Math.round(index/(words.length-1)*1000)/10:0;$('percent').textContent=pct+'%';$('progress').value=pct;$('progress').setAttribute('aria-valuetext',`${pct}% · word ${words.length?index+1:0} of ${words.length}`);$('status').textContent=finished?'Finished':playing?'Reading':index===0?'Ready to read':'Paused';$('pad').classList.toggle('active',playing);$('holdHint').textContent=finished?'Finished · rewind or jump to 0% to read again':playing?'Release to pause & rewind 10':'Press and hold here to read';fit();scheduleLocalSave();}
function pause(){clearTimeout(timer);timer=null;playing=false;render();}
function schedule(wait=delay(words[index])){clearTimeout(timer);timer=setTimeout(()=>{if(!playing)return;if(index>=words.length-1){finished=true;pause();return;}index++;render();schedule();},wait);}
function start(){if(playing||!words.length||finished)return;viewVersion++;const opening=showOpening;showOpening=false;playing=true;render();schedule(opening?Math.min(300,60000/Number($('speed').value)):delay(words[index]));}
function seek(amount){viewVersion++;showOpening=false;pause();index=Math.max(0,Math.min(words.length-1,index+amount));finished=false;render();}
function load(input,label,saveLocally=true,chapterList=input?.chapters){const next=typeof input==='string'?tokenize([{text:input}]):input;if(!next.length){$('message').textContent='Add some text before loading the reader.';return false;}viewVersion++;resetInput();activeBook=null;showOpening=false;words=next;index=0;finished=false;title=label;paragraphVersion=1;setChapters(chapterList);$('sourceCount').textContent=label;$('message').textContent=`${words.length.toLocaleString()} words loaded. Hold the reading area to begin.`;render();if(saveLocally)beginLocalBook();return true;}
let importedText='',importedWords=null;
$('clearText').onclick=()=>{viewVersion++;uploadVersion++;$('text').value='';importedText='';importedWords=null;$('file').value='';$('message').textContent='Paste area cleared. Add new text when ready.';$('text').focus({preventScroll:true});};
$('load').onclick=()=>{uploadVersion++;const text=$('text').value;load(importedWords&&text===importedText?importedWords:text,importedWords&&text===importedText?title:'Pasted text');};
function jumpToPercent(value){const pct=Number(value);if(!Number.isFinite(pct)||!words.length)return;viewVersion++;showOpening=false;resetInput();index=Math.round((words.length-1)*Math.max(0,Math.min(100,pct))/100);finished=false;render();}
$('progress').addEventListener('pointerdown',resetInput);
$('progress').addEventListener('input',e=>jumpToPercent(e.target.value));
$('jumpForm').addEventListener('submit',e=>{e.preventDefault();if($('jumpPercent').value.trim()===''||!$('jumpPercent').checkValidity())return;jumpToPercent($('jumpPercent').value);});

$('speed').oninput=()=>{viewVersion++;$('speedValue').innerHTML=$('speed').value+' <small>WPM</small>';if(playing)schedule();scheduleLocalSave();};
const pad=$('pad');
pad.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();pad.focus({preventScroll:true});pointers.add(e.pointerId);pad.setPointerCapture(e.pointerId);if(pointers.size===1)start();});
function release(e){if(!pointers.delete(e.pointerId))return;if(!pointers.size)seek(-10);}
function cancelPointer(e){if(!pointers.delete(e.pointerId))return;if(!pointers.size)pause();}
window.addEventListener('pointerup',release);window.addEventListener('pointercancel',cancelPointer);pad.addEventListener('lostpointercapture',cancelPointer);pad.addEventListener('contextmenu',e=>e.preventDefault());
let wheelAt=-Infinity;
pad.addEventListener('wheel',e=>{e.preventDefault();if(!e.deltaY)return;const now=performance.now();if(now-wheelAt<140)return;wheelAt=now;seek(e.deltaY>0?5:-5);},{passive:false});
pad.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();if(!e.repeat){keyboard=true;start();}}if(e.code==='ArrowLeft'||e.code==='ArrowRight'){e.preventDefault();seek(e.code==='ArrowLeft'?-5:5);}});
window.addEventListener('keyup',e=>{if(e.code==='Space'&&keyboard){keyboard=false;seek(-10);}});
function resetInput(){pointers.clear();keyboard=false;pause();}window.addEventListener('blur',resetInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)resetInput();});pad.addEventListener('blur',resetInput);window.addEventListener('resize',fit);
$('file').onchange=async e=>{const file=e.target.files[0];if(!file)return;viewVersion++;resetInput();const version=++uploadVersion;$('message').textContent='Opening document…';try{if(file.size>50*1024*1024)throw Error('Choose a file smaller than 50 MB, or upload one chapter at a time.');const ext=file.name.split('.').pop().toLowerCase();if(!['docx','epub','txt','pdf'].includes(ext))throw Error('Please use .docx, .epub, .pdf, or .txt. Save older .doc files as .docx first.');const next=ext==='txt'?tokenize([{text:await file.text()}]):ext==='pdf'?await readPdf(await file.arrayBuffer()):ext==='epub'?await readEpub(await file.arrayBuffer()):await readDocx(await file.arrayBuffer());if(version!==uploadVersion)return;if(load(next,file.name)){importedWords=next;importedText=plainText(next);$('text').value=importedText;$('message').textContent=`${file.name} · ${words.length.toLocaleString()} words loaded automatically. Hold the reading box to begin. ${next.importNotice||'Original italics retained in the reader.'}`;$('status').textContent='Document ready to read';pad.scrollIntoView({behavior:'auto',block:'center'});pad.focus({preventScroll:true});}}catch(error){if(version===uploadVersion)$('message').textContent=error instanceof RangeError?'This file appears damaged or too large. Try a fresh copy.':error.message;}finally{e.target.value='';}};
function openBookmarkDb(){return new Promise((resolve,reject)=>{if(!globalThis.indexedDB){reject(Error('This browser cannot save bookmarks. Use a browser with site storage enabled.'));return;}let settled=false;const request=indexedDB.open('speedy-readr-bookmarks',1);request.onupgradeneeded=()=>{const db=request.result;db.createObjectStore('books',{keyPath:'id'});db.createObjectStore('positions',{keyPath:'id'});};request.onerror=()=>reject(request.error);request.onblocked=()=>{settled=true;reject(Error('Close other Speedy Readr tabs, then try again.'));};request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>db.close();if(settled){db.close();return;}resolve(db);};});}
async function api(path,options={}){if(path==='/'+FEATURED_ID&&options.method==='DELETE')throw Error('Cold-Keep Reprisal is included with Speedy Readr and cannot be deleted.');let db;try{db=await openBookmarkDb();return await new Promise((resolve,reject)=>{const saving=['PUT','PATCH','DELETE'].includes(options.method),id=path.replace(/^\//,'');const tx=db.transaction(['books','positions'],saving?'readwrite':'readonly');let result;tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(tx.error||Error('Bookmark storage was interrupted. Please try again.'));tx.onerror=()=>{};
if(options.method==='DELETE'){tx.objectStore('books').delete(id);tx.objectStore('positions').delete(id);result={deleted:true};}
else if(options.method==='PATCH'){const saved=JSON.parse(options.body);const store=tx.objectStore('positions');const request=store.get(id);request.onsuccess=()=>{if(!request.result){tx.abort();return;}store.put({...request.result,...saved,updated:Date.now()});result={saved:true};};}
else if(saving){const saved=JSON.parse(options.body);tx.objectStore('books').put({id,...saved});tx.objectStore('positions').put({id,title:saved.title,index:saved.index,speed:saved.speed,finished:!!saved.finished,updated:Date.now()});result={saved:true};}
else if(!path){const request=tx.objectStore('positions').getAll();request.onsuccess=()=>{result=request.result.sort((a,b)=>b.updated-a.updated);if(!result.some(book=>book.id===FEATURED_ID))result.unshift({id:FEATURED_ID,title:'Cold-Keep Reprisal — James Lurid',index:0});};}
else{const request=tx.objectStore('books').get(id);request.onsuccess=()=>{if(!request.result){if(id===FEATURED_ID){result=featuredSnapshot();return;}reject(Error('This bookmark is no longer stored in this browser.'));return;}result=request.result;const position=tx.objectStore('positions').get(id);position.onsuccess=()=>{if(position.result)result={...result,...position.result};};};}
});}catch(error){if(!options.method&&path==='/'+FEATURED_ID)return featuredSnapshot();if(!options.method&&!path)return [{id:FEATURED_ID,title:'Cold-Keep Reprisal — James Lurid',index:0}];if(error.name==='QuotaExceededError')throw Error('This browser has run out of storage. Free up device space or save a smaller document.');if(['SecurityError','InvalidStateError','UnknownError','NotAllowedError'].includes(error.name))throw Error('Browser storage is unavailable. Allow site data and try again in a regular browser window.');throw error;}finally{db?.close();}}
async function refreshBookmarks(){try{const list=await api('');list.sort((a,b)=>Number(b.id===FEATURED_ID)-Number(a.id===FEATURED_ID));const select=$('bookmarks');const selected=select.value;select.replaceChildren();const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=list.length?'Choose a saved bookmark':'No bookmarks yet';select.append(placeholder);for(const item of list){const option=document.createElement('option');option.value=item.id;option.textContent=`${item.title}${item.id===FEATURED_ID?' · Included':''} · word ${Number(item.index)+1}`;select.append(option);}if(list.some(item=>item.id===selected))select.value=selected;$('restoreBookmark').disabled=!list.length;syncDelete();}catch(error){$('bookmarkMessage').textContent=error.message;}}
$('bookmarks').addEventListener('change',syncDelete);
$('deleteBookmark').onclick=async()=>{const id=$('bookmarks').value;if(id===FEATURED_ID){syncDelete();return;}if(!id){$('bookmarkMessage').textContent='Choose a saved bookmark from the list, then click Delete.';$('bookmarks').focus();return;}const selected=$('bookmarks').selectedOptions[0];if(!window.confirm(`Are you sure you want to delete “${selected?.textContent||'this bookmark'}”?\n\nThis removes its saved document and reading position from this device.`))return;resetInput();uploadVersion++;const button=$('deleteBookmark');button.disabled=true;try{const current=activeBook;if(current&&await current.catch(()=>null)===id&&activeBook===current){clearTimeout(autosaveTimer);autosaveTimer=null;activeBook=null;}await queueStorage(()=>api('/'+id,{method:'DELETE'}));await refreshBookmarks();$('bookmarkMessage').textContent='Saved document and bookmark deleted from this device.';}catch(error){storageError(error);}finally{button.disabled=false;syncDelete();}};
$('saveBookmark').onclick=async()=>{resetInput();if(!activeBook)beginLocalBook();await savePosition();};
$('restoreBookmark').onclick=async()=>{viewVersion++;const id=$('bookmarks').value;if(!id){$('bookmarkMessage').textContent='Choose a bookmark first.';return;}resetInput();const version=++uploadVersion;$('restoreBookmark').disabled=true;try{const saved=await api('/'+id);if(version!==uploadVersion)return;load(saved.words,saved.title,false,saved.chapters);paragraphVersion=saved.paragraphVersion||0;index=Math.max(0,Math.min(words.length-1,saved.index||0));finished=!!saved.finished;activeBook=Promise.resolve(id);$('speed').value=saved.speed||250;$('speed').oninput();importedWords=saved.words;importedText=plainText(saved.words);$('text').value=importedText;showOpening=id===FEATURED_ID;render();$('bookmarkMessage').textContent=`Resumed at word ${index+1}.`+(saved.paragraphVersion? '':' This older bookmark has no paragraph information. Re-upload the original document to enable paragraph pauses, then bookmark your spot again.');}catch(error){$('bookmarkMessage').textContent=error.message;}finally{$('restoreBookmark').disabled=false;}};
window.addEventListener('pagehide',()=>{resetInput();savePosition();});
function setChapters(list){
  chapters=(Array.isArray(list)?list:[]).filter(c=>c&&Number.isInteger(c.start)&&c.start>=0&&c.start<words.length&&typeof c.title==='string').map(c=>({title:c.title,start:c.start})).sort((a,b)=>a.start-b.start);
  const select=$('chapters');select.replaceChildren();
  chapters.forEach((chapter,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=chapter.title;select.append(option);});
  $('chapterRow').hidden=!chapters.length;
  if(chapters.length)words.chapters=chapters;
}
function syncChapter(){
  if(!chapters.length)return;
  let selected=0;for(let i=1;i<chapters.length&&chapters[i].start<=index;i++)selected=i;
  $('chapters').value=String(selected);
}
$('chapters').addEventListener('change',()=>{
  const chapter=chapters[Number($('chapters').value)];if(!chapter)return;
  viewVersion++;showOpening=false;resetInput();index=chapter.start;finished=false;render();
});

load(FEATURED_BOOK,'Cold-Keep Reprisal — James Lurid',false);
showOpening=true;importedWords=FEATURED_BOOK;importedText=plainText(FEATURED_BOOK);$('text').value=importedText;
$('message').textContent='Read Cold-Keep Reprisal, or open a document of your own.';
render();
initialView=viewVersion;
activeBook=queueStorage(async()=>{
const saved=await api('/'+FEATURED_ID);
if(viewVersion===initialView){index=Math.max(0,Math.min(words.length-1,saved.index||0));finished=!!saved.finished;$('speed').value=saved.speed||250;$('speedValue').innerHTML=$('speed').value+' <small>WPM</small>';}
// Seed only the included book, preserving its prior position and all other books.
await api('/'+FEATURED_ID,{method:'PUT',body:JSON.stringify({...saved,words:FEATURED_BOOK,title:'Cold-Keep Reprisal — James Lurid',paragraphVersion:1})});
featuredLoading=false;await refreshBookmarks();if(viewVersion===initialView){$('bookmarks').value=FEATURED_ID;syncDelete();render();}
return FEATURED_ID;
});
activeBook.catch(error=>{featuredLoading=false;storageError(error);});
refreshBookmarks().then(()=>{if(viewVersion===initialView){$('bookmarks').value=FEATURED_ID;syncDelete();}});

