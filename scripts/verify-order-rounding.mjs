import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import net from 'node:net';
const root=mkdtempSync(join(tmpdir(),'sandala-hierarchy-'));
mkdirSync(join(root,'data'));
const db=new DatabaseSync(join(root,'data','oh-printer-manager.db'));
db.exec("CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); INSERT INTO app_settings (key,value) VALUES ('migration.legacyInventoryRecoveryVersion','1')");
db.close();
const port=await new Promise(resolve=>{const server=net.createServer();server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});});
const child=spawn('node_modules/electron/dist/electron.exe',['.'],{env:{...process.env,SANDALA_USER_DATA_PATH:root,ELECTRON_REMOTE_DEBUGGING_PORT:String(port)},windowsHide:true,stdio:['ignore','ignore','inherit']});
let socket;
try {
 let page;
 for(let i=0;i<100&&!page;i++){
  try{page=(await (await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(t=>t.type==='page'&&t.url.includes('index.html'));}catch{}
  if(!page)await new Promise(r=>setTimeout(r,250));
 }
 if(!page)throw Error('Renderer not found');
 socket=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((ok,fail)=>{socket.addEventListener('open',ok,{once:true});socket.addEventListener('error',fail,{once:true});});
 await new Promise(r=>setTimeout(r,1500));
 let sequence=0;
 const send=(method,params)=>new Promise((resolve,reject)=>{
  const id=++sequence;
  const timer=setTimeout(()=>{socket.removeEventListener('message',onMessage);reject(Error('CDP timeout'));},45000);
  const onMessage=event=>{const data=JSON.parse(event.data);if(data.id===id){clearTimeout(timer);socket.removeEventListener('message',onMessage);if(data.error)reject(Error(JSON.stringify(data.error)));else resolve(data.result);}};
  socket.addEventListener('message',onMessage);socket.send(JSON.stringify({id,method,params}));
 });



 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;};
 const wait=async expression=>{for(let i=0;i<120;i++){if(await ev('Boolean('+expression+')'))return;await new Promise(r=>setTimeout(r,80));}throw Error('Timed out: '+expression);};
 const click=selector=>ev('document.querySelector('+JSON.stringify(selector)+').click()');
 const select=(selector,value)=>ev(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});const path=join(root,name+'.png');writeFileSync(path,Buffer.from(r.data,'base64'));console.log('SCREENSHOT='+path);};
 const f=await ev(`(async()=>{
  const api=window.desktopApi;
  const main=await api.catalog.saveCategory({nameAr:'طلبات تقريب تجريبية',itemType:'PRODUCT'});
  const child=await api.catalog.saveCategory({nameAr:'منتجات اختبار الخصم',itemType:'PRODUCT',parentId:main.id});
  const product=await api.catalog.saveService({code:'ROUND_UI',nameAr:'منتج اختبار التقريب',nameHe:'בדיקת עיגול',categoryId:child.id,paperType:null,size:null,colorMode:null,coverage:null,unit:'قطعة',itemType:'PRODUCT',supplierId:null,reorderPoint:1,minimumOrderQuantity:1,costType:'PER_UNIT',unitCost:10,costBatchSize:null,active:true,notes:null,regularSalePrice:63.5,offerSalePrice:null});
  return {main:main.id,product:product.id};
 })()`);
 await ev("location.hash='/new-order'");
 await wait("document.querySelector('select[name=catalogType]')");
 await select('select[name=catalogType]','PRODUCT');
 await wait('document.querySelector('+JSON.stringify('select[name=serviceCategory] option[value="'+f.main+'"]')+')');
 await select('select[name=serviceCategory]',f.main);
 await wait("document.querySelector('select[name=serviceProduct]').value==='"+f.product+"'");
 await wait("document.querySelector('.add-service-button').disabled===false");
 await click('.add-service-button');
 await wait("document.querySelector('.order-items-table')");
 await ev("[...document.querySelectorAll('.manager-discount-heading button')].find(b=>b.textContent.includes('20%')).click()");
 await wait("document.querySelector('.rounding-discount-row')?.innerText.includes('0.80')");
 const before=await ev("document.querySelector('.final-order-total b').textContent");
 if(before!=='50 ₪')throw Error('Final draft total has decimals: '+before);
 if(!await ev("document.querySelector('.live-summary').innerText.includes('63.50') && document.querySelector('.live-summary').innerText.includes('12.70')"))throw Error('Original and manager discount decimals lost');
 await shot('new-order-rounding');
 await click('.save-order-button');await wait("document.querySelector('.success-alert')");
 if(await ev("document.querySelector('.success-alert').innerText.includes('50.00')"))throw Error('Confirmation shows decimal total');
 const order=await ev("(async()=>{const rows=await window.desktopApi.orders.list({});return window.desktopApi.orders.get(rows[0].id)})()");
 if(order.total!==50||order.roundingDiscount!==0.8||order.discountAmount!==12.7||order.subtotal!==63.5)throw Error('Persisted totals differ from draft');
 await ev("location.hash='/orders'");
 await wait("document.querySelector('.view-order-button')");
 await click('.view-order-button');await wait("document.querySelector('.order-detail-totals .rounding-discount-row')");
 if(!await ev("document.querySelector('.order-detail-totals').innerText.includes('0.80')"))throw Error('Rounding missing in details');
 await ev("document.querySelector('.order-detail-totals').scrollIntoView({block:'center'})");await shot('order-detail-rounding');
 await click('.order-detail-header-actions .primary-button');await wait("document.querySelector('.invoice-print-sheet')");
 for(const size of ['THERMAL','A4','A5'])for(const lang of ['ar','he']){
  await select('.invoice-print-controls label:nth-child(1) select',size);
  await select('.invoice-print-controls label:nth-child(2) select',lang);
  await wait("document.querySelector('.invoice-print-sheet').lang==='"+lang+"' && document.querySelector('.invoice-print-sheet').classList.contains('invoice-size-"+size.toLowerCase()+"')");
  const printed=await ev("({discount:document.querySelector('.invoice-rounding-discount').innerText,final:document.querySelector('.invoice-final-total b').innerText,overflow:document.querySelector('.invoice-summary').scrollWidth>document.querySelector('.invoice-summary').clientWidth+1})");
  if(printed.final!=='50 ₪'||!printed.discount.includes('0.80')||printed.overflow)throw Error('Print preview failed '+size+' '+lang+': '+JSON.stringify(printed));
  if(!printed.discount.includes(lang==='ar'?'خصم المنازل العشرية':'הנחת עיגול'))throw Error('Missing localized rounding label');
  if(size==='THERMAL'&&lang==='ar'||size==='A4'&&lang==='he'){await ev("document.querySelector('.invoice-summary').scrollIntoView({block:'center'})");await shot('print-rounding-'+size+'-'+lang);}
 }
 console.log('PASS: 63.50 - 20% - 0.80 = 50, persisted rounding discount, integer final displays, order card, Arabic/Hebrew THERMAL/A4/A5 previews; no physical print sent');
}finally{socket?.close();child.kill();}

