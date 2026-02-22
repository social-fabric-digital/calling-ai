import { chromium } from 'playwright';

async function documentedFlowTest() {
  console.log('\n' + '═'.repeat(75));
  console.log('  EXPO WEB APP TEST - DETAILED FLOW DOCUMENTATION');
  console.log('═'.repeat(75) + '\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down to see what's happening
  });
  
  const page = await browser.newPage({
    viewport: { width: 375, height: 812 },
  });
  
  const log = [];
  const errors = {
    console: [],
    page: []
  };
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.console.push(msg.text());
    }
  });
  
  page.on('pageerror', error => {
    errors.page.push(error.toString());
  });
  
  function logStep(step) {
    const timestamp = new Date().toISOString().substr(11, 8);
    log.push(`[${timestamp}] ${step}`);
    console.log(`[${timestamp}] ${step}`);
  }
  
  try {
    logStep('═ FLOW 1: ONBOARDING ═');
    logStep('');
    
    logStep('Step 1: Load http://localhost:8084');
    await page.goto('http://localhost:8084', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/final-01-load.png', fullPage: true });
    
    let text = await page.textContent('body');
    logStep(`  ✓ Page loaded. Content: "${text.substring(0, 60)}..."`);
    
    logStep('');
    logStep('Step 2: Click "Start my journey"');
    const startBtn = page.locator('text="Start my journey"');
    if (await startBtn.count() === 0) {
      logStep('  ✗ BLOCKER: "Start my journey" button not found');
      logStep('  Test cannot proceed.');
      throw new Error('Start button missing');
    }
    
    await startBtn.first().click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/final-02-started.png', fullPage: true });
    logStep('  ✓ Clicked');
    
    text = await page.textContent('body');
    logStep(`  Current screen: "${text.substring(0, 80)}..."`);
    
    // Check for paywall immediately
    if (text.toLowerCase().includes('premium') || text.toLowerCase().includes('upgrade')) {
      logStep('  ⚠ OBSERVATION: Paywall-related content visible');
    }
    
    logStep('');
    logStep('Step 3: Handle intro carousel');
    const skipBtn = page.locator('text="Skip"');
    if (await skipBtn.count() > 0 && await skipBtn.first().isVisible()) {
      logStep('  Found "Skip" button for intro');
      await skipBtn.first().click();
      await page.waitForTimeout(2500);
      await page.screenshot({ path: 'test-results/final-03-skipped.png', fullPage: true });
      logStep('  ✓ Skipped intro screens');
    } else {
      logStep('  No skip button - advancing manually');
      for (let i = 0; i < 6; i++) {
        const next = page.locator('text="Next"').first();
        if (await next.count() > 0 && await next.isVisible()) {
          await next.click();
          await page.waitForTimeout(1500);
          logStep(`  ✓ Clicked Next (screen ${i + 1})`);
        } else {
          logStep(`  No more Next buttons after ${i} screens`);
          break;
        }
      }
      await page.screenshot({ path: 'test-results/final-03-after-intro.png', fullPage: true });
    }
    
    logStep('');
    logStep('Step 4: Navigate onboarding questions');
    logStep('  Attempting to answer up to 30 questions...');
    
    let completedQuestions = 0;
    let reachedHome = false;
    let hitPaywall = false;
    let hitAccountCreation = false;
    
    for (let q = 1; q <= 30; q++) {
      await page.waitForTimeout(1000);
      text = await page.textContent('body');
      
      // Check for completion
      if (text.includes("Today's Insight") || text.toLowerCase().includes('calling awaits')) {
        logStep(`  ✓ SUCCESS: Reached home screen after ${completedQuestions} questions!`);
        reachedHome = true;
        await page.screenshot({ path: 'test-results/final-HOME.png', fullPage: true });
        break;
      }
      
      // Check for paywall
      if (!hitPaywall && text.toLowerCase().includes('upgrade') && text.toLowerCase().includes('premium')) {
        logStep(`  ⚠ PAYWALL appeared at question ${q}`);
        logStep(`    Before account creation: ${!hitAccountCreation ? 'YES' : 'NO'}`);
        hitPaywall = true;
        await page.screenshot({ path: 'test-results/final-PAYWALL.png', fullPage: true });
        
        // Try to dismiss
        const dismissBtn = page.locator('text="Continue Free", text="Skip", text="Maybe Later", text="Not Now"').first();
        if (await dismissBtn.count() > 0) {
          await dismissBtn.click();
          await page.waitForTimeout(2000);
          logStep('    ✓ Dismissed paywall');
        } else {
          logStep('    ✗ BLOCKER: Cannot dismiss paywall');
          break;
        }
        continue;
      }
      
      // Check for account creation
      if (!hitAccountCreation && text.toLowerCase().includes('email') && text.toLowerCase().includes('sign up')) {
        logStep(`  ⚠ ACCOUNT CREATION screen reached at question ${q}`);
        hitAccountCreation = true;
        await page.screenshot({ path: 'test-results/final-ACCOUNT.png', fullPage: true });
        logStep('    ✗ BLOCKER: Requires login credentials to proceed');
        break;
      }
      
      logStep(`  Question ${q}:`);
      
      // Try to select any visible answer option
      // Look for all clickable elements
      const clickables = await page.$$('div, button, [role="button"]');
      let answered = false;
      
      for (const elem of clickables) {
        try {
          const txt = await elem.textContent();
          const box = await elem.boundingBox();
          
          if (box && txt && txt.length > 10 && txt.length < 100 &&
              !txt.toLowerCase().includes('next') &&
              !txt.toLowerCase().includes('back') &&
              !txt.toLowerCase().includes('skip')) {
            logStep(`    Selecting: "${txt.substring(0, 35)}..."`);
            await elem.click();
            await page.waitForTimeout(800);
            answered = true;
            break;
          }
        } catch (e) {
          // Element not interactable
        }
      }
      
      if (!answered) {
        logStep(`    (No answer selected)`);
      }
      
      // Try to advance
      const nextBtn = page.locator('text="Next", text="Continue"').first();
      if (await nextBtn.count() > 0) {
        try {
          await nextBtn.click({ timeout: 5000 });
          await page.waitForTimeout(1500);
          completedQuestions++;
          logStep(`    ✓ Advanced to next`);
          
          if (q % 5 === 0) {
            await page.screenshot({ path: `test-results/final-q${q}.png`, fullPage: true });
          }
        } catch (e) {
          logStep(`    ✗ Cannot click Next: ${e.message.substring(0, 60)}`);
          logStep(`    STUCK at question ${q}`);
          await page.screenshot({ path: 'test-results/final-STUCK.png', fullPage: true });
          break;
        }
      } else {
        logStep(`    ✗ No Next/Continue button found`);
        await page.screenshot({ path: 'test-results/final-STUCK.png', fullPage: true });
        break;
      }
    }
    
    logStep('');
    logStep('═ FLOW 2: TODAY\'S INSIGHT ═');
    logStep('');
    
    if (!reachedHome) {
      logStep('✗ Cannot test - did not reach home screen');
      logStep(`  Reason: ${hitAccountCreation ? 'Account creation required' : 'Stuck in onboarding'}`);
    } else {
      logStep('Step 5: Open Today\'s Insight');
      
      const insightBtn = page.locator('text="Today\'s Insight"');
      if (await insightBtn.count() > 0) {
        await insightBtn.first().click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-results/final-INSIGHT.png', fullPage: true });
        logStep('  ✓ Opened Today\'s Insight');
        
        text = await page.textContent('body');
        
        if (text.toLowerCase().includes('queue') || text.toLowerCase().includes('loading')) {
          logStep('  ✓ Loading/Queue screen visible');
          
          const skipQueue = page.locator('text=/skip.*queue/i');
          if (await skipQueue.count() > 0 && await skipQueue.first().isVisible()) {
            logStep('  ✓ "Skip Queue" button FOUND');
            await page.screenshot({ path: 'test-results/final-SKIP-QUEUE.png', fullPage: true });
          } else {
            logStep('  ✗ "Skip Queue" button NOT visible');
          }
        } else {
          logStep('  ⚠ No loading/queue screen shown');
        }
      } else {
        logStep('  ✗ "Today\'s Insight" not found');
      }
    }
    
  } catch (error) {
    logStep('');
    logStep(`✗ UNEXPECTED ERROR: ${error.message}`);
    await page.screenshot({ path: 'test-results/final-ERROR.png', fullPage: true });
  }
  
  logStep('');
  logStep('═ FLOW 3: ERRORS ═');
  logStep('');
  logStep(`Console errors: ${errors.console.length}`);
  if (errors.console.length > 0) {
    errors.console.slice(0, 3).forEach(err => {
      logStep(`  - ${err.substring(0, 100)}`);
    });
  }
  logStep(`Page errors: ${errors.page.length}`);
  if (errors.page.length > 0) {
    errors.page.forEach(err => {
      logStep(`  - ${err.substring(0, 100)}`);
    });
  }
  
  logStep('');
  logStep('═'.repeat(75));
  logStep('TEST COMPLETE - Screenshots in test-results/');
  logStep('═'.repeat(75));
  
  // Write log to file
  const fs = await import('fs');
  fs.writeFileSync('test-results/test-log.txt', log.join('\n'));
  console.log('\nFull log saved to: test-results/test-log.txt');
  
  await browser.close();
}

documentedFlowTest().catch(console.error);
