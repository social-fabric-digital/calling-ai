import { chromium } from 'playwright';

async function testPrecise() {
  const browser = await chromium.launch({ headless: false, slowMo: 600 });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  
  const logs = [];
  let foundAstrologyLog = false;
  
  page.on('console', msg => {
    const txt = msg.text();
    logs.push({ type: msg.type(), text: txt });
    if (txt.includes('CALLING ASTROLOGY API')) {
      foundAstrologyLog = true;
      console.log(`\n🔔 FOUND: "${txt}"\n`);
    }
  });
  
  try {
    console.log('STEP 1: Navigate to home');
    await page.goto('http://localhost:8084/(tabs)', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/p1-home.png', fullPage: true });
    console.log('✓ Home loaded\n');
    
    console.log('STEP 2: Close modal if present');
    const closeBtn = page.locator('text="✕", text="×"');
    if (await closeBtn.count() > 0) {
      await closeBtn.first().click();
      await page.waitForTimeout(2000);
      console.log('✓ Modal closed\n');
    } else {
      console.log('No modal found\n');
    }
    
    console.log('STEP 3: Click Today\'s Insight');
    await page.mouse.click(94, 508);
    await page.waitForTimeout(3000);
    console.log('✓ Clicked\n');
    
    console.log('STEP 4: Poll for content (5 times)');
    for (let i = 1; i <= 5; i++) {
      await page.waitForTimeout(2000);
      const txt = await page.textContent('body');
      console.log(`\nPoll ${i}:`);
      console.log(`  Queue: ${txt.toLowerCase().includes('queue')}`);
      console.log(`  Loading: ${txt.toLowerCase().includes('loading')}`);
      console.log(`  Skip Queue: ${txt.includes('Skip') && txt.includes('Queue')}`);
      await page.screenshot({ path: `test-results/p-poll${i}.png`, fullPage: true });
      
      if (!txt.toLowerCase().includes('loading') && !txt.toLowerCase().includes('generating')) {
        break;
      }
    }
    
    console.log('\n\nSTEP 5: Final analysis');
    const final = await page.textContent('body');
    await page.screenshot({ path: 'test-results/p-final.png', fullPage: true });
    
    console.log('\nVisible content:');
    console.log(final.substring(0, 600));
    
    console.log('\n\nSTEP 6: Console log check');
    console.log(`Total messages: ${logs.length}`);
    console.log(`\n"CALLING ASTROLOGY API" found: ${foundAstrologyLog ? 'YES ✓' : 'NO ✗'}\n`);
    
    if (logs.length > 0) {
      console.log('First 15 console messages:');
      logs.slice(0, 15).forEach((m, i) => {
        console.log(`  ${i+1}. [${m.type}] ${m.text.substring(0, 80)}`);
      });
    }
    
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
  }
  
  console.log('\n\nBrowser open for 20s...');
  await page.waitForTimeout(20000);
  await browser.close();
}

testPrecise().catch(console.error);
