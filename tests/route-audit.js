const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/local/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:393,height:852}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file://'+path.resolve(__dirname,'../LocalWeChat/Resources/local_wechat.html'));
 await page.waitForFunction(()=>window.__LOCAL_WECHAT_READY__===true);
 const routes=[
  ['main',{}],['chat',{id:'chat_ai'}],['globalSearch',{}],['newContact',{}],['groups',{}],['newGroup',{}],['tags',{}],
  ['contactDetail',{id:'ai'}],['contactEdit',{id:'ai'}],['contactMoments',{id:'me'}],['moments',{}],['momentPublish',{}],
  ['friendsStatus',{}],['statusEdit',{}],['statusHistory',{}],['favorites',{}],['favoriteEdit',{}],['files',{}],
  ['settings',{}],['aiSettings',{}],['profile',{}],['backup',{}],['about',{}],['chatInfo',{id:'group_weekend'}]
 ];
 for(const [view,params] of routes){
  const missing=await page.evaluate(({view,params})=>{
   ui.view=view;ui.params=params;render();
   return [...document.querySelectorAll('[data-action]')].map(e=>e.dataset.action).filter(a=>typeof actions[a]!=='function');
  },{view,params});
  assert.deepStrictEqual(missing,[],view+' has missing actions: '+missing.join(','));
 }
 for(const tab of ['chats','contacts','discover','me']){
  const missing=await page.evaluate(tab=>{switchTab(tab);return [...document.querySelectorAll('[data-action]')].map(e=>e.dataset.action).filter(a=>typeof actions[a]!=='function')},tab);
  assert.deepStrictEqual(missing,[],tab+' has missing actions');
 }
 assert.deepStrictEqual(errors,[]);
 await browser.close();console.log('ALL ROUTES AND BUTTON ACTIONS PASSED');
})().catch(e=>{console.error(e);process.exit(1)});
