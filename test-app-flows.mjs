import { chromium } from 'playwright';

async function testAppFlows() {
  console.log('🚀 Starting browser automation tests for Expo web app...\n');
  
  const browser = await chromium.launch({ 
    headless: false, // Set to false to see the browser
    slowMo: 500 // Slow down actions for visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 }, // iPhone X viewport
  });
  
  const page = await context.newPage();
  
  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  // Collect page errors
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push(error.toString());
  });

  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('FLOW 1: ONBOARDING');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Load the app
    console.log('Step 1: Loading app at http://localhost:8084...');
    await page.goto('http://localhost:8084', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'test-results/01-initial-load.png' });
    console.log('✓ App loaded. Screenshot: 01-initial-load.png');
    
    // Check for visible text content
    const bodyText = await page.textContent('body');
    console.log(`\nVisible page content preview: "${bodyText.substring(0, 200)}..."`);
    
    // Look for onboarding elements
    console.log('\nStep 2: Looking for onboarding flow...');
    
    // Try to find "Start my journey" button
    const startButton = page.getByText('Start my journey', { exact: false });
    const startButtonCount = await startButton.count();
    
    let onboardingStarted = false;
    
    if (startButtonCount > 0) {
      console.log('  Found "Start my journey" button');
      await startButton.first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/02-after-start-journey.png' });
      console.log('✓ Clicked "Start my journey". Screenshot: 02-after-start-journey.png');
      onboardingStarted = true;
    } else {
      // Common onboarding button texts as fallback
      const possibleButtons = [
        'Get Started',
        'Continue',
        'Next',
        'Start',
        'Begin',
        'Let\'s Go',
        'Skip',
        'Accept',
        'Agree'
      ];
      
      for (const buttonText of possibleButtons) {
        const button = page.getByRole('button', { name: buttonText, exact: false });
        const count = await button.count();
        if (count > 0) {
          console.log(`  Found button: "${buttonText}"`);
          await button.first().click();
          await page.waitForTimeout(1500);
          await page.screenshot({ path: 'test-results/02-after-first-button.png' });
          console.log('✓ Clicked first button. Screenshot: 02-after-first-button.png');
          onboardingStarted = true;
          break;
        }
      }
    }
    
    if (!onboardingStarted) {
      console.log('⚠ No obvious onboarding button found. Checking for specific screens...');
      
      // Check if we're already on a specific screen
      const pageContent = await page.textContent('body');
      
      if (pageContent.includes('paywall') || pageContent.includes('Subscribe') || pageContent.includes('Premium')) {
        console.log('✓ Paywall detected on initial screen');
        await page.screenshot({ path: 'test-results/02-paywall-initial.png' });
        
        // Look for dismiss/close/continue free buttons
        const dismissButtons = ['Close', 'X', 'Maybe Later', 'Continue Free', 'Skip', 'Not Now'];
        for (const btnText of dismissButtons) {
          const btn = page.getByRole('button', { name: btnText, exact: false });
          if (await btn.count() > 0) {
            console.log(`  Attempting to dismiss paywall with: "${btnText}"`);
            await btn.first().click();
            await page.waitForTimeout(1500);
            break;
          }
        }
      }
    }
    
    // Continue through onboarding steps
    console.log('\nStep 3: Advancing through onboarding steps...');
    for (let i = 0; i < 15; i++) {
      await page.waitForTimeout(1000);
      const currentContent = await page.textContent('body');
      
      console.log(`\n  === Step ${i + 1} ===`);
      console.log(`  Current screen text preview: "${currentContent.substring(0, 150).replace(/\n/g, ' ')}..."`);
      
      // Check for paywall
      if (currentContent.toLowerCase().includes('premium') || 
          currentContent.toLowerCase().includes('subscribe') ||
          currentContent.toLowerCase().includes('unlock') ||
          currentContent.toLowerCase().includes('upgrade')) {
        console.log(`  ⚠ PAYWALL DETECTED`);
        await page.screenshot({ path: `test-results/03-paywall-step-${i}.png` });
        console.log(`  Screenshot: 03-paywall-step-${i}.png`);
        
        // Try to dismiss
        const dismissOptions = ['Continue Free', 'Maybe Later', 'Skip', 'Close', 'X', 'Not Now', '×'];
        let dismissed = false;
        for (const option of dismissOptions) {
          const btn = page.getByText(option, { exact: false });
          if (await btn.count() > 0) {
            console.log(`  Dismissing paywall with: "${option}"`);
            await btn.first().click();
            await page.waitForTimeout(2000);
            dismissed = true;
            break;
          }
        }
        
        if (!dismissed) {
          console.log('  ⚠ Could not find dismiss button for paywall');
          console.log('  BLOCKER: Paywall cannot be dismissed');
          break;
        }
        continue;
      }
      
      // Check for account creation
      if (currentContent.toLowerCase().includes('sign up') || 
          currentContent.toLowerCase().includes('create account') ||
          (currentContent.toLowerCase().includes('email') && currentContent.toLowerCase().includes('password'))) {
        console.log(`  ⚠ ACCOUNT CREATION SCREEN detected`);
        await page.screenshot({ path: `test-results/04-account-creation.png` });
        console.log('  Screenshot: 04-account-creation.png');
        console.log('  BLOCKER: Account creation required. Cannot proceed without credentials.');
        break;
      }
      
      // Check if we reached CallingAwaits or home screen
      if (currentContent.includes('CallingAwaits') || 
          currentContent.includes('Calling Awaits') ||
          currentContent.includes('Your calling awaits') ||
          currentContent.includes("Today's Insight") ||
          currentContent.includes('Home')) {
        console.log(`  ✓ SUCCESS: Reached home/CallingAwaits screen!`);
        await page.screenshot({ path: 'test-results/05-home-screen.png' });
        console.log('  Screenshot: 05-home-screen.png');
        break;
      }
      
      // Check if we're on a question screen (need to select an answer first)
      if (currentContent.includes('Next question') || currentContent.includes('question')) {
        console.log(`  Detected question screen, attempting to select first available option...`);
        
        // Try to find and click selectable options
        // Look for clickable divs with options
        const options = await page.locator('div[role="button"], button, [class*="option"]').all();
        
        if (options.length > 0) {
          // Click the first selectable option that's not "Next" or "Continue"
          for (const option of options) {
            const text = await option.textContent();
            if (text && !text.includes('Next') && !text.includes('Continue') && !text.includes('Back') && text.length > 0 && text.length < 100) {
              try {
                console.log(`  Selecting option: "${text.substring(0, 50)}"`);
                await option.click({ timeout: 3000 });
                await page.waitForTimeout(1000);
                break;
              } catch (e) {
                // Option not clickable, try next one
              }
            }
          }
        }
      }
      
      // Look for Next/Continue buttons or arrow buttons
      let clicked = false;
      
      // Try text-based buttons first
      const buttonTexts = ['Next', 'Continue', 'Start', 'Get Started', 'Begin'];
      for (const btnText of buttonTexts) {
        const btn = page.getByText(btnText, { exact: false });
        if (await btn.count() > 0) {
          try {
            console.log(`  Clicking: "${btnText}"`);
            await btn.first().click({ timeout: 5000 });
            await page.waitForTimeout(2000);
            await page.screenshot({ path: `test-results/step-${i + 3}.png` });
            clicked = true;
            break;
          } catch (e) {
            console.log(`  Failed to click "${btnText}": ${e.message.substring(0, 100)}`);
            // Try next button type
          }
        }
      }
      
      // If no text button, try arrow/icon buttons
      if (!clicked) {
        const arrowButton = page.locator('button:has-text("→"), button:has-text("›"), [role="button"]:has-text("→")');
        if (await arrowButton.count() > 0) {
          try {
            console.log(`  Clicking arrow button`);
            await arrowButton.first().click({ timeout: 5000 });
            await page.waitForTimeout(2000);
            await page.screenshot({ path: `test-results/step-${i + 3}.png` });
            clicked = true;
          } catch (e) {
            console.log(`  Failed to click arrow button: ${e.message.substring(0, 100)}`);
          }
        }
      }
      
      if (!clicked) {
        console.log(`  No more navigation buttons found or clickable`);
        await page.screenshot({ path: `test-results/final-onboarding-screen.png` });
        break;
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('FLOW 2: TODAY\'S INSIGHT');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('Step 1: Looking for home screen...');
    const currentContent = await page.textContent('body');
    
    // Try to find and click Today's Insight
    const insightButtons = [
      "Today's Insight",
      'Todays Insight',
      'Daily Insight',
      'Insight'
    ];
    
    let insightFound = false;
    for (const btnText of insightButtons) {
      const btn = page.getByText(btnText, { exact: false });
      if (await btn.count() > 0) {
        console.log(`✓ Found: "${btnText}"`);
        await btn.first().click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-results/06-todays-insight-opened.png' });
        console.log('  Screenshot: 06-todays-insight-opened.png');
        insightFound = true;
        break;
      }
    }
    
    if (!insightFound) {
      console.log('⚠ Could not find Today\'s Insight button on current screen');
      console.log(`  Current screen text preview: "${currentContent.substring(0, 300)}..."`);
    } else {
      // Check for loading/queue
      await page.waitForTimeout(1000);
      const insightContent = await page.textContent('body');
      
      if (insightContent.toLowerCase().includes('loading') || 
          insightContent.toLowerCase().includes('queue')) {
        console.log('✓ Loading/Queue screen detected');
        await page.screenshot({ path: 'test-results/07-loading-queue.png' });
        
        // Check for Skip Queue button
        const skipButton = page.getByRole('button', { name: /skip.*queue/i });
        if (await skipButton.count() > 0) {
          console.log('✓ "Skip Queue" button FOUND');
          await page.screenshot({ path: 'test-results/08-skip-queue-button.png' });
        } else {
          console.log('⚠ "Skip Queue" button NOT found');
        }
      } else {
        console.log('  No loading/queue screen visible');
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('FLOW 3: ERRORS');
    console.log('═══════════════════════════════════════════════════════\n');
    
    if (consoleErrors.length > 0) {
      console.log(`⚠ CONSOLE ERRORS FOUND (${consoleErrors.length}):`);
      consoleErrors.forEach((error, idx) => {
        console.log(`  ${idx + 1}. ${error}`);
      });
    } else {
      console.log('✓ No console errors detected');
    }
    
    if (pageErrors.length > 0) {
      console.log(`\n⚠ PAGE ERRORS FOUND (${pageErrors.length}):`);
      pageErrors.forEach((error, idx) => {
        console.log(`  ${idx + 1}. ${error}`);
      });
    } else {
      console.log('✓ No page errors detected');
    }
    
    // Check for red error screens
    const redErrors = await page.$$('[style*="background-color: rgb(255, 0, 0)"], [style*="background: red"], .error-screen, [class*="error"]');
    if (redErrors.length > 0) {
      console.log(`\n⚠ Found ${redErrors.length} potential red error screen element(s)`);
      await page.screenshot({ path: 'test-results/09-red-error-screen.png' });
    } else {
      console.log('✓ No visible red error screens detected');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR DURING TEST:');
    console.error(error.message);
    await page.screenshot({ path: 'test-results/error-screenshot.png' });
  } finally {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('All screenshots saved to: test-results/');
    console.log('\n✓ Test automation complete!');
    
    await browser.close();
  }
}

testAppFlows().catch(console.error);
