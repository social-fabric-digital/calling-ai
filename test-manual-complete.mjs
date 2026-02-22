import { chromium } from 'playwright';

async function manualOnboardingTest() {
  console.log('\n' + '═'.repeat(80));
  console.log('MANUAL ONBOARDING FLOW TEST - PUSHING THROUGH TO COMPLETION');
  console.log('═'.repeat(80) + '\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
  });
  
  const page = await browser.newPage({
    viewport: { width: 375, height: 812 },
  });
  
  const flow = [];
  const errors = { console: [], page: [] };
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      errors.console.push(text);
      console.log(`  [❌ CONSOLE ERROR] ${text.substring(0, 120)}`);
    }
  });
  
  page.on('pageerror', error => {
    errors.page.push(error.toString());
    console.log(`  [❌ PAGE ERROR] ${error.toString().substring(0, 120)}`);
  });
  
  try {
    console.log('🌐 STEP 1: Load app at http://localhost:8084');
    await page.goto('http://localhost:8084', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/manual-01-initial.png', fullPage: true });
    flow.push('✓ App loaded');
    console.log('  ✓ Loaded\n');
    
    console.log('🚀 STEP 2: Click "Start my journey"');
    await page.locator('text="Start my journey"').first().click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'test-results/manual-02-started.png', fullPage: true });
    flow.push('✓ Clicked "Start my journey"');
    console.log('  ✓ Clicked\n');
    
    console.log('⏭️  STEP 3: Skip intro screens');
    const skipBtn = page.locator('text="Skip"');
    if (await skipBtn.count() > 0 && await skipBtn.first().isVisible()) {
      await skipBtn.first().click();
      await page.waitForTimeout(2000);
      flow.push('✓ Skipped intro carousel');
      console.log('  ✓ Skipped\n');
    }
    await page.screenshot({ path: 'test-results/manual-03-after-skip.png', fullPage: true });
    
    console.log('📝 STEP 4: Navigate through onboarding questions');
    console.log('  Strategy: Click first visible answer option, then Next/Continue\n');
    
    let questionNum = 0;
    let maxQuestions = 50;
    let reachedEnd = false;
    
    for (let i = 0; i < maxQuestions; i++) {
      await page.waitForTimeout(800);
      const bodyText = await page.textContent('body');
      
      // Check for end states
      if (bodyText.includes("Today's Insight") || 
          bodyText.toLowerCase().includes('calling awaits') ||
          bodyText.toLowerCase().includes('which direction calls you') ||
          bodyText.includes('Home') && bodyText.includes('Profile')) {
        console.log('\n🎉 SUCCESS: Reached home screen!');
        flow.push(`✓ Reached home screen after ${questionNum} questions`);
        await page.screenshot({ path: 'test-results/manual-HOME.png', fullPage: true });
        reachedEnd = true;
        break;
      }
      
      // Check for paywall
      if ((bodyText.toLowerCase().includes('premium') || bodyText.toLowerCase().includes('upgrade')) &&
          (bodyText.toLowerCase().includes('subscribe') || bodyText.toLowerCase().includes('unlock'))) {
        console.log('\n💰 PAYWALL DETECTED');
        flow.push(`⚠ Paywall at question ${questionNum}`);
        await page.screenshot({ path: 'test-results/manual-PAYWALL.png', fullPage: true });
        
        // Try to dismiss - look for various dismiss options
        const dismissOptions = [
          'Continue Free',
          'Maybe Later',
          'Skip',
          'Not Now',
          'Continue',
          '×',
          'Close'
        ];
        
        let dismissed = false;
        for (const option of dismissOptions) {
          const btn = page.locator(`text="${option}"`).first();
          if (await btn.count() > 0) {
            try {
              if (await btn.isVisible()) {
                console.log(`  Dismissing with: "${option}"`);
                await btn.click({ timeout: 3000 });
                await page.waitForTimeout(2000);
                flow.push(`  ✓ Dismissed paywall with "${option}"`);
                dismissed = true;
                
                // Check what screen we're on now
                const afterDismiss = await page.textContent('body');
                await page.screenshot({ path: 'test-results/manual-AFTER-PAYWALL.png', fullPage: true });
                
                if (afterDismiss.includes("Today's Insight") || afterDismiss.toLowerCase().includes('calling awaits')) {
                  console.log('  → Landed on home screen');
                  flow.push('  → Free path leads to home/CallingAwaits');
                  reachedEnd = true;
                } else if (afterDismiss.toLowerCase().includes('sign up') || afterDismiss.toLowerCase().includes('create account')) {
                  console.log('  → Landed on account creation');
                  flow.push('  → Free path requires account creation');
                } else {
                  console.log('  → Continuing onboarding');
                  flow.push('  → Back to onboarding flow');
                }
                break;
              }
            } catch (e) {}
          }
        }
        
        if (!dismissed) {
          console.log('  ❌ Could not dismiss paywall - BLOCKED');
          flow.push('  ✗ Paywall cannot be dismissed - BLOCKER');
          break;
        }
        
        if (reachedEnd) break;
        continue;
      }
      
      // Check for account creation
      if (bodyText.toLowerCase().includes('sign up') || 
          (bodyText.toLowerCase().includes('email') && bodyText.toLowerCase().includes('password'))) {
        console.log('\n👤 ACCOUNT CREATION SCREEN');
        flow.push(`⚠ Account creation required at question ${questionNum}`);
        await page.screenshot({ path: 'test-results/manual-ACCOUNT.png', fullPage: true });
        console.log('  ❌ Cannot proceed without credentials - BLOCKED');
        flow.push('  ✗ Requires login credentials - BLOCKER');
        break;
      }
      
      questionNum++;
      console.log(`  Question ${questionNum}:`);
      
      // Strategy: Find and click ANY clickable answer option
      // Look for all buttons and divs on the page
      const allElements = await page.$$('button, div[role="button"], div[class*="option"], div[class*="button"], div[class*="choice"]');
      
      let answerClicked = false;
      let answerText = '';
      
      for (const elem of allElements) {
        try {
          const text = await elem.textContent();
          const box = await elem.boundingBox();
          
          // Skip navigation buttons
          if (!text || text.toLowerCase().includes('next') || 
              text.toLowerCase().includes('back') || 
              text.toLowerCase().includes('skip') ||
              text.toLowerCase().includes('continue') ||
              text.toLowerCase().includes('i vow')) {
            continue;
          }
          
          // Look for reasonable answer options (not too short, not too long)
          if (box && text.length > 5 && text.length < 150) {
            // Try to click it
            try {
              await elem.click({ timeout: 2000 });
              answerText = text.substring(0, 50);
              console.log(`    ✓ Selected: "${answerText}${text.length > 50 ? '...' : ''}"`);
              await page.waitForTimeout(600);
              answerClicked = true;
              break;
            } catch (clickErr) {
              // This element wasn't clickable, try next one
            }
          }
        } catch (e) {
          // Element disappeared or not accessible
        }
      }
      
      if (!answerClicked) {
        console.log(`    ⚠ No answer option clicked`);
      }
      
      // Now try to advance with Next/Continue/"I Vow" buttons
      const advanceButtons = ['I Vow', 'Continue', 'Next', 'Get Started', 'Submit'];
      let advanced = false;
      let buttonClicked = '';
      
      for (const btnText of advanceButtons) {
        const btn = page.locator(`button:has-text("${btnText}"), div:has-text("${btnText}")`).first();
        if (await btn.count() > 0) {
          try {
            const visible = await btn.isVisible();
            if (visible) {
              await btn.click({ timeout: 3000 });
              await page.waitForTimeout(1500);
              buttonClicked = btnText;
              console.log(`    ✓ Clicked: "${btnText}"`);
              advanced = true;
              flow.push(`  Q${questionNum}: "${answerText}" → "${btnText}"`);
              break;
            }
          } catch (e) {
            // Button not clickable
          }
        }
      }
      
      if (!advanced) {
        console.log(`    ❌ No navigation button found or clickable - STUCK`);
        await page.screenshot({ path: 'test-results/manual-STUCK.png', fullPage: true });
        flow.push(`  ✗ Stuck at question ${questionNum} - no navigation button`);
        break;
      }
      
      // Take periodic screenshots
      if (questionNum % 5 === 0) {
        await page.screenshot({ path: `test-results/manual-q${questionNum}.png`, fullPage: true });
      }
    }
    
    if (questionNum >= maxQuestions) {
      console.log(`\n⚠ Hit question limit (${maxQuestions}) without completing`);
      flow.push(`⚠ Reached max question limit`);
    }
    
    // If we reached home, try to test Today's Insight
    if (reachedEnd) {
      console.log('\n📊 STEP 5: Test Today\'s Insight');
      
      await page.waitForTimeout(2000);
      const insightBtn = page.locator('text="Today\'s Insight"').first();
      
      if (await insightBtn.count() > 0) {
        try {
          if (await insightBtn.isVisible()) {
            console.log('  ✓ Found "Today\'s Insight", clicking...');
            await insightBtn.click({ timeout: 5000 });
            await page.waitForTimeout(3000);
            await page.screenshot({ path: 'test-results/manual-INSIGHT.png', fullPage: true });
            flow.push('✓ Opened Today\'s Insight');
            
            const insightText = await page.textContent('body');
            
            if (insightText.toLowerCase().includes('queue') || insightText.toLowerCase().includes('loading')) {
              console.log('  ✓ Queue/Loading screen visible');
              flow.push('  ✓ Loading/Queue screen shown');
              
              const skipQueue = page.locator('text=/skip.*queue/i').first();
              if (await skipQueue.count() > 0) {
                const skipVisible = await skipQueue.isVisible();
                if (skipVisible) {
                  console.log('  ✓ "Skip Queue" button FOUND and VISIBLE');
                  flow.push('  ✓ Skip Queue button present');
                  await page.screenshot({ path: 'test-results/manual-SKIP-QUEUE.png', fullPage: true });
                } else {
                  console.log('  ⚠ "Skip Queue" button exists but not visible');
                  flow.push('  ⚠ Skip Queue button hidden');
                }
              } else {
                console.log('  ✗ "Skip Queue" button NOT found');
                flow.push('  ✗ Skip Queue button not present');
              }
            } else {
              console.log('  ⚠ No queue screen shown');
              flow.push('  ⚠ No loading/queue screen');
            }
          }
        } catch (e) {
          console.log(`  ✗ Could not click Today's Insight: ${e.message.substring(0, 80)}`);
          flow.push('  ✗ Today\'s Insight not clickable');
        }
      } else {
        console.log('  ✗ "Today\'s Insight" not found on home screen');
        flow.push('  ✗ Today\'s Insight not found');
      }
    }
    
  } catch (error) {
    console.log(`\n❌ UNEXPECTED ERROR: ${error.message}`);
    flow.push(`✗ Error: ${error.message}`);
    await page.screenshot({ path: 'test-results/manual-ERROR.png', fullPage: true });
  }
  
  // Final report
  console.log('\n' + '═'.repeat(80));
  console.log('FINAL SEQUENCE REPORT');
  console.log('═'.repeat(80) + '\n');
  
  flow.forEach(step => console.log(step));
  
  console.log('\n' + '─'.repeat(80));
  console.log('ERRORS DETECTED:');
  console.log('─'.repeat(80));
  console.log(`Console errors: ${errors.console.length}`);
  if (errors.console.length > 0) {
    errors.console.slice(0, 5).forEach(err => console.log(`  - ${err.substring(0, 150)}`));
  }
  console.log(`Page errors: ${errors.page.length}`);
  if (errors.page.length > 0) {
    errors.page.forEach(err => console.log(`  - ${err.substring(0, 150)}`));
  }
  
  console.log('\n' + '═'.repeat(80));
  console.log('Screenshots saved to: test-results/manual-*.png');
  console.log('═'.repeat(80) + '\n');
  
  console.log('Keeping browser open for 10 seconds for inspection...');
  await page.waitForTimeout(10000);
  
  await browser.close();
}

manualOnboardingTest().catch(console.error);
