const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/local/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:393,height:852}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file://'+path.resolve(__dirname,'../LocalWeChat/Resources/local_wechat.html'));
 await page.waitForFunction(()=>window.__LOCAL_WECHAT_READY__);
 await page.evaluate(()=>{
  state.settings.ai.enabled=true;state.settings.ai.mediaModel='local-vision-test';state.settings.ai.replySpeed='instant';
  Native.getApiKey=async()=> 'local-test-key';
  window.__aiPayloads=[];
  Native.aiRequest=async(endpoint,key,body)=>{window.__aiPayloads.push(body);return {code:200,body:JSON.stringify({choices:[{message:{content:'这是本地模拟的视觉回复'}}]})}};
  navigate('chat',{id:'chat_ai'});
 });
 const png={name:'pixel.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')};
 let chooserPromise=page.waitForEvent('filechooser');
 await page.click('[data-action="toggle-more"]');await page.click('[data-action="pick-chat-image"]');
 await (await chooserPromise).setFiles(png);
 await page.waitForFunction(()=>window.__aiPayloads.length===1,{timeout:15000});
 let payload=await page.evaluate(()=>window.__aiPayloads[0]);
 let content=payload.messages[payload.messages.length-1].content;
 assert(Array.isArray(content));assert(content.some(part=>part.type==='image_url'));
 await page.waitForFunction(()=>[...document.querySelectorAll('.bubble')].some(e=>e.textContent.includes('本地模拟的视觉回复')));
 console.log('PASS multimodal image payload and AI response');

 chooserPromise=page.waitForEvent('filechooser');
 await page.click('[data-action="toggle-more"]');await page.click('[data-action="pick-chat-video"]');
 await (await chooserPromise).setFiles(path.resolve(__dirname,'test-video.mp4'));
 await page.waitForFunction(()=>window.__aiPayloads.length===2,{timeout:30000});
 payload=await page.evaluate(()=>window.__aiPayloads[1]);content=payload.messages[payload.messages.length-1].content;
 assert(Array.isArray(content));assert.strictEqual(content.filter(part=>part.type==='image_url').length,3);
 assert(content[0].text.includes('视频时长'));
 await page.waitForFunction(()=>!ui.aiTypingChats.has('chat_ai'));
 console.log('PASS video decoding, three-frame extraction and multimodal payload');

 await page.evaluate(()=>{state.settings.ai.autoLike=false;state.settings.ai.autoComment=false;navigate('moments');navigate('momentPublish')});
 chooserPromise=page.waitForEvent('filechooser');
 await page.click('[data-action="choose-moment-source"]');
 assert.deepStrictEqual(await page.locator('.sheet-action:not(.sheet-cancel)').allTextContents(),['拍摄','从手机相册选择']);
 await page.click('.sheet-action[data-action="pick-moment-media"]');
 await (await chooserPromise).setFiles([png,{...png,name:'pixel2.png'},{...png,name:'pixel3.png'}]);
 await page.waitForFunction(()=>ui.momentDraft&&ui.momentDraft.mediaIds.length===3);await page.click('[data-action="publish-moment"]');
 assert.strictEqual(await page.locator('.moment-item').first().locator('.media-cell').count(),3);
 await page.locator('.moment-item').first().locator('.media-cell').first().click();
 assert(await page.locator('.viewer-backdrop').isVisible());await page.click('.viewer-backdrop [data-action="close-overlay"]');
 console.log('PASS Moments three-image grid and media viewer');

 await page.click('[data-action="new-moment"]');
 chooserPromise=page.waitForEvent('filechooser');await page.click('[data-action="choose-moment-source"]');await page.click('.sheet-action[data-action="pick-moment-media"]');
 await (await chooserPromise).setFiles(path.resolve(__dirname,'test-video.mp4'));
 await page.waitForFunction(()=>ui.momentDraft&&ui.momentDraft.mediaIds.length===1);await page.click('[data-action="publish-moment"]');
 assert(await page.locator('.moment-item').first().locator('video').isVisible());
 console.log('PASS Moments video publishing');

 await page.evaluate(()=>{
  state.settings.ai.autoLike=true;state.settings.ai.autoComment=true;
  const nativeTimeout=window.setTimeout.bind(window);
  window.setTimeout=(fn,delay,...args)=>nativeTimeout(fn,Math.min(delay,30),...args);
 });
 await page.click('[data-action="new-moment"]');await page.fill('[data-input="moment-text"]','AI 互动测试');await page.click('[data-action="publish-moment"]');
 await page.waitForFunction(()=>{const m=state.moments.find(item=>item.text==='AI 互动测试');return m&&m.likes.includes('ai')&&m.comments.some(c=>c.author==='ai'&&c.text.includes('本地模拟的视觉回复'))},{timeout:10000});
 console.log('PASS delayed AI Moments like and AI-labelled comment');
 assert.deepStrictEqual(errors,[]);
 await browser.close();console.log('ALL MEDIA AND AI TESTS PASSED');
})().catch(e=>{console.error(e);process.exit(1)});
