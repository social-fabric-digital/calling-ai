import { chromium } from 'playwright';

async function manualTest() {
  console.log('Opening browser for manual inspection...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const page = await browser.newPage({
    viewport: { width: 375, height: 812 },
  });
  
  const consoleMessages = [];
  const errors = [];
  
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    consoleMessages.push({ type, text });
    if (type === 'error') {
      console.log(`[CONSOLE ERROR] ${text}`);
    }
  });
  
  page.on('pageerror', error => {
    errors.push(error.toString());
    console.log(`[PAGE ERROR] ${error.toString()}`);
  });
  
  try {
    console.log('Loading http://localhost:8084...');
    await page.goto('http://localhost:8084', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    console.log('\n' + '='.repeat(70));
    console.log('INITIAL SCREEN ANALYSIS');
    console.log('='.repeat(70));
    
    // Get all text content
    const bodyText = await page.textContent('body');
    console.log('\nFull page text:');
    console.log(bodyText);
    
    // Get all buttons
    console.log('\n' + '-'.repeat(70));
    console.log('ALL BUTTONS ON PAGE:');
    console.log('-'.repeat(70));
    const buttons = await page.locator('button, [role="button"]').all();
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const text = await btn.textContent();
      const isVisible = await btn.isVisible();
      if (text) {
        console.log(`${i + 1}. [${isVisible ? 'VISIBLE' : 'HIDDEN'}] "${text.trim()}"`);
      }
    }
    
    await page.screenshot({ path: 'test-results/manual-01-initial.png', fullPage: true });
    console.log('\nScreenshot saved: manual-01-initial.png');
    
    // Click "Start my journey"
    console.log('\n' + '='.repeat(70));
    console.log('CLICKING: "Start my journey"');
    console.log('='.repeat(70));
    
    const startBtn = page.locator('text="Start my journey"').first();
    if (await startBtn.count() > 0) {
      await startBtn.click();
      await page.waitForTimeout(3000);
      
      const newText = await page.textContent('body');
      console.log('\nPage text after click:');
      console.log(newText);
      
      console.log('\n' + '-'.repeat(70));
      console.log('BUTTONS AFTER START:');
      console.log('-'.repeat(70));
      const buttonsAfter = await page.locator('button, [role="button"]').all();
      for (let i = 0; i < buttonsAfter.length; i++) {
        const btn = buttonsAfter[i];
        const text = await btn.textContent();
        const isVisible = await btn.isVisible();
        if (text) {
          console.log(`${i + 1}. [${isVisible ? 'VISIBLE' : 'HIDDEN'}] "${text.trim()}"`);
        }
      }
      
      await page.screenshot({ path: 'test-results/manual-02-after-start.png', fullPage: true });
      console.log('\nScreenshot saved: manual-02-after-start.png');
      
      // Try clicking Next
      console.log('\n' + '='.repeat(70));
      console.log('TRYING TO CLICK: Next button');
      console.log('='.repeat(70));
      
      const nextBtns = await page.locator('text="Next"').all();
      console.log(`\nFound ${nextBtns.length} elements with "Next" text`);
      
      for (let i = 0; i < Math.min(nextBtns.length, 3); i++) {
        const btn = nextBtns[i];
        const isVisible = await btn.isVisible();
        const text = await btn.textContent();
        console.log(`  ${i + 1}. [${isVisible ? 'VISIBLE' : 'HIDDEN'}] "${text}"`);
        
        if (isVisible) {
          try {
            await btn.click({ timeout: 2000 });
            await page.waitForTimeout(2000);
            
            const afterNextText = await page.textContent('body');
            console.log(`\nPage after clicking Next ${i + 1}:`);
            console.log(afterNextText);
            
            await page.screenshot({ path: `test-results/manual-03-after-next-${i + 1}.png`, fullPage: true });
            console.log(`Screenshot saved: manual-03-after-next-${i + 1}.png`);
            
            break;
          } catch (e) {
            console.log(`  Failed to click: ${e.message}`);
          }
        }
      }
      
    } else {
      console.log('Start button not found!');
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('ERROR SUMMARY');
    console.log('='.repeat(70));
    console.log(`Console errors: ${errors.length}`);
    if (errors.length > 0) {
      errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    }
    
    console.log('\n\nKeeping browser open for 60 seconds for manual inspection...');
    console.log('Check test-results/ folder for screenshots.');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
    console.log('\nBrowser closed.');
  }
}

manualTest().catch(console.error);
