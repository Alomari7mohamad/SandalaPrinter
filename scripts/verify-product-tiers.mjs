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
 const fill=(selector,value)=>ev(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 const f=await ev(`(async()=>{
 const api=window.desktopApi,c=await api.catalog.saveCategory({nameAr:'منتجات اختبار الشرائح',itemType:'PRODUCT'});
 const p=await api.catalog.saveService({code:'TIERS_UI',nameAr:'منتج شرائح تجريبي',nameHe:null,categoryId:c.id,paperType:null,size:null,colorMode:null,coverage:null,unit:'قطعة',itemType:'PRODUCT',supplierId:null,reorderPoint:1,minimumOrderQuantity:1,costType:'PER_UNIT',unitCost:2,costBatchSize:null,active:true,notes:null,regularSalePrice:10,offerSalePrice:8});
 const order=await api.orders.create({items:[{serviceId:p.id,quantity:3}],discountType:'NONE',discountValue:0,customerName:null,customerPhone:null,deliveryAddress:null,businessLogoDataUrl:null,notes:null});
 return {id:p.id,order:order.id,total:order.total};
 })()`);
 if(f.total!==24)throw Error('Initial offer not preserved');
 await ev("location.hash='/pricing?service="+f.id+"'");
 await wait("document.querySelector('.pricing-rule-card:not(.disabled)')");
 if(await ev("document.body.innerText.includes('تعديل الأسعار')"))throw Error('Fixed editor remains');
 await click('.pricing-rule-card:not(.disabled) button[title="تعديل الشريحة"]');
 await wait("document.querySelector('.pricing-range-form')");
 await ev("[...document.querySelectorAll('.range-mode-switch button')].find(x=>x.textContent==='من — إلى').click()");
 await fill('.quantity-range-fields label:first-child input','1');await fill('.quantity-range-fields label:nth-child(2) input','10');await fill('input[inputmode=decimal]','7');
 await click('.modal .primary-button');await wait("!document.querySelector('.modal')");
 const add=async(min,max,price)=>{
 await click('.pricing-rule-editor .primary-button');await wait("document.querySelector('.pricing-range-form')");
 if(max===null)await ev("[...document.querySelectorAll('.range-mode-switch button')].find(x=>x.textContent==='رقم فأكثر').click()");
 await fill('.quantity-range-fields label:first-child input',String(min));if(max!==null)await fill('.quantity-range-fields label:nth-child(2) input',String(max));await fill('input[inputmode=decimal]',String(price));await click('.modal .primary-button');await wait("!document.querySelector('.modal')");
 };
 await add(11,20,6);await add(21,null,5);
 const prices=await ev("(async()=>Promise.all([1,10,11,20,21].map(q=>window.desktopApi.pricing.calculate('"+f.id+"',q).then(x=>x.salePrice))))()");
 if(JSON.stringify(prices)!=='[7,70,66,120,105]')throw Error('Wrong tier totals '+JSON.stringify(prices));
 await ev("document.querySelectorAll('.pricing-rule-card:not(.disabled) button[title=\"تعديل الشريحة\"]')[1].click()");
 await wait("document.querySelector('.pricing-range-form')");await fill('input[inputmode=decimal]','5.5');await click('.modal .primary-button');await wait("!document.querySelector('.modal')");
 const saved=await ev("(async()=>window.desktopApi.orders.create({items:[{serviceId:'"+f.id+"',quantity:12}],discountType:'NONE',discountValue:0,customerName:null,customerPhone:null,deliveryAddress:null,businessLogoDataUrl:null,notes:null}))()");
 if(saved.total!==66||saved.totalCost!==24)throw Error('Order ignored edited product tier');
 const shot=await send('Page.captureScreenshot',{format:'png'});const shotPath=join(root,'product-tiers.png');writeFileSync(shotPath,Buffer.from(shot.data,'base64'));console.log('SCREENSHOT='+shotPath);
 for(let n=3;n>0;n--){await click('.pricing-rule-card:not(.disabled) button[title="حذف الشريحة"]');await wait("document.querySelector('[aria-label=\"تأكيد العملية\"]')");await click('.modal .danger-button');await wait("document.querySelectorAll('.pricing-rule-card:not(.disabled)').length==="+(n-1));}
 const after=await ev("(async()=>({price:await window.desktopApi.pricing.calculate('"+f.id+"',12),rules:await window.desktopApi.pricing.listRules('"+f.id+"'),old:await window.desktopApi.orders.get('"+f.order+"'),recent:await window.desktopApi.orders.get('"+saved.id+"')}))()");
 if(!after.price.requiresManualPricing||after.rules.length)throw Error('Deleted tiers fell back to old fixed price');
 if(after.old.total!==24||after.recent.total!==66)throw Error('Saved orders changed');
 console.log('PASS: UI add/edit/delete product tiers, quantity boundaries, new order prices, old order snapshots, no fixed-price fallback');
}finally{socket?.close();child.kill();}

