import { chromium } from 'playwright';

async function testTodaysInsightDirectly() {
  console.log('\n' + '═'.repeat(90));
  console.log('TODAY\'S INSIGHT - DIRECT TEST');
  console.log('═'.repeat(90) + '\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 700
  });
  
  const page = await browser.newPage({
    viewport: { width: 375, height: 812 },
  });
  
  const errors = { console: [], page: [] };
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.console.push(msg.text());
      console.log(`  [ERROR] ${msg.text().substring(0, 100)}`);
    }
  });
  
  page.on('pageerror', error => {
    errors.page.push(error.toString());
    console.log(`  [PAGE ERROR] ${error.toString().substring(0, 100)}`);
  });
  
  try {
    console.log('Step 1: Navigate to home via (tabs) route');
    await page.goto('http://localhost:8084/(tabs)', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
    
    let text = await page.textContent('body');
    console.log(`✓ Loaded home screen`);
    console.log(`Content: "${text.substring(0, 200)}..."\n`);
    
    await page.screenshot({ path: 'test-results/direct-01-home.png', fullPage: true });
    
    console.log('Step 2: Locate Today\'s Insight elements');
    
    // Try multiple strategies to find and click Today's Insight
    const strategies = [
      { name: 'Text "Today\'s Insight"', locator: 'text="Today\'s Insight"' },
      { name: 'Text contains "Today"', locator: 'text="Today"' },
      { name: 'Text contains "Insight"', locator: 'text="Insight"' },
      { name: 'Any clickable with "Today\'s Insight"', locator: 'button, div[role="button"], a, [class*="card"], [class*="Card"]' },
    ];
    
    let clicked = false;
    
    for (const strategy of strategies) {
      console.log(`\nTrying: ${strategy.name}`);
      
      if (strategy.name.includes('Any clickable')) {
        // For this strategy, find all clickables and check their text
        const elements = await page.$$(strategy.locator);
        console.log(`  Found ${elements.length} clickable elements`);
        
        for (let i = 0; i < elements.length; i++) {
          try {
            const elemText = await elements[i].textContent();
            if (elemText && elemText.includes("Today's Insight")) {
              console.log(`  Element ${i}: Contains "Today's Insight"`);
              console.log(`    Text: "${elemText.substring(0, 60)}"`);
              
              await elements[i].click({ timeout: 3000 });
              console.log(`  ✓ Clicked successfully!`);
              clicked = true;
              break;
            }
          } catch (e) {
            // Element not clickable or disappeared
          }
        }
        
        if (clicked) break;
        
      } else {
        const locator = page.locator(strategy.locator);
        const count = await locator.count();
        console.log(`  Found ${count} matches`);
        
        if (count > 0) {
          for (let i = 0; i < Math.min(count, 3); i++) {
            try {
              const elem = locator.nth(i);
              const isVisible = await elem.isVisible();
              const elemText = await elem.textContent();
              console.log(`  Match ${i + 1}: Visible=${isVisible}, Text="${elemText?.substring(0, 40)}"`);
              
              if (isVisible) {
                await elem.click({ timeout: 3000 });
                console.log(`  ✓ Clicked match ${i + 1}!`);
                clicked = true;
                break;
              }
            } catch (e) {
              console.log(`  ✗ Match ${i + 1} failed: ${e.message.substring(0, 60)}`);
            }
          }
          
          if (clicked) break;
        }
      }
    }
    
    if (!clicked) {
      console.log('\n✗ Could not click Today\'s Insight with any strategy');
      console.log('Attempting to find it by coordinate click...\n');
      
      // Last resort: find text position and click
      const allText = await page.$$('text="Today\'s Insight", text="Today", text="Insight"');
      console.log(`Found ${allText.length} text elements`);
      
      for (const elem of allText) {
        try {
          const box = await elem.boundingBox();
          if (box) {
            console.log(`  Clicking at position: (${box.x + box.width/2}, ${box.y + box.height/2})`);
            await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
            clicked = true;
            console.log('  ✓ Coordinate click successful');
            break;
          }
        } catch (e) {}
      }
    }
    
    if (clicked) {
      console.log('\n═════════════════════════════════════════════════════════════════\n');
      console.log('Step 3: Analyze Today\'s Insight screen');
      await page.waitForTimeout(4000);
      
      text = await page.textContent('body');
      await page.screenshot({ path: 'test-results/direct-02-insight-opened.png', fullPage: true });
      
      console.log(`\nScreen content preview:`);
      console.log(text.substring(0, 400));
      console.log('...\n');
      
      // Check for queue/loading indicators
      const indicators = {
        hasQueue: text.toLowerCase().includes('queue'),
        hasLoading: text.toLowerCase().includes('loading'),
        hasGenerating: text.toLowerCase().includes('generating'),
        hasSkipQueue: text.toLowerCase().includes('skip') && text.toLowerCase().includes('queue'),
        hasWait: text.toLowerCase().includes('wait'),
        hasProgress: text.toLowerCase().includes('progress'),
      };
      
      console.log('Queue/Loading Indicators:');
      Object.entries(indicators).forEach(([key, val]) => {
        console.log(`  ${val ? '✓' : '✗'} ${key}: ${val ? 'YES' : 'NO'}`);
      });
      
      // Look for Skip Queue button specifically
      console.log('\nSearching for Skip Queue button...');
      const skipQueueSelectors = [
        'text="Skip Queue"',
        'text=/skip.*queue/i',
        'button:has-text("Skip")',
        '[class*="skip"]',
      ];
      
      let skipQueueFound = false;
      for (const selector of skipQueueSelectors) {
        const elem = page.locator(selector);
        const count = await elem.count();
        if (count > 0) {
          console.log(`  Found with selector: ${selector} (${count} matches)`);
          
          for (let i = 0; i < count; i++) {
            try {
              const isVisible = await elem.nth(i).isVisible();
              const btnText = await elem.nth(i).textContent();
              console.log(`    Match ${i + 1}: Visible=${isVisible}, Text="${btnText}"`);
              
              if (isVisible) {
                skipQueueFound = true;
                console.log(`  ✓ Skip Queue button VISIBLE`);
                await page.screenshot({ path: 'test-results/direct-03-skip-queue-visible.png', fullPage: true });
                break;
              }
            } catch (e) {}
          }
          
          if (skipQueueFound) break;
        }
      }
      
      if (!skipQueueFound) {
        console.log(`  ✗ Skip Queue button NOT FOUND or NOT VISIBLE`);
      }
      
      // Check for any visible errors on screen
      console.log('\nChecking for visible errors...');
      if (text.toLowerCase().includes('error') || text.toLowerCase().includes('failed')) {
        console.log('  ⚠ Error text found on screen');
        const errorLines = text.split('\n').filter(line => 
          line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')
        );
        errorLines.forEach(line => console.log(`    "${line.substring(0, 100)}"`));
      } else {
        console.log('  ✓ No visible error messages');
      }
    }
    
  } catch (error) {
    console.log(`\n❌ UNEXPECTED ERROR: ${error.message}`);
    console.log(error.stack);
    await page.screenshot({ path: 'test-results/direct-error.png', fullPage: true });
  }
  
  console.log('\n' + '═'.repeat(90));
  console.log('ERROR SUMMARY');
  console.log('═'.repeat(90));
  
  const uniqueConsoleErrors = [...new Set(errors.console)];
  console.log(`\nConsole errors: ${errors.console.length} total, ${uniqueConsoleErrors.length} unique`);
  
  if (uniqueConsoleErrors.length > 0) {
    console.log('Unique errors:');
    uniqueConsoleErrors.forEach(err => {
      console.log(`  - ${err.substring(0, 150)}`);
    });
  }
  
  console.log(`\nPage errors: ${errors.page.length}`);
  errors.page.forEach(err => {
    console.log(`  - ${err.substring(0, 150)}`);
  });
  
  console.log('\n' + '═'.repeat(90));
  console.log('✓ TEST COMPLETE');
  console.log('═'.repeat(90));
  console.log('\nScreenshots: test-results/direct-*.png\n');
  
  console.log('Keeping browser open for 20 seconds...');
  await page.waitForTimeout(20000);
  
  await browser.close();
}

testTodaysInsightDirectly().catch(console.error);
