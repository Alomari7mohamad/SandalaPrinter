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
 const waitFor=async expression=>{for(let i=0;i<120;i++){if(await evaluate(`Boolean(${expression})`))return;await new Promise(r=>setTimeout(r,80));}throw Error('Timed out: '+expression);};
 const type=async(selector,text)=>{
  const bounds=await evaluate(`(()=>{const field=document.querySelector(${JSON.stringify(selector)});if(!field)throw Error('Missing field');field.scrollIntoView({block:'center'});const r=field.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await send('Input.dispatchMouseEvent',{type:'mousePressed',...bounds,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',...bounds,button:'left',clickCount:1});
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});
  await send('Input.insertText',{text});
  const value=await evaluate(`document.querySelector(${JSON.stringify(selector)}).value`);
  if(value!==text)throw Error('Keyboard entry failed: '+selector+' got '+value);
 };
 const nav=async(path,title)=>{await evaluate(`location.hash=${JSON.stringify(path)}`);await waitFor(`document.querySelector('h1')?.textContent===${JSON.stringify(title)} && document.querySelector('tbody tr button[title="تعديل"]')`);};
 const click=async selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
 await send('Page.enable',{});
 let nativeDialogs=0;
 socket.addEventListener('message',event=>{if(JSON.parse(event.data).method==='Page.javascriptDialogOpening')nativeDialogs++;});
 for(const [path,title,kind] of [['/products','المنتجات','PRODUCT'],['/services','الخدمات','SERVICE']]){
  await nav(path,title);
  const id=await evaluate(`(async()=>{const rows=await window.desktopApi.catalog.listServices();const name=document.querySelector('tbody tr td b').textContent;return rows.find(x=>x.itemType===${JSON.stringify(kind)}&&x.nameAr===name).id})()`);
  await click('tbody tr button[title="تعديل"]');
  await waitFor("document.querySelector('.modal input')");
  await waitFor("document.activeElement===document.querySelector('.modal input')");
  const changed=kind+' تجربة تعديل';
  await type('.modal input',changed);
  await type('.modal input[dir="rtl"][placeholder="اختياري"]','בדיקת עריכה');
  await type('.modal textarea','ملاحظات الكتابة والحفظ');
  console.log('Before save', await evaluate(`JSON.stringify({invalid:[...document.querySelectorAll('.modal :invalid')].map(x=>({name:x.name,value:x.value,label:x.closest('label')?.textContent})),error:document.querySelector('.modal .alert')?.textContent})`));
  await click('.modal .primary-button');
  await waitFor("!document.querySelector('.modal')");
  const saved=await evaluate(`(async()=>{const row=(await window.desktopApi.catalog.listServices()).find(x=>x.id===${JSON.stringify(id)});return {name:row.nameAr,he:row.nameHe,notes:row.notes}})()`);
  if(saved.name!==changed||saved.he!=='בדיקת עריכה'||saved.notes!=='ملاحظات الكتابة والحفظ')throw Error('Edit not persisted '+JSON.stringify(saved));
  // Dismiss an actual delete confirmation, then type again in the edit dialog.
  await click('tbody tr button.danger');
  await waitFor("document.querySelector('[aria-label=\"تأكيد العملية\"]')");
  await waitFor("document.querySelector('.modal').contains(document.activeElement)");
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await waitFor("!document.querySelector('.modal')");
  await click('tbody tr button[title="تعديل"]');
  await waitFor("document.querySelector('.modal input')");
  await type('.modal input',changed+' بعد إلغاء الحذف');
  await type('.modal input[type="number"]','2.5');
  if(kind==='PRODUCT') {
   await type('.modal input[name="regularPrice"]','75');
   await type('.modal input[name="offerPrice"]','60');
  }
  await click('.modal .primary-button');
  await waitFor("!document.querySelector('.modal')");
  const prices=await evaluate(`(async()=>{const row=(await window.desktopApi.catalog.listServices()).find(x=>x.id===${JSON.stringify(id)});return {cost:row.unitCost,regular:row.regularSalePrice,offer:row.offerSalePrice}})()`);
  if(prices.cost!==2.5 || kind==='PRODUCT'&&(prices.regular!==75||prices.offer!==60))throw Error('Typed numeric values were not saved');
  await click('tbody tr button.danger');
  await waitFor("document.querySelector('[aria-label=\"تأكيد العملية\"]')");
  await click('.modal .danger-button');
  await waitFor("!document.querySelector('.modal')");
  if(await evaluate(`(async()=> (await window.desktopApi.catalog.listServices()).some(x=>x.id===${JSON.stringify(id)}))()`))throw Error('Confirmed deletion failed');
  console.log(kind+': Arabic/Hebrew typing, notes, persistence, cancelled confirmation and repeated edit PASS');
 }
 if(nativeDialogs)throw Error('Native dialog regression');
 console.log('No native blocking dialogs; live data untouched. Synthetic database: '+root);
}finally{socket?.close();child.kill();}

