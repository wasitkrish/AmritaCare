const puppeteer = require('puppeteer');
const fs = require('fs');

(async ()=>{
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', msg => logs.push({ type: 'console', text: msg.text() }));
  page.on('pageerror', err => logs.push({ type: 'pageerror', text: String(err) }));
  page.on('requestfailed', req => logs.push({ type: 'requestfailed', url: req.url(), failure: req.failure() }));

  // capture network requests to /api/messages
  const requests = [];
  page.on('requestfinished', req => { if(req.url().includes('/api/messages')) requests.push({ url: req.url(), method: req.method(), postData: req.postData() }); });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 60000 });
  // Wait for chat input
  // Wait additional time to allow page scripts to initialize
  await new Promise(r=>setTimeout(r,6000));
  // Simulate a logged-in session so the client treats the user as authenticated
  await page.evaluate(() => {
    try{
      sessionStorage.setItem('mh_current', JSON.stringify({ email: 'headless@bl.students.amrita.edu', name: 'Headless Bot', uid: 'local_headless' }));
      if(typeof window.updateAuthGates === 'function') try{ window.updateAuthGates(); }catch(e){}
      // dispatch a loginSuccess event to update any bound handlers
      window.dispatchEvent(new Event('loginSuccess'));
    }catch(e){ console.warn('Headless: failed to set session', e); }
  });
  await page.waitForSelector('#messageInput', { timeout: 20000 });
  await page.type('#messageInput', 'Headless test message');

  // Click send
  await page.click('#sendBtn');

  // Wait a bit for network
  await new Promise(r=>setTimeout(r,5000));

  // Evaluate chat window
  const chatHtml = await page.$eval('#chatWindow', el => el.innerHTML);

  // Save logs
  fs.writeFileSync('tests/headless_logs.json', JSON.stringify({ logs, requests, chatHtml }, null, 2));

  console.log('Headless test finished. Logs written to tests/headless_logs.json');
  await browser.close();
})();
