import { chromium } from 'playwright';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testAppFlows() {
  console.log('🚀 Starting comprehensive browser test for Expo web app...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 800
  });
  
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  
  const page = await context.newPage();
  
  const consoleErrors = [];
  const pageErrors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  page.on('pageerror', error => {
    pageErrors.push(error.toString());
  });

  let testReport = {
    flow1: {},
    flow2: {},
    flow3: {},
  };

  try {
    console.log('═'.repeat(60));
    console.log('FLOW 1: ONBOARDING FLOW');
    console.log('═'.repeat(60) + '\n');
    
    console.log('Step 1.1: Loading http://localhost:8084...');
    await page.goto('http://localhost:8084', { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);
    await page.screenshot({ path: 'test-results/01-initial-load.png', fullPage: true });
    console.log('✓ App loaded');
    
    let bodyText = await page.textContent('body');
    console.log(`\nInitial screen shows: "${bodyText.substring(0, 200).replace(/\n/g, ' ')}..."\n`);
    
    // Step 1.2: Start journey
    console.log('Step 1.2: Looking for "Start my journey" button...');
    const startJourneyBtn = page.locator('text="Start my journey"');
    if (await startJourneyBtn.count() > 0) {
      await startJourneyBtn.click();
      await sleep(2000);
      await page.screenshot({ path: 'test-results/02-after-start.png', fullPage: true });
      console.log('✓ Clicked "Start my journey"');
      testReport.flow1.startedOnboarding = true;
    } else {
      console.log('✗ "Start my journey" button not found');
      testReport.flow1.startedOnboarding = false;
      testReport.flow1.blocker = 'Start button not found';
    }
    
    // Step 1.3: Progress through onboarding
    console.log('\nStep 1.3: Progressing through onboarding screens...');
    
    let stepCount = 0;
    let paywallFound = false;
    let accountCreationFound = false;
    let reachedHome = false;
    
    for (let i = 0; i < 20; i++) {
      await sleep(1500);
      bodyText = await page.textContent('body');
      stepCount = i + 1;
      
      console.log(`\n  Onboarding Step ${stepCount}:`);
      console.log(`  Screen content: "${bodyText.substring(0, 120).replace(/\n/g, ' ')}..."`);
      
      // Check for paywall
      if (bodyText.toLowerCase().includes('upgrade') || 
          bodyText.toLowerCase().includes('premium') || 
          bodyText.toLowerCase().includes('subscribe') ||
          (bodyText.toLowerCase().includes('unlock') && bodyText.toLowerCase().includes('feature'))) {
        console.log('  ⚠ PAYWALL DETECTED');
        paywallFound = true;
        await page.screenshot({ path: `test-results/paywall-step-${stepCount}.png`, fullPage: true });
        testReport.flow1.paywallAppeared = true;
        testReport.flow1.paywallAtStep = stepCount;
        
        // Try to dismiss
        const dismissTexts = ['Continue Free', 'Maybe Later', 'Skip', 'Not Now', 'Close'];
        let dismissed = false;
        for (const txt of dismissTexts) {
          const btn = page.locator(`text="${txt}"`);
          if (await btn.count() > 0 && await btn.first().isVisible()) {
            console.log(`  Attempting to dismiss with: "${txt}"`);
            await btn.first().click();
            await sleep(2000);
            dismissed = true;
            testReport.flow1.paywallDismissed = true;
            break;
          }
        }
        
        if (!dismissed) {
          console.log('  ✗ Could not find dismiss button');
          testReport.flow1.paywallDismissed = false;
          testReport.flow1.blocker = 'Paywall cannot be dismissed';
          break;
        }
        continue;
      }
      
      // Check for account creation
      if ((bodyText.toLowerCase().includes('sign up') || bodyText.toLowerCase().includes('create account')) &&
          bodyText.toLowerCase().includes('email')) {
        console.log('  ⚠ ACCOUNT CREATION SCREEN');
        accountCreationFound = true;
        await page.screenshot({ path: `test-results/account-creation.png`, fullPage: true });
        testReport.flow1.accountCreationRequired = true;
        testReport.flow1.blocker = 'Account creation required - cannot proceed';
        break;
      }
      
      // Check if reached home/calling awaits
      if (bodyText.includes("Today's Insight") || 
          bodyText.toLowerCase().includes('calling awaits') ||
          bodyText.toLowerCase().includes('your calling awaits')) {
        console.log('  ✓ SUCCESS: Reached home screen!');
        reachedHome = true;
        await page.screenshot({ path: `test-results/home-screen.png`, fullPage: true });
        testReport.flow1.reachedHome = true;
        testReport.flow1.completedOnboarding = true;
        break;
      }
      
      // Try to select an answer if on a question screen
      if (bodyText.toLowerCase().includes('question') || bodyText.includes('?')) {
        console.log('  Detected question screen');
        
        // Try to find selectable options (look for buttons or clickable divs)
        const allButtons = await page.locator('button, div[role="button"]').all();
        
        for (const btn of allButtons) {
          const btnText = await btn.textContent();
          const isVisible = await btn.isVisible();
          
          // Select first visible option that's not a navigation button
          if (isVisible && btnText && 
              !btnText.toLowerCase().includes('next') && 
              !btnText.toLowerCase().includes('continue') &&
              !btnText.toLowerCase().includes('back') &&
              btnText.length > 3 && btnText.length < 80) {
            try {
              console.log(`  Selecting answer: "${btnText.substring(0, 40)}"`);
              await btn.click({ timeout: 3000 });
              await sleep(1000);
              break;
            } catch (e) {
              // Can't click this one, try next
            }
          }
        }
      }
      
      // Try to advance to next screen
      let advanced = false;
      const navTexts = ['Next', 'Continue', 'Get Started', 'Begin'];
      
      for (const txt of navTexts) {
        const navBtn = page.locator(`button:has-text("${txt}"), div:has-text("${txt}")`).first();
        try {
          if (await navBtn.count() > 0 && await navBtn.isVisible()) {
            console.log(`  Clicking: "${txt}"`);
            await navBtn.click({ timeout: 3000 });
            await sleep(2000);
            await page.screenshot({ path: `test-results/step-${stepCount + 2}.png`, fullPage: true });
            advanced = true;
            break;
          }
        } catch (e) {
          // Can't click, try next option
        }
      }
      
      if (!advanced) {
        console.log('  No more navigation buttons - stopping here');
        await page.screenshot({ path: `test-results/stuck-screen.png`, fullPage: true });
        testReport.flow1.stuckAtStep = stepCount;
        break;
      }
    }
    
    if (!reachedHome && !accountCreationFound) {
      testReport.flow1.completedOnboarding = false;
      testReport.flow1.note = `Progressed through ${stepCount} screens but didn't reach home`;
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('FLOW 2: TODAY\'S INSIGHT');
    console.log('═'.repeat(60) + '\n');
    
    if (!reachedHome) {
      console.log('⚠ Cannot test Today\'s Insight - not on home screen');
      testReport.flow2.tested = false;
      testReport.flow2.reason = 'Did not reach home screen';
    } else {
      console.log('Step 2.1: Looking for Today\'s Insight...');
      
      // Look for Today's Insight button or card
      const insightLocators = [
        page.locator('text="Today\'s Insight"'),
        page.locator('text="Todays Insight"'),
        page.locator('text="Daily Insight"'),
        page.locator('[data-testid*="insight"]'),
      ];
      
      let insightFound = false;
      for (const locator of insightLocators) {
        if (await locator.count() > 0) {
          const allMatches = await locator.all();
          for (const match of allMatches) {
            if (await match.isVisible()) {
              try {
                console.log('✓ Found Today\'s Insight, clicking...');
                await match.click({ timeout: 5000 });
                await sleep(2000);
                await page.screenshot({ path: 'test-results/insight-opened.png', fullPage: true });
                insightFound = true;
                testReport.flow2.insightFound = true;
                break;
              } catch (e) {
                console.log(`  Could not click: ${e.message.substring(0, 80)}`);
              }
            }
          }
          if (insightFound) break;
        }
      }
      
      if (!insightFound) {
        console.log('✗ Today\'s Insight not found or not clickable');
        testReport.flow2.insightFound = false;
      } else {
        // Check for loading/queue
        await sleep(1500);
        const insightContent = await page.textContent('body');
        
        console.log(`\nInsight screen content: "${insightContent.substring(0, 150).replace(/\n/g, ' ')}..."`);
        
        if (insightContent.toLowerCase().includes('loading') || 
            insightContent.toLowerCase().includes('queue')) {
          console.log('✓ Loading/Queue screen detected');
          testReport.flow2.loadingQueueFound = true;
          await page.screenshot({ path: 'test-results/queue-screen.png', fullPage: true });
          
          // Look for Skip Queue button
          const skipBtn = page.locator('text=/skip.*queue/i, button:has-text("Skip")');
          if (await skipBtn.count() > 0 && await skipBtn.first().isVisible()) {
            console.log('✓ "Skip Queue" button FOUND');
            testReport.flow2.skipQueueButtonFound = true;
            await page.screenshot({ path: 'test-results/skip-queue-button.png', fullPage: true });
          } else {
            console.log('✗ "Skip Queue" button NOT visible');
            testReport.flow2.skipQueueButtonFound = false;
          }
        } else {
          console.log('No loading/queue screen visible');
          testReport.flow2.loadingQueueFound = false;
        }
      }
    }
    
  } catch (error) {
    console.error('\n❌ UNEXPECTED ERROR:');
    console.error(error.message);
    await page.screenshot({ path: 'test-results/error-screenshot.png', fullPage: true });
    testReport.unexpectedError = error.message;
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('FLOW 3: ERRORS');
  console.log('═'.repeat(60) + '\n');
  
  if (consoleErrors.length > 0) {
    console.log(`⚠ CONSOLE ERRORS (${consoleErrors.length}):`);
    consoleErrors.slice(0, 10).forEach((err, i) => {
      console.log(`  ${i + 1}. ${err.substring(0, 100)}`);
    });
    testReport.flow3.consoleErrors = consoleErrors;
  } else {
    console.log('✓ No console errors');
    testReport.flow3.consoleErrors = [];
  }
  
  if (pageErrors.length > 0) {
    console.log(`\n⚠ PAGE ERRORS (${pageErrors.length}):`);
    pageErrors.slice(0, 10).forEach((err, i) => {
      console.log(`  ${i + 1}. ${err.substring(0, 100)}`);
    });
    testReport.flow3.pageErrors = pageErrors;
  } else {
    console.log('✓ No page errors');
    testReport.flow3.pageErrors = [];
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('TEST REPORT SUMMARY');
  console.log('═'.repeat(60) + '\n');
  
  console.log('FLOW 1 - ONBOARDING:');
  console.log(`  Started onboarding: ${testReport.flow1.startedOnboarding ? '✓' : '✗'}`);
  console.log(`  Paywall appeared: ${testReport.flow1.paywallAppeared ? `Yes (step ${testReport.flow1.paywallAtStep})` : 'No'}`);
  if (testReport.flow1.paywallAppeared) {
    console.log(`  Paywall dismissed: ${testReport.flow1.paywallDismissed ? '✓' : '✗'}`);
  }
  console.log(`  Reached home screen: ${testReport.flow1.reachedHome ? '✓' : '✗'}`);
  console.log(`  Completed onboarding: ${testReport.flow1.completedOnboarding ? '✓' : '✗'}`);
  if (testReport.flow1.blocker) {
    console.log(`  BLOCKER: ${testReport.flow1.blocker}`);
  }
  if (testReport.flow1.note) {
    console.log(`  NOTE: ${testReport.flow1.note}`);
  }
  
  console.log('\nFLOW 2 - TODAY\'S INSIGHT:');
  console.log(`  Test executed: ${testReport.flow2.tested !== false ? '✓' : '✗'}`);
  if (testReport.flow2.tested !== false) {
    console.log(`  Insight found: ${testReport.flow2.insightFound ? '✓' : '✗'}`);
    console.log(`  Loading/Queue shown: ${testReport.flow2.loadingQueueFound ? '✓' : '✗'}`);
    console.log(`  Skip Queue button: ${testReport.flow2.skipQueueButtonFound ? '✓' : '✗'}`);
  } else {
    console.log(`  Reason not tested: ${testReport.flow2.reason}`);
  }
  
  console.log('\nFLOW 3 - ERRORS:');
  console.log(`  Console errors: ${testReport.flow3.consoleErrors.length}`);
  console.log(`  Page errors: ${testReport.flow3.pageErrors.length}`);
  
  console.log('\n' + '═'.repeat(60));
  console.log('✓ All screenshots saved to: test-results/');
  console.log('═'.repeat(60));
  
  await browser.close();
}

testAppFlows().catch(console.error);
