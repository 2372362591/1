const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');

(async () => {
  const browser = await chromium.launch({headless:true,executablePath:'/usr/local/bin/chromium',args:['--no-sandbox']});
  const context = await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true,acceptDownloads:true});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror',error => errors.push(error.message));
  page.on('console',message => { if (message.type() === 'error') console.error('console:',message.text()); });
  const url = 'file://' + path.resolve(__dirname,'../LocalWeChat/Resources/local_wechat.html');
  await page.goto(url);
  await page.waitForFunction(() => window.__LOCAL_WECHAT_READY__ === true);
  assert(await page.locator('text=微信').first().isVisible());
  console.log('PASS application initialization');

  await page.click('[data-action="tab"][data-id="contacts"]');
  await page.click('[data-action="open-contact"][data-id="ai"]');
  await page.click('[data-action="open-ai-settings"]');
  assert(await page.locator('input[name="endpoint"]').isVisible());
  await page.fill('input[name="personaName"]','测试小满');
  await page.locator('form[data-form="ai-settings"] button[type="submit"]').first().click();
  await page.waitForTimeout(250);
  assert((await page.inputValue('input[name="personaName"]')) === '测试小满');
  console.log('PASS AI settings and persona form');

  await page.click('[data-action="back"]');
  await page.click('[data-action="nav"][data-view="contactEdit"]');
  let chooserPromise = page.waitForEvent('filechooser');
  await page.click('[data-action="pick-contact-avatar"]');
  let chooser = await chooserPromise;
  await chooser.setFiles({name:'avatar.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')});
  await page.waitForTimeout(350);
  assert(await page.locator('img').first().isVisible());
  console.log('PASS custom AI avatar');

  await page.click('[data-action="back"]');
  await page.click('[data-action="back"]');
  await page.click('[data-action="tab"][data-id="discover"]');
  await page.click('[data-action="nav"][data-view="moments"]');
  await page.click('[data-action="change-moment-cover"]');
  chooserPromise = page.waitForEvent('filechooser');
  await page.click('[data-action="pick-moment-cover"]');
  chooser = await chooserPromise;
  await chooser.setFiles({name:'cover.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')});
  await page.waitForTimeout(350);
  assert(await page.locator('.moment-cover-image').isVisible());
  console.log('PASS custom Moments cover');

  await page.click('[data-action="new-moment"]');
  await page.fill('[data-input="moment-text"]','第一条自动化测试朋友圈');
  await page.click('[data-action="publish-moment"]');
  await page.waitForTimeout(250);
  assert(await page.locator('.moment-text').first().textContent() === '第一条自动化测试朋友圈');
  await page.locator('.moment-item').first().locator('[data-action="moment-menu"]').click();
  await page.click('[data-action="like-moment"]');
  assert(await page.locator('.social-likes').first().isVisible());
  await page.locator('.moment-item').first().locator('[data-action="moment-menu"]').click();
  await page.click('[data-action="comment-moment"]');
  await page.fill('.modal input[name="value"]','测试评论');
  await page.click('.modal button[type="submit"]');
  assert((await page.locator('.comment').first().textContent()).includes('测试评论'));
  console.log('PASS Moments publish, like and comment');

  await page.click('[data-action="back"]');
  await page.click('[data-action="tab"][data-id="chats"]');
  await page.click('[data-action="open-chat"][data-id="chat_lin"]');
  await page.fill('#message-input','自动化聊天测试');
  await page.click('[data-action="send-text"]');
  assert((await page.locator('.message-row.own .bubble').last().textContent()) === '自动化聊天测试');
  await page.waitForTimeout(3200);
  assert(await page.locator('.message-row:not(.own) .bubble').count() >= 3);
  console.log('PASS chat send and local reply');

  await page.locator('.message-row.own').last().click({button:'right'});
  await page.click('[data-action="favorite-message"]');
  await page.click('[data-action="back"]');
  await page.click('[data-action="tab"][data-id="me"]');
  await page.click('[data-action="nav"][data-view="favorites"]');
  assert((await page.locator('.row-title').first().textContent()).includes('自动化聊天测试'));
  console.log('PASS long press and favorite message');

  await page.click('[data-action="back"]');
  await page.click('[data-action="nav"][data-view="settings"]');
  await page.click('[data-action="toggle-dark"]');
  assert(await page.locator('body.dark').count() === 1);
  await page.click('[data-action="toggle-dark"]');
  assert(await page.locator('body.dark').count() === 0);
  console.log('PASS dark mode toggle');

  await page.click('[data-action="back"]');
  await page.click('[data-action="tab"][data-id="chats"]');
  await page.click('[data-action="open-chat"][data-id="chat_ai"]');
  chooserPromise = page.waitForEvent('filechooser');
  await page.click('[data-action="toggle-more"]');
  await page.click('[data-action="pick-chat-image"]');
  chooser = await chooserPromise;
  await chooser.setFiles({name:'ai-photo.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')});
  await page.waitForTimeout(400);
  assert(await page.locator('.chat-image').count() >= 1);
  assert((await page.locator('.bubble.error').last().textContent()).includes('AI 尚未启用'));
  console.log('PASS send image to AI with honest disabled-state response');

  const downloadPromise = page.waitForEvent('download');
  await page.evaluate(() => exportBackup());
  const download = await downloadPromise;
  assert(download.suggestedFilename().endsWith('.json'));
  console.log('PASS full backup export');

  assert.deepStrictEqual(errors,[]);
  await browser.close();
  console.log('ALL SMOKE TESTS PASSED');
})().catch(error => { console.error(error); process.exit(1); });
