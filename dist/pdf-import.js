'use strict';
async function readPdf(buffer){
 const pdfjs=await import('./vendor/pdf.min.mjs');
 pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf.worker.min.mjs',document.baseURI).href;
 const task=pdfjs.getDocument({data:new Uint8Array(buffer),disableFontFace:true,useSystemFonts:true,isEvalSupported:false,fontExtraProperties:true});
 let pdf;
 try{
  pdf=await task.promise;
  if(pdf.numPages>1000)throw Error('This PDF has more than 1,000 pages. Upload a smaller section.');
  const words=[];let emptyPages=0;
  for(let n=1;n<=pdf.numPages;n++){
   const page=await pdf.getPage(n),content=await page.getTextContent();
   // The operator list exposes font metadata; text extraction still works if a font cannot load.
   try{await page.getOperatorList();}catch{}
   const runs=[];let previous=null;
   for(const item of content.items){
    if(typeof item.str!=='string'||!item.str)continue;
    const height=Math.max(1,Math.abs(item.height)||Math.hypot(item.transform[2],item.transform[3]));
    const x=item.transform[4],y=item.transform[5];
    if(previous){
     const line=Math.abs(y-previous.y)>Math.max(height,previous.height)*.45||previous.eol;
     const paragraph=line&&(Math.abs(y-previous.y)>Math.max(height,previous.height)*1.7||(x-previous.lineStart>height*1.2&&/[.!?…][”"')\]]*$/.test(previous.text)));
     const gap=x-previous.right;
     if(line)runs.push({text:paragraph?'\n\n':' '});
     else if(gap>height*.15&&!/\s$/.test(previous.text)&&!/^\s/.test(item.str))runs.push({text:' '});
    }
    let font=null;try{if(page.commonObjs.has(item.fontName))font=page.commonObjs.get(item.fontName);}catch{}
    const style=content.styles[item.fontName];
    const italic=!!font?.italic||/italic|oblique/i.test([font?.name,style?.fontFamily,item.fontName].filter(Boolean).join(' '));
    runs.push({text:item.str.replace(/\s+/gu,' '),italic});
    const sameLine=previous&&Math.abs(y-previous.y)<=Math.max(height,previous.height)*.45&&!previous.eol;
    previous={x,y,height,right:x+item.width,text:item.str,eol:item.hasEOL,lineStart:sameLine?previous.lineStart:x};
   }
   runs.push({text:'\n\n'});
   const pageWords=tokenize(runs);
   if(!pageWords.length)emptyPages++;
   for(const word of pageWords)words.push(word);
   if(words.length>500000)throw Error('This PDF contains too much text. Upload a smaller section.');
   page.cleanup();
  }
  if(!words.length)throw Error('This PDF has no selectable text. Run OCR on the scanned pages, then upload the searchable PDF.');
  words.importNotice='PDF layout and italics recovered where available.'+(emptyPages?` ${emptyPages} page(s) had no selectable text and were skipped; use OCR if they contain scanned text.`:'');
  return words;
 }catch(error){
  if(error.name==='PasswordException')throw Error('This PDF is password-protected. Upload an unlocked copy.');
  if(['InvalidPDFException','MissingPDFException'].includes(error.name))throw Error('This PDF could not be read. Try a fresh PDF export.');
  throw error;
 }finally{await task.destroy();}
}
