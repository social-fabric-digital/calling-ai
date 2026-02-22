import { chromium } from 'playwright';

async function testTodaysInsightPrecisely() {
  console.log('\n' + '═'.repeat(90));
  console.log('PRECISE TODAY\'S INSIGHT TEST - WITH MODAL HANDLING');
  console.log('═'.repeat(90) + '\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 600
  });
  
  const page = await browser.newPage({
    viewport: { width: 375, height: 812 },
  });
  
  const consoleMessages = [];
  const errors = { console: [], page: [] };
  let callingAstrologyApiFound = false;
  
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    
    consoleMessages.push({ type, text });
    
    if (type === 'error') {
      errors.console.push(text);
    }
    
    if (text.includes('CALLING ASTROLOGY API')) {
      callingAstrologyApiFound = true;
      console.log(`\n🔔 FOUND LOG: "${text}"\n`);
    }
  });
  
  page.on('pageerror', error => {
    errors.page.push(error.toString());
  });
  
  try {
    console.log('STEP 1: Navigate to home screen');
    console.log('─'.repeat(90));
    await page.goto('http://localhost:8084/(tabs)', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
    
    let text = await page.textContent('body');
    console.log(`✓ Loaded home screen`);
    console.log(`Content includes Today's Insight: ${text.includes("Today's Insight") ? 'YES' : 'NO'}\n`);
    
    await page.screenshot({ path: 'test-results/precise-01-home.png', fullPage: true });
    
    console.log('STEP 2: Check for and close tutorial/help modal');
    console.log('─'.repeat(90));
    
    // Look for close buttons
    const closeSelectors = [
      'text="✕"',
      'text="×"',
      'text="X"',
      'text="Close"',
      '[aria-label="Close"]',
      'button:has-text("✕")',
      'button:has-text("×")',
    ];
    
    let modalClosed = false;
    for (const selector of closeSelectors) {
      const closeBtn = page.locator(selector);
      const count = await closeBtn.count();
      
      if (count > 0) {
        console.log(`Found close button with selector: ${selector}`);
        
        for (let i = 0; i < count; i++) {
          try {
            const isVisible = await closeBtn.nth(i).isVisible();
            if (isVisible) {
              const btnText = await closeBtn.nth(i).textContent();
              console.log(`  Clicking close button: "${btnText}"`);
              
              await closeBtn.nth(i).click({ timeout: 3000 });
              await page.waitForTimeout(2000);
              modalClosed = true;
              console.log(`✓ Modal closed\n`);
              
              await page.screenshot({ path: 'test-results/precise-02-modal-closed.png', fullPage: true });
              break;
            }
          } catch (e) {
            console.log(`  Could not click: ${e.message.substring(0, 60)}`);
          }
        }
        
        if (modalClosed) break;
      }
    }
    
    if (!modalClosed) {
      console.log(`No modal/close button found (modal may not be present)\n`);
    }
    
    console.log('STEP 3: Click Today\'s Insight card/button');
    console.log('─'.repeat(90));
    
    text = await page.textContent('body');
    console.log(`Current page text includes Today's Insight: ${text.includes("Today's Insight")}`);
    
    let insightOpened = false;
    
    // Try clicking at the known position first
    console.log(`\nAttempting click at known card center position (94, 508)...`);
    try {
      await page.mouse.click(94, 508);
      console.log(`✓ Click executed\n`);
      insightOpened = true;
    } catch (e) {
      console.log(`✗ Click failed: ${e.message.substring(0, 80)}`);
    }
    
    if (!insightOpened) {
      console.log(`\n✗ BLOCKER: Could not click Today's Insight card`);
      await page.screenshot({ path: 'test-results/precise-BLOCKED.png', fullPage: true });
    } else {
      console.log('STEP 4: Wait for content to load and poll');
      console.log('─'.repeat(90));
      
      // Poll multiple times
      for (let poll = 1; poll <= 5; poll++) {
        await page.waitForTimeout(2000);
        
        text = await page.textContent('body');
        console.log(`\nPoll ${poll}:`);
        console.log(`  Content preview: "${text.substring(0, 150).replace(/\n/g, ' ')}..."`);
        
        const indicators = {
          hasQueue: text.toLowerCase().includes('queue'),
          hasLoading: text.toLowerCase().includes('loading'),
          hasGenerating: text.toLowerCase().includes('generating'),
          hasSkipQueue: text.toLowerCase().includes('skip') && text.toLowerCase().includes('queue'),
          hasError: text.toLowerCase().includes('error'),
        };
        
        console.log(`  Queue: ${indicators.hasQueue ? 'YES' : 'NO'}`);
        console.log(`  Loading: ${indicators.hasLoading ? 'YES' : 'NO'}`);
        console.log(`  Generating: ${indicators.hasGenerating ? 'YES' : 'NO'}`);
        console.log(`  Skip Queue: ${indicators.hasSkipQueue ? 'YES' : 'NO'}`);
        console.log(`  Error: ${indicators.hasError ? 'YES' : 'NO'}`);
        
        await page.screenshot({ path: `test-results/precise-poll-${poll}.png`, fullPage: true });
        
        if (!indicators.hasQueue && !indicators.hasLoading && !indicators.hasGenerating) {
          console.log(`  Content appears stable`);
          break;
        }
      }
      
      console.log('\n' + '═'.repeat(90));
      console.log('STEP 5: FINAL SCREEN ANALYSIS');
      console.log('═'.repeat(90));
      
      text = await page.textContent('body');
      await page.screenshot({ path: 'test-results/precise-FINAL.png', fullPage: true });
      
      console.log(`\nFull visible content:\n`);
      console.log('─'.repeat(90));
      console.log(text.substring(0, 800));
      console.log('─'.repeat(90));
      
      console.log('\n📊 OBSERVED LABELS:\n');
      
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      const relevantLines = lines.filter(line => {
        const lower = line.toLowerCase();
        return lower.includes('queue') || lower.includes('skip') || 
               lower.includes('loading') || lower.includes('insight') ||
               lower.includes('generating') || lower.includes('error');
      });
      
      if (relevantLines.length > 0) {
        relevantLines.slice(0, 20).forEach(line => {
          console.log(`  - "${line.trim()}"`);
        });
      } else {
        console.log(`  (No queue/loading/skip labels found)`);
      }
      
      console.log('\n🔍 SKIP QUEUE BUTTON SEARCH:\n');
      
      const skipBtn = page.locator('text=/skip.*queue/i, button:has-text("Skip"), text="Skip Queue"');
      const skipCount = await skipBtn.count();
      
      if (skipCount > 0) {
        console.log(`Found ${skipCount} potential Skip Queue elements:`);
        for (let i = 0; i < skipCount; i++) {
          try {
            const isVisible = await skipBtn.nth(i).isVisible();
            const btnText = await skipBtn.nth(i).textContent();
            console.log(`  ${i + 1}. "${btnText}" - Visible: ${isVisible}`);
          } catch (e) {}
        }
      } else {
        console.log(`✗ Skip Queue button NOT FOUND`);
      }
      
      console.log('\n❌ VISIBLE ERRORS ON SCREEN:\n');
      
      const errorLines = lines.filter(line => 
        line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')
      );
      
      if (errorLines.length > 0) {
        errorLines.forEach(line => console.log(`  - "${line.trim()}"`));
      } else {
        console.log(`✓ No error messages visible`);
      }
    }
    
  } catch (error) {
    console.log(`\n❌ UNEXPECTED ERROR: ${error.message}`);
    await page.screenshot({ path: 'test-results/precise-ERROR.png', fullPage: true });
  }
  
  console.log('\n' + '═'.repeat(90));
  console.log('STEP 6: CONSOLE LOG ANALYSIS');
  console.log('═'.repeat(90));
  
  console.log(`\nTotal console messages captured: ${consoleMessages.length}`);
  
  console.log('\n🔍 SEARCHING FOR "CALLING ASTROLOGY API":\n');
  
  if (callingAstrologyApiFound) {
    console.log(`✓ FOUND: "CALLING ASTROLOGY API" log entry\n`);
    const matches = consoleMessages.filter(msg => msg.text.includes('CALLING ASTROLOGY API'));
    matches.forEach(msg => {
      console.log(`  [${msg.type}] ${msg.text}`);
    });
  } else {
    console.log(`✗ NOT FOUND: "CALLING ASTROLOGY API" log entry\n`);
  }
  
  console.log('\n📋 CONSOLE MESSAGES (showing first 20):\n');
  
  if (consoleMessages.length > 0) {
    consoleMessages.slice(0, 20).forEach((msg, i) => {
      console.log(`${i + 1}. [${msg.type}] ${msg.text.substring(0, 100)}`);
    });
    if (consoleMessages.length > 20) {
      console.log(`\n... and ${consoleMessages.length - 20} more messages`);
    }
  } else {
    console.log('(No console messages captured)');
  }
  
  const uniqueErrors = [...new Set(errors.console)];
  console.log(`\n\nConsole errors: ${errors.console.length} total, ${uniqueErrors.length} unique\n`);
  
  if (uniqueErrors.length > 0) {
    uniqueErrors.forEach(err => {
      console.log(`- ${err.substring(0, 150)}`);
    });
  }
  
  console.log('\n' + '═'.repeat(90));
  console.log('✓ TEST COMPLETE');
  console.log('═'.repeat(90));
  console.log('\nScreenshots: test-results/precise-*.png\n');
  
  console.log('Browser staying open for 20 seconds...');
  await page.waitForTimeout(20000);
  
  await browser.close();
}

testTodaysInsightPrecisely().catch(console.error);
