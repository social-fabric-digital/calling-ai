import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

async function detailedOnboardingTest() {
  console.log('\n' + '═'.repeat(90));
  console.log('DETAILED ONBOARDING TEST - STEP BY STEP EXAMINATION');
  console.log('═'.repeat(90) + '\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 400
  });
  
  const page = await browser.newPage({
    viewport: { width: 375, height: 812 },
  });
  
  const report = {
    sequence: [],
    screens: [],
    errors: { console: [], page: [] },
    paywall: null,
    accountCreation: null,
    finalScreen: null
  };
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      report.errors.console.push(text);
    }
  });
  
  page.on('pageerror', error => {
    report.errors.page.push(error.toString());
  });
  
  async function captureScreenInfo(stepName) {
    const text = await page.textContent('body');
    const info = {
      step: stepName,
      text: text.substring(0, 300),
      fullText: text,
      timestamp: new Date().toISOString()
    };
    report.screens.push(info);
    return text;
  }
  
  try {
    console.log('STEP 1: Load app');
    await page.goto('http://localhost:8084', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/detail-01-load.png', fullPage: true });
    
    let text = await captureScreenInfo('Initial load');
    console.log(`  Current screen: "${text.substring(0, 80)}..."`);
    report.sequence.push('✓ App loaded');
    
    console.log('\nSTEP 2: Click "Start my journey"');
    await page.locator('text="Start my journey"').first().click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/detail-02-started.png', fullPage: true });
    
    text = await captureScreenInfo('After start');
    console.log(`  Current screen: "${text.substring(0, 80)}..."`);
    report.sequence.push('✓ Clicked Start my journey');
    
    console.log('\nSTEP 3: Handle intro screens');
    const skipBtn = page.locator('text="Skip"');
    if (await skipBtn.count() > 0 && await skipBtn.first().isVisible()) {
      console.log('  Found Skip button, clicking...');
      await skipBtn.first().click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-results/detail-03-skipped.png', fullPage: true });
      
      text = await captureScreenInfo('After skip');
      console.log(`  Current screen: "${text.substring(0, 80)}..."`);
      report.sequence.push('✓ Skipped intro');
    }
    
    console.log('\nSTEP 4: Analyze current screen in detail');
    text = await page.textContent('body');
    
    console.log('\n  Full screen text analysis:');
    console.log('  ' + '─'.repeat(85));
    console.log(text.substring(0, 500));
    console.log('  ' + '─'.repeat(85) + '\n');
    
    // Check what screen we're actually on
    const screenType = {
      hasQuestions: text.includes('?') || text.toLowerCase().includes('question'),
      hasPaywall: (text.toLowerCase().includes('premium') || text.toLowerCase().includes('upgrade')) && 
                  text.toLowerCase().includes('subscribe'),
      hasAccount: text.toLowerCase().includes('sign up') || text.toLowerCase().includes('create account'),
      hasCallingAwaits: text.toLowerCase().includes('calling awaits') || text.includes('CallingAwaits'),
      hasWhichDirection: text.toLowerCase().includes('which direction calls'),
      hasTodaysInsight: text.includes("Today's Insight"),
      hasHomeTabs: text.includes('Home') && text.includes('Profile'),
      hasIVow: text.includes('I Vow'),
      hasNext: text.includes('Next'),
      hasContinue: text.includes('Continue')
    };
    
    console.log('  Screen type detection:');
    Object.entries(screenType).forEach(([key, value]) => {
      console.log(`    ${value ? '✓' : '✗'} ${key}`);
    });
    
    // Determine screen type
    let currentScreenType = 'Unknown';
    if (screenType.hasHomeTabs || screenType.hasTodaysInsight) {
      currentScreenType = 'Home Screen';
    } else if (screenType.hasCallingAwaits || screenType.hasWhichDirection) {
      currentScreenType = 'CallingAwaits / Which Direction';
    } else if (screenType.hasPaywall) {
      currentScreenType = 'Paywall';
    } else if (screenType.hasAccount) {
      currentScreenType = 'Account Creation';
    } else if (screenType.hasQuestions) {
      currentScreenType = 'Onboarding Questions';
    }
    
    console.log(`\n  📍 Current screen type: ${currentScreenType}\n`);
    report.sequence.push(`📍 Current screen: ${currentScreenType}`);
    
    // If we're on questions, proceed through them
    if (currentScreenType === 'Onboarding Questions') {
      console.log('STEP 5: Navigate onboarding questions');
      
      let q = 0;
      for (let i = 0; i < 50; i++) {
        await page.waitForTimeout(1000);
        q++;
        console.log(`\n  Question ${q}:`);
        
        // Get all buttons
        const buttons = await page.$$('button, div[role="button"], [class*="Button"]');
        
        // Find answer buttons (not Next/Back/Skip)
        let answerClicked = false;
        for (const btn of buttons) {
          try {
            const btnText = await btn.textContent();
            const box = await btn.boundingBox();
            
            if (box && btnText && btnText.length > 10 && btnText.length < 100) {
              const lower = btnText.toLowerCase();
              if (!lower.includes('next') && !lower.includes('back') && 
                  !lower.includes('skip') && !lower.includes('continue') &&
                  !lower.includes('i vow')) {
                console.log(`    Clicking answer: "${btnText.substring(0, 40)}"`);
                await btn.click({ timeout: 2000 });
                await page.waitForTimeout(700);
                answerClicked = true;
                report.sequence.push(`    Q${q}: Selected "${btnText.substring(0, 40)}"`);
                break;
              }
            }
          } catch (e) {}
        }
        
        // Click advance button
        const advanceButtons = ['I Vow', 'Continue', 'Next'];
        let advanced = false;
        
        for (const btnName of advanceButtons) {
          const btn = page.locator(`text="${btnName}"`).first();
          if (await btn.count() > 0) {
            try {
              await btn.click({ timeout: 3000 });
              await page.waitForTimeout(1500);
              console.log(`    → Clicked "${btnName}"`);
              report.sequence.push(`    → "${btnName}"`);
              advanced = true;
              break;
            } catch (e) {}
          }
        }
        
        if (!advanced) {
          console.log(`    ✗ No advance button - stuck`);
          break;
        }
        
        // Check for end condition
        text = await page.textContent('body');
        if (text.includes("Today's Insight") || text.toLowerCase().includes('calling awaits')) {
          console.log(`\n  ✓ Reached end after ${q} questions`);
          await page.screenshot({ path: 'test-results/detail-COMPLETE.png', fullPage: true });
          break;
        }
        
        // Check for paywall
        if (text.toLowerCase().includes('premium') && text.toLowerCase().includes('subscribe')) {
          console.log(`\n  💰 Paywall at question ${q}`);
          report.paywall = { appearedAt: `Question ${q}` };
          await page.screenshot({ path: 'test-results/detail-PAYWALL.png', fullPage: true });
          // Try to dismiss
          break;
        }
        
        if (q % 5 === 0) {
          await page.screenshot({ path: `test-results/detail-q${q}.png`, fullPage: true });
        }
      }
    }
    
    // Final screen check
    console.log('\nSTEP 6: Final screen analysis');
    text = await page.textContent('body');
    await page.screenshot({ path: 'test-results/detail-FINAL.png', fullPage: true });
    
    if (text.includes("Today's Insight")) {
      console.log('  ✓ Found "Today\'s Insight" - attempting to open');
      report.finalScreen = 'Home with Today\'s Insight';
      
      try {
        await page.locator('text="Today\'s Insight"').first().click({ timeout: 5000 });
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-results/detail-INSIGHT.png', fullPage: true });
        
        text = await page.textContent('body');
        if (text.toLowerCase().includes('queue')) {
          console.log('    ✓ Queue screen shown');
          report.sequence.push('✓ Today\'s Insight → Queue screen');
          
          if (text.toLowerCase().includes('skip') && text.toLowerCase().includes('queue')) {
            console.log('    ✓ Skip Queue button present');
            report.sequence.push('  ✓ Skip Queue button found');
          } else {
            console.log('    ✗ Skip Queue button not found');
            report.sequence.push('  ✗ Skip Queue button missing');
          }
        }
      } catch (e) {
        console.log(`    ✗ Could not open: ${e.message}`);
      }
    } else if (text.toLowerCase().includes('calling awaits')) {
      report.finalScreen = 'CallingAwaits screen';
      console.log('  ✓ On CallingAwaits screen');
    } else {
      report.finalScreen = 'Other: ' + text.substring(0, 100);
      console.log(`  Current screen: "${text.substring(0, 100)}"`);
    }
    
  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
    report.sequence.push(`✗ Error: ${error.message}`);
  }
  
  // Write detailed report
  console.log('\n' + '═'.repeat(90));
  console.log('COMPLETE SEQUENCE:');
  console.log('═'.repeat(90));
  report.sequence.forEach(s => console.log(s));
  
  console.log('\n' + '═'.repeat(90));
  console.log('ERRORS:');
  console.log('═'.repeat(90));
  console.log(`Console errors: ${report.errors.console.length}`);
  report.errors.console.forEach(e => console.log(`  - ${e.substring(0, 120)}`));
  console.log(`Page errors: ${report.errors.page.length}`);
  report.errors.page.forEach(e => console.log(`  - ${e.substring(0, 120)}`));
  
  // Save full report
  writeFileSync('test-results/detailed-report.json', JSON.stringify(report, null, 2));
  console.log('\n✓ Full report saved to: test-results/detailed-report.json');
  console.log('✓ Screenshots saved to: test-results/detail-*.png\n');
  
  console.log('Keeping browser open for 15 seconds...');
  await page.waitForTimeout(15000);
  
  await browser.close();
}

detailedOnboardingTest().catch(console.error);
