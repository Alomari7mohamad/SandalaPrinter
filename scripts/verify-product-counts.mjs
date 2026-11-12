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

 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;};
 const waitFor=async expression=>{for(let i=0;i<120;i++){if(await evaluate('Boolean('+expression+')'))return;await new Promise(r=>setTimeout(r,80));}throw Error('Timed out: '+expression);};
 const errors=[];
 socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);});
 await send('Runtime.enable',{});
 const fixture=await evaluate(`(async()=>{
  const api=window.desktopApi;
  const baseline=(await api.catalog.listServices()).filter(x=>x.itemType==='PRODUCT').length;
  const main=await api.catalog.saveCategory({nameAr:'فئة اختبار العدد',itemType:'PRODUCT',parentId:null});
  const child=await api.catalog.saveCategory({nameAr:'منتجات فرعية للاختبار',itemType:'PRODUCT',parentId:main.id});
  const empty=await api.catalog.saveCategory({nameAr:'فئة فارغة للاختبار',itemType:'PRODUCT',parentId:main.id});
  const serviceCategory=await api.catalog.saveCategory({nameAr:'خدمات اختبار العدد',itemType:'SERVICE',parentId:null});
  const input={nameHe:null,paperType:null,size:null,colorMode:null,coverage:null,unit:'قطعة',supplierId:null,reorderPoint:1,minimumOrderQuantity:1,costType:'PER_UNIT',unitCost:2,costBatchSize:null,active:true,notes:null};
  const one=await api.catalog.saveService({...input,code:'COUNT_ONE',nameAr:'منتج اختبار أول',itemType:'PRODUCT',categoryId:main.id,regularSalePrice:5,offerSalePrice:null});
  const two=await api.catalog.saveService({...input,code:'COUNT_TWO',nameAr:'منتج معطل للاختبار',itemType:'PRODUCT',categoryId:child.id,active:false,regularSalePrice:5,offerSalePrice:null});
  await api.catalog.saveService({...input,code:'COUNT_SERVICE',nameAr:'خدمة لا تحتسب',itemType:'SERVICE',categoryId:serviceCategory.id});
  return {baseline,main:main.id,child:child.id,empty:empty.id,one:one.id,two:two.id};
 })()`);
 await evaluate("location.hash='/';window.dispatchEvent(new Event('sandala:catalog-changed'))");
 await waitFor("Number(document.querySelector('.dashboard-catalog-summary strong')?.textContent.replace(/[^0-9]/g,''))==="+(fixture.baseline+2));
 await evaluate(`(async()=>{await window.desktopApi.catalog.deleteService(${JSON.stringify(fixture.two)});window.dispatchEvent(new Event('sandala:catalog-changed'));})()`);
 await waitFor("Number(document.querySelector('.dashboard-catalog-summary strong')?.textContent.replace(/[^0-9]/g,''))==="+(fixture.baseline+1));
 const screenshot=async name=>{const shot=await send('Page.captureScreenshot',{format:'png'});const p=join(root,name+'.png');writeFileSync(p,Buffer.from(shot.data,'base64'));console.log('SCREENSHOT='+p);};
 await screenshot('dashboard-product-count');
 await evaluate("location.hash='/categories'");
 await waitFor('document.querySelector('+JSON.stringify('[data-category-count="'+fixture.main+'"]')+')');
 const counts=await evaluate(`(()=>{const get=id=>Number(document.querySelector('[data-category-count="'+id+'"] strong')?.textContent);return [get(${JSON.stringify(fixture.main)}),get(${JSON.stringify(fixture.child)}),get(${JSON.stringify(fixture.empty)})]})()`);
 if(JSON.stringify(counts)!=='[1,0,0]')throw Error('Wrong category counts '+JSON.stringify(counts));
 await evaluate(`(()=>{const select=document.querySelector('.categories-page .filters-bar select');select.value=${JSON.stringify(fixture.main)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 await waitFor("document.querySelectorAll('[data-category-count]').length===3");
 await screenshot('category-product-counts');
 await evaluate("[...document.querySelectorAll('.catalog-type-tabs button')].find(x=>x.textContent==='تصنيفات الخدمات').click()");
 await waitFor("!document.querySelector('[data-category-count]')");
 await evaluate("location.hash='/products'");
 await waitFor("document.querySelector('.product-count-cards')");
 await evaluate(`(()=>{const select=document.querySelector('[aria-label="فلترة الفئة الرئيسية"]');select.value=${JSON.stringify(fixture.main)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 await waitFor("document.querySelectorAll('.product-count-cards article').length===2");
 const visible=await evaluate("[...document.querySelectorAll('.product-count-cards strong')].map(x=>Number(x.textContent.replace(/[^0-9]/g,'')))");
 if(visible[0]!==fixture.baseline+1||visible[1]!==1)throw Error('Product page count mismatch');
 if(await evaluate("document.documentElement.scrollWidth>innerWidth"))throw Error('Horizontal overflow');
 if(errors.length)throw Error(errors.join('\n'));
 console.log('PASS: total products, inactive products included, services excluded, live delete refresh, parent/child counts, zero counts and product-page summaries');
}finally{socket?.close();child.kill();}

