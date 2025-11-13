const puppeteer = require('puppeteer');
const fs = require('fs');

(async ()=>{
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', msg => logs.push({ type: 'console', text: msg.text() }));
  page.on('pageerror', err => logs.push({ type: 'pageerror', text: String(err) }));
  page.on('requestfailed', req => logs.push({ type: 'requestfailed', url: req.url(), failure: req.failure() }));

  const requests = [];
  page.on('requestfinished', req => { if(req.url().includes('/api/messages')) requests.push({ url: req.url(), method: req.method(), postData: req.postData() }); });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r=>setTimeout(r,6000));
  try{
    await page.waitForSelector('#chatWindow', { timeout: 20000 });
  }catch(e){ }
  const chatHtml = await page.$eval('#chatWindow', el => el.innerHTML).catch(()=> '');

  fs.writeFileSync('tests/headless_readonly_logs.json', JSON.stringify({ logs, requests, chatHtml }, null, 2));
  console.log('Headless readonly test finished. Logs written to tests/headless_readonly_logs.json');
  await browser.close();
})();