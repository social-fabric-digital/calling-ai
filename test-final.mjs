import { chromium } from 'playwright';

async function comprehensiveFlowTest() {
  console.log('═'.repeat(70));
  console.log('COMPREHENSIVE APP FLOW TEST - localhost:8084');
  console.log('═'.repeat(70));
  console.log();
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 600
  });
  
  const page = await browser.newPage({
    viewport: { width: 375, height: 812 },
  });
  
  const consoleErrors = [];
  const pageErrors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      consoleErrors.push(text);
      console.log(`    [CONSOLE ERROR] ${text.substring(0, 100)}`);
    }
  });
  
  page.on('pageerror', error => {
    const text = error.toString();
    pageErrors.push(text);
    console.log(`    [PAGE ERROR] ${text.substring(0, 100)}`);
  });
  
  const report = {
    flow1: {
      steps: [],
      paywallDetected: false,
      paywallBeforeAccountCreation: null,
      accountCreationRequired: false,
      reachedCallingAwaits: false,
      blocker: null
    },
    flow2: {
      tested: false,
      insightFound: false,
      loadingQueueShown: false,
      skipQueueButtonFound: false,
      blocker: null
    },
    flow3: {
      consoleErrors: [],
      pageErrors: [],
      redScreenErrors: []
    }
  };
  
  try {
    console.log('FLOW 1: ONBOARDING');
    console.log('─'.repeat(70));
    console.log();
    
    // Load app
    console.log('→ Loading app at http://localhost:8084...');
    await page.goto('http://localhost:8084', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/flow1-01-initial.png', fullPage: true });
    
    let bodyText = await page.textContent('body');
    console.log(`  ✓ Loaded. Initial text: "${bodyText.substring(0, 80)}..."`);
    report.flow1.steps.push('App loaded successfully');
    
    // Start journey
    console.log('\n→ Clicking "Start my journey"...');
    const startBtn = page.locator('text="Start my journey"');
    if (await startBtn.count() > 0) {
      await startBtn.first().click();
      await page.waitForTimeout(2500);
      await page.screenshot({ path: 'test-results/flow1-02-after-start.png', fullPage: true });
      console.log('  ✓ Clicked');
      report.flow1.steps.push('Started journey');
    } else {
      console.log('  ✗ Button not found - BLOCKER');
      report.flow1.blocker = '"Start my journey" button not found';
      throw new Error('Cannot proceed');
    }
    
    // Navigate through onboarding carousel/intro screens
    console.log('\n→ Navigating through intro screens...');
    
    // Check if there's a Skip button (common in multi-screen intros)
    const skipBtn = page.locator('text="Skip"');
    if (await skipBtn.count() > 0 && await skipBtn.first().isVisible()) {
      console.log('  Found "Skip" button - using it to skip intro screens');
      await skipBtn.first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/flow1-03-after-skip.png', fullPage: true });
      report.flow1.steps.push('Skipped intro screens');
    } else {
      // Click through manually
      console.log('  No skip button, clicking through screens...');
      for (let i = 0; i < 5; i++) {
        const nextBtn = page.locator('text="Next"').first();
        if (await nextBtn.count() > 0 && await nextBtn.isVisible()) {
          await nextBtn.click();
          await page.waitForTimeout(1500);
          console.log(`    Screen ${i + 1} → Next`);
        } else {
          console.log(`    No more Next buttons after ${i} screens`);
          break;
        }
      }
      await page.screenshot({ path: 'test-results/flow1-03-after-intro.png', fullPage: true });
      report.flow1.steps.push('Completed intro screens');
    }
    
    // Now should be at onboarding questions
    console.log('\n→ Proceeding through onboarding questions...');
    
    let questionCount = 0;
    let maxQuestions = 25;
    
    for (let i = 0; i < maxQuestions; i++) {
      await page.waitForTimeout(1200);
      bodyText = await page.textContent('body');
      
      // Check for paywall
      if ((bodyText.toLowerCase().includes('premium') || 
           bodyText.toLowerCase().includes('upgrade') ||
           bodyText.toLowerCase().includes('unlock all')) &&
          (bodyText.toLowerCase().includes('subscribe') || bodyText.toLowerCase().includes('start free trial'))) {
        console.log(`\n  ⚠ PAYWALL DETECTED (before completion)`);
        report.flow1.paywallDetected = true;
        report.flow1.paywallBeforeAccountCreation = !report.flow1.accountCreationRequired;
        await page.screenshot({ path: 'test-results/flow1-paywall.png', fullPage: true });
        
        // Try to dismiss
        const dismissOptions = ['Continue Free', 'Maybe Later', 'Skip', 'Not Now', 'Continue', '×', 'Close'];
        let dismissed = false;
        for (const txt of dismissOptions) {
          const btn = page.locator(`text="${txt}"`).first();
          if (await btn.count() > 0) {
            try {
              if (await btn.isVisible()) {
                console.log(`    Dismissing with: "${txt}"`);
                await btn.click({ timeout: 2000 });
                await page.waitForTimeout(2000);
                dismissed = true;
                report.flow1.steps.push(`Paywall dismissed with "${txt}"`);
                break;
              }
            } catch (e) {}
          }
        }
        
        if (!dismissed) {
          console.log('    ✗ Cannot dismiss paywall - BLOCKER');
          report.flow1.blocker = 'Paywall cannot be dismissed';
          break;
        }
        continue;
      }
      
      // Check for account creation
      if ((bodyText.toLowerCase().includes('sign up') || bodyText.toLowerCase().includes('create account') || bodyText.toLowerCase().includes('create your account')) &&
          bodyText.toLowerCase().includes('email')) {
        console.log(`\n  ⚠ ACCOUNT CREATION REQUIRED`);
        report.flow1.accountCreationRequired = true;
        report.flow1.blocker = 'Account creation screen reached - requires credentials';
        await page.screenshot({ path: 'test-results/flow1-account-creation.png', fullPage: true });
        console.log('    Onboarding cannot proceed without login credentials');
        report.flow1.steps.push('Reached account creation screen');
        break;
      }
      
      // Check if reached home/calling awaits
      if (bodyText.includes("Today's Insight") || 
          bodyText.toLowerCase().includes('calling awaits') ||
          bodyText.toLowerCase().includes('your calling awaits') ||
          bodyText.includes('CallingAwaits')) {
        console.log(`\n  ✓ SUCCESS: Reached home screen / Calling Awaits!`);
        report.flow1.reachedCallingAwaits = true;
        report.flow1.steps.push('Successfully reached CallingAwaits/home screen');
        await page.screenshot({ path: 'test-results/flow1-success-home.png', fullPage: true });
        break;
      }
      
      // If we're on a question screen, try to answer and proceed
      questionCount++;
      console.log(`    Question screen ${questionCount}`);
      
      // Look for answer options (clickable items that aren't navigation buttons)
      const allClickable = await page.locator('div[role="button"], button, [class*="clickable"], [class*="option"]').all();
      
      let selectedAnswer = false;
      for (const elem of allClickable) {
        try {
          const text = await elem.textContent();
          const isVisible = await elem.isVisible();
          
          if (isVisible && text && text.length > 5 && text.length < 100 &&
              !text.toLowerCase().includes('next') &&
              !text.toLowerCase().includes('back') &&
              !text.toLowerCase().includes('skip') &&
              !text.toLowerCase().includes('continue')) {
            // This looks like an answer option
            console.log(`      Selecting: "${text.substring(0, 40)}"`);
            await elem.click({ timeout: 2000 });
            await page.waitForTimeout(800);
            selectedAnswer = true;
            break;
          }
        } catch (e) {
          // Element not clickable or disappeared
        }
      }
      
      // Now try to advance
      const advanceTexts = ['Next', 'Continue'];
      let advanced = false;
      
      for (const txt of advanceTexts) {
        const btn = page.locator(`text="${txt}"`).first();
        if (await btn.count() > 0) {
          try {
            if (await btn.isVisible()) {
              await btn.click({ timeout: 3000 });
              await page.waitForTimeout(1500);
              advanced = true;
              break;
            }
          } catch (e) {
            console.log(`      (Could not click "${txt}": ${e.message.substring(0, 50)})`);
          }
        }
      }
      
      if (!advanced) {
        console.log(`      No navigation button available - stopping`);
        await page.screenshot({ path: 'test-results/flow1-stuck.png', fullPage: true });
        report.flow1.steps.push(`Stopped at question ${questionCount} - no more navigation`);
        break;
      }
      
      // Take periodic screenshots
      if (questionCount % 5 === 0) {
        await page.screenshot({ path: `test-results/flow1-q${questionCount}.png`, fullPage: true });
      }
    }
    
    if (questionCount >= maxQuestions) {
      console.log(`\n  ⚠ Reached maximum questions (${maxQuestions}) without completing onboarding`);
      report.flow1.steps.push('Hit question limit');
    }
    
    // FLOW 2: Today's Insight
    console.log('\n');
    console.log('FLOW 2: TODAY\'S INSIGHT');
    console.log('─'.repeat(70));
    console.log();
    
    if (!report.flow1.reachedCallingAwaits) {
      console.log('✗ Cannot test - did not reach home screen');
      report.flow2.tested = false;
      report.flow2.blocker = 'Did not complete onboarding';
    } else {
      report.flow2.tested = true;
      console.log('→ Looking for "Today\'s Insight"...');
      
      const insightSelectors = [
        'text="Today\'s Insight"',
        'text="Todays Insight"',
        'text="Daily Insight"',
        'text=/today.*insight/i'
      ];
      
      let foundInsight = false;
      for (const selector of insightSelectors) {
        const elem = page.locator(selector).first();
        if (await elem.count() > 0) {
          try {
            if (await elem.isVisible()) {
              console.log('  ✓ Found, clicking...');
              await elem.click({ timeout: 3000 });
              await page.waitForTimeout(3000);
              await page.screenshot({ path: 'test-results/flow2-insight-opened.png', fullPage: true });
              foundInsight = true;
              report.flow2.insightFound = true;
              break;
            }
          } catch (e) {
            console.log(`  Tried clicking but failed: ${e.message.substring(0, 60)}`);
          }
        }
      }
      
      if (!foundInsight) {
        console.log('  ✗ "Today\'s Insight" not found or not clickable');
        report.flow2.insightFound = false;
      } else {
        // Check for loading/queue
        await page.waitForTimeout(1500);
        const insightText = await page.textContent('body');
        
        console.log('\n→ Checking for loading/queue screen...');
        if (insightText.toLowerCase().includes('loading') || 
            insightText.toLowerCase().includes('queue') ||
            insightText.toLowerCase().includes('generating')) {
          console.log('  ✓ Loading/Queue screen detected');
          report.flow2.loadingQueueShown = true;
          await page.screenshot({ path: 'test-results/flow2-queue.png', fullPage: true });
          
          // Look for Skip Queue button
          const skipQueueBtn = page.locator('text=/skip.*queue/i, button:has-text("Skip Queue")');
          if (await skipQueueBtn.count() > 0) {
            const visible = await skipQueueBtn.first().isVisible();
            if (visible) {
              console.log('  ✓ "Skip Queue" button FOUND and VISIBLE');
              report.flow2.skipQueueButtonFound = true;
              await page.screenshot({ path: 'test-results/flow2-skip-queue-btn.png', fullPage: true });
            } else {
              console.log('  ⚠ "Skip Queue" button exists but not visible');
              report.flow2.skipQueueButtonFound = false;
            }
          } else {
            console.log('  ✗ "Skip Queue" button NOT found');
            report.flow2.skipQueueButtonFound = false;
          }
        } else {
          console.log('  ⚠ No loading/queue screen shown');
          report.flow2.loadingQueueShown = false;
          console.log(`  Current screen: "${insightText.substring(0, 100)}"`);
        }
      }
    }
    
  } catch (error) {
    console.log(`\n✗ UNEXPECTED ERROR: ${error.message}`);
    await page.screenshot({ path: 'test-results/error.png', fullPage: true });
  }
  
  // FLOW 3: Errors
  console.log('\n');
  console.log('FLOW 3: ERRORS & RED SCREENS');
  console.log('─'.repeat(70));
  console.log();
  
  report.flow3.consoleErrors = consoleErrors;
  report.flow3.pageErrors = pageErrors;
  
  if (consoleErrors.length > 0) {
    console.log(`⚠ Console Errors: ${consoleErrors.length}`);
    consoleErrors.slice(0, 5).forEach((err, i) => {
      console.log(`  ${i + 1}. ${err.substring(0, 120)}`);
    });
    if (consoleErrors.length > 5) {
      console.log(`  ... and ${consoleErrors.length - 5} more`);
    }
  } else {
    console.log('✓ No console errors');
  }
  
  if (pageErrors.length > 0) {
    console.log(`\n⚠ Page Errors: ${pageErrors.length}`);
    pageErrors.slice(0, 5).forEach((err, i) => {
      console.log(`  ${i + 1}. ${err.substring(0, 120)}`);
    });
  } else {
    console.log('✓ No page errors');
  }
  
  console.log('\n');
  console.log('═'.repeat(70));
  console.log('FINAL TEST REPORT');
  console.log('═'.repeat(70));
  console.log();
  
  console.log('FLOW 1 - ONBOARDING:');
  console.log(`  Paywall appeared: ${report.flow1.paywallDetected ? 'YES' : 'NO'}`);
  if (report.flow1.paywallDetected) {
    console.log(`    Before account creation: ${report.flow1.paywallBeforeAccountCreation ? 'YES' : 'NO'}`);
  }
  console.log(`  Account creation required: ${report.flow1.accountCreationRequired ? 'YES' : 'NO'}`);
  console.log(`  Reached CallingAwaits: ${report.flow1.reachedCallingAwaits ? 'YES' : 'NO'}`);
  if (report.flow1.blocker) {
    console.log(`  BLOCKER: ${report.flow1.blocker}`);
  }
  console.log(`  Steps completed: ${report.flow1.steps.length}`);
  report.flow1.steps.forEach(step => console.log(`    - ${step}`));
  
  console.log('\nFLOW 2 - TODAY\'S INSIGHT:');
  if (report.flow2.tested) {
    console.log(`  Insight found: ${report.flow2.insightFound ? 'YES' : 'NO'}`);
    console.log(`  Loading/Queue shown: ${report.flow2.loadingQueueShown ? 'YES' : 'NO'}`);
    console.log(`  Skip Queue button: ${report.flow2.skipQueueButtonFound ? 'YES' : 'NO'}`);
  } else {
    console.log(`  NOT TESTED - ${report.flow2.blocker}`);
  }
  
  console.log('\nFLOW 3 - ERRORS:');
  console.log(`  Console errors: ${report.flow3.consoleErrors.length}`);
  console.log(`  Page errors: ${report.flow3.pageErrors.length}`);
  console.log(`  Red screen errors: ${report.flow3.redScreenErrors.length}`);
  
  console.log('\n' + '═'.repeat(70));
  console.log('Screenshots saved to: test-results/');
  console.log('═'.repeat(70));
  
  await browser.close();
}

comprehensiveFlowTest().catch(console.error);
