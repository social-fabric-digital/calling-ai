import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

async function thoroughOnboardingTest() {
  console.log('\n' + '═'.repeat(90));
  console.log('THOROUGH ONBOARDING FLOW TEST - COMPLETE NAVIGATION');
  console.log('═'.repeat(90) + '\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const page = await browser.newPage({
    viewport: { width: 375, height: 812 },
  });
  
  const flowLog = [];
  const errors = { console: [], page: [] };
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.console.push(msg.text());
    }
  });
  
  page.on('pageerror', error => {
    errors.page.push(error.toString());
  });
  
  function log(msg) {
    console.log(msg);
    flowLog.push(msg);
  }
  
  try {
    log('🌐 Loading http://localhost:8084...');
    await page.goto('http://localhost:8084', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'test-results/flow-01-load.png', fullPage: true });
    log('  ✓ Loaded\n');
    
    log('🚀 Clicking "Start my journey"...');
    await page.locator('text="Start my journey"').first().click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/flow-02-started.png', fullPage: true });
    log('  ✓ Started\n');
    
    log('⏭️  Skipping intro carousel...');
    const skip = page.locator('text="Skip"');
    if (await skip.count() > 0 && await skip.first().isVisible()) {
      await skip.first().click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-results/flow-03-skipped.png', fullPage: true });
      log('  ✓ Skipped\n');
    }
    
    // NOW THE REAL ONBOARDING BEGINS
    log('📝 ONBOARDING FLOW BEGINS\n');
    log('═'.repeat(90));
    
    let stepNum = 0;
    
    // Check if we see "MEET ATLAS"
    let text = await page.textContent('body');
    if (text.includes('MEET ATLAS')) {
      stepNum++;
      log(`\n${stepNum}. MEET ATLAS screen`);
      await page.screenshot({ path: `test-results/flow-step${stepNum}-atlas.png`, fullPage: true });
      
      // Look for Next button to advance
      const nextBtn = page.locator('text="Next"').first();
      if (await nextBtn.count() > 0) {
        try {
          await nextBtn.click({ timeout: 3000 });
          await page.waitForTimeout(2000);
          log('  ✓ Clicked Next');
        } catch (e) {
          log(`  ⚠ Could not click Next: ${e.message.substring(0, 60)}`);
        }
      }
    }
    
    // ABOUT YOU - Fill personal info
    text = await page.textContent('body');
    if (text.includes('ABOUT YOU') || text.includes('My name is')) {
      stepNum++;
      log(`\n${stepNum}. ABOUT YOU - Personal Info Form`);
      await page.screenshot({ path: `test-results/flow-step${stepNum}-about.png`, fullPage: true });
      
      // Fill name
      const nameInput = page.locator('input, [contenteditable="true"]').first();
      if (await nameInput.count() > 0) {
        try {
          await nameInput.fill('Test User');
          log('  ✓ Entered name: "Test User"');
        } catch (e) {}
      }
      
      // Skip birth info and try to advance
      await page.waitForTimeout(1000);
      const continueBtn = page.locator('text="Continue", text="Next"').first();
      if (await continueBtn.count() > 0) {
        try {
          await continueBtn.click({ timeout: 3000 });
          await page.waitForTimeout(2000);
          log('  ✓ Clicked Continue (may need more info)');
        } catch (e) {}
      }
    }
    
    // PLEDGE - "I vow" section
    text = await page.textContent('body');
    if (text.includes('PLEDGE') || text.includes('I, [name], hereby vow')) {
      stepNum++;
      log(`\n${stepNum}. PLEDGE - I Vow Statement`);
      await page.screenshot({ path: `test-results/flow-step${stepNum}-pledge.png`, fullPage: true });
      
      const vowBtn = page.locator('text="I Vow"').first();
      if (await vowBtn.count() > 0) {
        try {
          await vowBtn.click({ timeout: 3000 });
          await page.waitForTimeout(2000);
          log('  ✓ Clicked "I Vow"');
        } catch (e) {
          log(`  ⚠ "I Vow" button not clickable`);
        }
      }
    }
    
    // DISCOVERING YOUR IKIGAI - Four questions
    text = await page.textContent('body');
    if (text.includes('DISCOVERING YOUR') || text.includes('What do you love?')) {
      stepNum++;
      log(`\n${stepNum}. IKIGAI QUESTIONS - Four Core Questions`);
      await page.screenshot({ path: `test-results/flow-step${stepNum}-ikigai.png`, fullPage: true });
      
      // Try to enter text answers
      const textareas = await page.$$('textarea, input[type="text"]');
      for (let i = 0; i < Math.min(4, textareas.length); i++) {
        try {
          await textareas[i].fill(`Answer ${i + 1} for testing`);
          log(`  ✓ Filled answer ${i + 1}`);
        } catch (e) {}
      }
      
      await page.waitForTimeout(1000);
      const nextQ = page.locator('text="Next question", text="Continue"').first();
      if (await nextQ.count() > 0) {
        try {
          await nextQ.click({ timeout: 3000 });
          await page.waitForTimeout(2000);
          log('  ✓ Clicked "Next question"');
        } catch (e) {}
      }
    }
    
    // CURRENT LIFE CONTEXT - Multiple choice questions
    text = await page.textContent('body');
    if (text.includes('CURRENT LIFE CONTEXT') || text.includes('WHAT BEST DESCRIBES')) {
      stepNum++;
      log(`\n${stepNum}. CURRENT LIFE CONTEXT - Situation Questions`);
      await page.screenshot({ path: `test-results/flow-step${stepNum}-context.png`, fullPage: true });
      
      // Click first option for each question
      const options = await page.$$('div[role="button"], button');
      let clicked = 0;
      
      for (const option of options) {
        try {
          const txt = await option.textContent();
          if (txt && txt.includes('Student exploring') || txt.includes('Early in career')) {
            await option.click({ timeout: 2000 });
            log(`  ✓ Selected: "${txt.substring(0, 40)}"`);
            await page.waitForTimeout(800);
            clicked++;
            if (clicked >= 3) break;
          }
        } catch (e) {}
      }
      
      const nextBtn = page.locator('text="Next"').first();
      if (await nextBtn.count() > 0) {
        try {
          await nextBtn.click({ timeout: 3000 });
          await page.waitForTimeout(2000);
          log('  ✓ Clicked Next');
        } catch (e) {}
      }
    }
    
    // CREATING YOUR CALLING PROFILE - Loading screen
    text = await page.textContent('body');
    if (text.includes('CREATING YOUR CALLING PROFILE')) {
      stepNum++;
      log(`\n${stepNum}. CREATING PROFILE - Loading/Processing`);
      await page.screenshot({ path: `test-results/flow-step${stepNum}-creating.png`, fullPage: true });
      log('  ⏳ Waiting for profile creation...');
      await page.waitForTimeout(5000); // Wait for loading
    }
    
    // WHICH DIRECTION CALLS YOU - Choose direction
    text = await page.textContent('body');
    if (text.includes('WHICH DIRECTION CALLS YOU')) {
      stepNum++;
      log(`\n${stepNum}. WHICH DIRECTION CALLS YOU - Choose Path`);
      await page.screenshot({ path: `test-results/flow-step${stepNum}-direction.png`, fullPage: true });
      
      // Click on first "Explore" button
      const exploreBtn = page.locator('text="Explore"').first();
      if (await exploreBtn.count() > 0) {
        try {
          await exploreBtn.click({ timeout: 3000 });
          await page.waitForTimeout(2000);
          log('  ✓ Clicked "Explore" on first direction');
        } catch (e) {
          log(`  ⚠ Could not click Explore: ${e.message.substring(0, 60)}`);
        }
      }
    }
    
    // CREATE YOUR GOAL
    text = await page.textContent('body');
    if (text.includes('CREATE YOUR GOAL')) {
      stepNum++;
      log(`\n${stepNum}. CREATE YOUR GOAL - Goal Setting`);
      await page.screenshot({ path: `test-results/flow-step${stepNum}-goal.png`, fullPage: true });
      
      // Fill goal info
      const goalInputs = await page.$$('input, textarea');
      for (let i = 0; i < Math.min(2, goalInputs.length); i++) {
        try {
          await goalInputs[i].fill(`Test Goal ${i + 1}`);
          log(`  ✓ Filled goal field ${i + 1}`);
        } catch (e) {}
      }
      
      await page.waitForTimeout(1000);
      const lockInBtn = page.locator('text="Lock in goal", text="Continue"').first();
      if (await lockInBtn.count() > 0) {
        try {
          await lockInBtn.click({ timeout: 3000 });
          await page.waitForTimeout(3000);
          log('  ✓ Clicked "Lock in goal"');
        } catch (e) {}
      }
    }
    
    // Check final state
    log('\n' + '═'.repeat(90));
    log('CHECKING FINAL STATE...\n');
    
    await page.waitForTimeout(2000);
    text = await page.textContent('body');
    await page.screenshot({ path: 'test-results/flow-FINAL-STATE.png', fullPage: true });
    
    const finalState = {
      hasPaywall: text.toLowerCase().includes('premium') || text.toLowerCase().includes('subscribe'),
      hasAccount: text.toLowerCase().includes('sign up') || text.toLowerCase().includes('create account'),
      hasCallingAwaits: text.toLowerCase().includes('calling awaits'),
      hasTodaysInsight: text.includes("Today's Insight"),
      hasHome: text.includes('Home') && text.includes('Profile')
    };
    
    log('Final Screen Detection:');
    log(`  Paywall: ${finalState.hasPaywall ? 'YES ⚠' : 'NO ✓'}`);
    log(`  Account Creation: ${finalState.hasAccount ? 'YES ⚠' : 'NO ✓'}`);
    log(`  CallingAwaits: ${finalState.hasCallingAwaits ? 'YES ✓' : 'NO'}`);
    log(`  Today's Insight: ${finalState.hasTodaysInsight ? 'YES ✓' : 'NO'}`);
    log(`  Home Screen: ${finalState.hasHome ? 'YES ✓' : 'NO'}`);
    
    // Handle paywall if present
    if (finalState.hasPaywall) {
      log('\n💰 PAYWALL DETECTED - Testing dismiss path...');
      await page.screenshot({ path: 'test-results/flow-PAYWALL-DETECTED.png', fullPage: true });
      
      const dismissOptions = ['Continue Free', 'Maybe Later', 'Skip', 'Not Now', '×'];
      for (const opt of dismissOptions) {
        const btn = page.locator(`text="${opt}"`).first();
        if (await btn.count() > 0) {
          try {
            await btn.click({ timeout: 3000 });
            await page.waitForTimeout(3000);
            log(`  ✓ Dismissed with "${opt}"`);
            
            text = await page.textContent('body');
            await page.screenshot({ path: 'test-results/flow-AFTER-DISMISS.png', fullPage: true });
            
            if (text.includes("Today's Insight") || text.toLowerCase().includes('calling awaits')) {
              log('  → Free path leads to: Home/CallingAwaits ✓');
            } else if (text.toLowerCase().includes('sign up')) {
              log('  → Free path leads to: Account Creation ⚠');
            } else {
              log(`  → Free path leads to: ${text.substring(0, 80)}`);
            }
            break;
          } catch (e) {}
        }
      }
    }
    
    // Test Today's Insight if available
    if (finalState.hasTodaysInsight) {
      log('\n📊 Testing Today\'s Insight...');
      
      try {
        await page.locator('text="Today\'s Insight"').first().click({ timeout: 5000 });
        await page.waitForTimeout(4000);
        await page.screenshot({ path: 'test-results/flow-TODAYS-INSIGHT.png', fullPage: true });
        log('  ✓ Opened Today\'s Insight');
        
        text = await page.textContent('body');
        
        if (text.toLowerCase().includes('queue') || text.toLowerCase().includes('loading')) {
          log('  ✓ Queue/Loading screen shown');
          
          if (text.toLowerCase().includes('skip') && text.toLowerCase().includes('queue')) {
            log('  ✓ "Skip Queue" button FOUND ✓');
            await page.screenshot({ path: 'test-results/flow-SKIP-QUEUE-BTN.png', fullPage: true });
          } else {
            log('  ✗ "Skip Queue" button NOT found');
          }
        } else {
          log('  ⚠ No queue screen (insight may load directly)');
        }
      } catch (e) {
        log(`  ✗ Could not open Today's Insight: ${e.message.substring(0, 60)}`);
      }
    }
    
  } catch (error) {
    log(`\n❌ ERROR: ${error.message}`);
    log(error.stack);
  }
  
  log('\n' + '═'.repeat(90));
  log('ERROR SUMMARY:');
  log('═'.repeat(90));
  log(`Console errors: ${errors.console.length}`);
  errors.console.forEach(e => log(`  - ${e.substring(0, 120)}`));
  log(`Page errors: ${errors.page.length}`);
  errors.page.forEach(e => log(`  - ${e.substring(0, 120)}`));
  
  log('\n' + '═'.repeat(90));
  log('✓ TEST COMPLETE');
  log('═'.repeat(90));
  log('\nScreenshots: test-results/flow-*.png');
  
  // Save log
  writeFileSync('test-results/complete-flow-log.txt', flowLog.join('\n'));
  log('Log saved: test-results/complete-flow-log.txt\n');
  
  console.log('\nKeeping browser open for 20 seconds...');
  await page.waitForTimeout(20000);
  
  await browser.close();
}

thoroughOnboardingTest().catch(console.error);
