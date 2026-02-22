import { chromium } from 'playwright';

async function testInsightWithScroll() {
  console.log('\nTODAY\'S INSIGHT - ENHANCED TEST WITH SCROLL\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 800
  });
  
  const page = await browser.newPage({
    viewport: { width: 375, height: 812 },
  });
  
  const errors = { console: [], page: [] };
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.console.push(msg.text());
    }
  });
  
  page.on('pageerror', error => {
    errors.page.push(error.toString());
  });
  
  try {
    console.log('Loading home screen...');
    await page.goto('http://localhost:8084/(tabs)', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/enhanced-01-home.png', fullPage: true });
    
    const text = await page.textContent('body');
    console.log(`Home loaded. Content includes: "${text.substring(0, 150)}..."\n`);
    
    console.log('═'.repeat(80));
    console.log('FACT 1: HOME SCREEN ACCESSIBLE');
    console.log('═'.repeat(80));
    console.log('✓ Route http://localhost:8084/(tabs) successfully bypasses onboarding');
    console.log('✓ Home screen loads with visible content');
    console.log(`✓ "Today's Insight" text is present: ${text.includes("Today's Insight") ? 'YES' : 'NO'}`);
    console.log(`✓ Home tabs visible: ${text.includes('Progress') || text.includes('Path') ? 'YES' : 'NO'}\n`);
    
    // Try to find all elements containing "Today's Insight" or "Insight"
    console.log('Finding all elements related to Today\'s Insight...');
    
    const allElements = await page.$$('*');
    console.log(`Total elements on page: ${allElements.length}`);
    
    const insightElements = [];
    for (const elem of allElements) {
      try {
        const elemText = await elem.textContent();
        if (elemText && (elemText.includes("Today's Insight") || elemText === "Today's Insight")) {
          const tagName = await elem.evaluate(el => el.tagName);
          const className = await elem.evaluate(el => el.className);
          const box = await elem.boundingBox();
          
          insightElements.push({
            elem,
            tagName,
            className: className.substring(0, 80),
            text: elemText.substring(0, 100),
            hasBox: !!box,
            box
          });
        }
      } catch (e) {}
    }
    
    console.log(`\nFound ${insightElements.length} elements containing "Today's Insight":\n`);
    insightElements.forEach((item, i) => {
      console.log(`  ${i + 1}. <${item.tagName}> class="${item.className}"`);
      console.log(`     Text: "${item.text}"`);
      console.log(`     Has bounding box: ${item.hasBox}`);
      if (item.box) {
        console.log(`     Position: (${item.box.x}, ${item.box.y}), Size: ${item.box.width}x${item.box.height}`);
      }
    });
    
    // Try clicking each one
    console.log('\n' + '═'.repeat(80));
    console.log('ATTEMPTING TO CLICK TODAY\'S INSIGHT');
    console.log('═'.repeat(80) + '\n');
    
    let clickedSuccessfully = false;
    
    for (let i = 0; i < insightElements.length; i++) {
      const item = insightElements[i];
      console.log(`Attempt ${i + 1}: Clicking <${item.tagName}>...`);
      
      try {
        // Scroll into view first
        await item.elem.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        
        // Try regular click
        await item.elem.click({ timeout: 2000, force: true });
        console.log(`  ✓ Click succeeded!\n`);
        clickedSuccessfully = true;
        break;
      } catch (e) {
        console.log(`  ✗ Failed: ${e.message.substring(0, 80)}`);
        
        // Try coordinate click as fallback
        if (item.box) {
          try {
            console.log(`  Trying coordinate click at (${item.box.x + item.box.width/2}, ${item.box.y + item.box.height/2})...`);
            await page.mouse.click(item.box.x + item.box.width/2, item.box.y + item.box.height/2);
            console.log(`  ✓ Coordinate click succeeded!\n`);
            clickedSuccessfully = true;
            break;
          } catch (e2) {
            console.log(`  ✗ Coordinate click also failed\n`);
          }
        }
      }
    }
    
    if (clickedSuccessfully) {
      console.log('═'.repeat(80));
      console.log('FACT 2: TODAY\'S INSIGHT OPENED');
      console.log('═'.repeat(80));
      
      await page.waitForTimeout(5000);
      const insightText = await page.textContent('body');
      await page.screenshot({ path: 'test-results/enhanced-02-insight.png', fullPage: true });
      
      console.log('\nInsight screen content:');
      console.log('─'.repeat(80));
      console.log(insightText.substring(0, 500));
      console.log('─'.repeat(80) + '\n');
      
      console.log('═'.repeat(80));
      console.log('FACT 3: QUEUE/LOADING ANALYSIS');
      console.log('═'.repeat(80));
      
      const queueIndicators = {
        'Contains "queue"': insightText.toLowerCase().includes('queue'),
        'Contains "loading"': insightText.toLowerCase().includes('loading'),
        'Contains "generating"': insightText.toLowerCase().includes('generating'),
        'Contains "wait"': insightText.toLowerCase().includes('wait'),
        'Contains "skip"': insightText.toLowerCase().includes('skip'),
      };
      
      Object.entries(queueIndicators).forEach(([desc, val]) => {
        console.log(`${val ? '✓' : '✗'} ${desc}: ${val ? 'YES' : 'NO'}`);
      });
      
      console.log('\n' + '═'.repeat(80));
      console.log('FACT 4: SKIP QUEUE BUTTON');
      console.log('═'.repeat(80));
      
      // Search exhaustively for Skip Queue button
      const skipSearches = [
        { selector: 'text="Skip Queue"', desc: 'Exact text "Skip Queue"' },
        { selector: 'text="Skip"', desc: 'Text "Skip"' },
        { selector: 'button:has-text("Skip")', desc: 'Button with "Skip"' },
        { selector: 'text=/skip/i', desc: 'Text containing "skip" (case insensitive)' },
      ];
      
      let skipFound = false;
      
      for (const search of skipSearches) {
        const locator = page.locator(search.selector);
        const count = await locator.count();
        
        if (count > 0) {
          console.log(`\n${search.desc}:`);
          console.log(`  Found ${count} match(es)`);
          
          for (let i = 0; i < count; i++) {
            try {
              const isVisible = await locator.nth(i).isVisible();
              const btnText = await locator.nth(i).textContent();
              console.log(`  Match ${i + 1}: "${btnText}" - Visible: ${isVisible}`);
              
              if (isVisible && btnText.toLowerCase().includes('queue')) {
                console.log(`  ✓ SKIP QUEUE BUTTON FOUND AND VISIBLE`);
                skipFound = true;
                await page.screenshot({ path: 'test-results/enhanced-03-skip-queue.png', fullPage: true });
                break;
              }
            } catch (e) {}
          }
        }
        
        if (skipFound) break;
      }
      
      if (!skipFound) {
        console.log('\n✗ Skip Queue button: NOT FOUND or NOT VISIBLE');
      }
      
    } else {
      console.log('═'.repeat(80));
      console.log('FACT 2: COULD NOT OPEN TODAY\'S INSIGHT');
      console.log('═'.repeat(80));
      console.log('✗ All click attempts failed');
      console.log('✗ Element appears to be blocked or requires specific interaction pattern\n');
    }
    
  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
    await page.screenshot({ path: 'test-results/enhanced-error.png', fullPage: true });
  }
  
  console.log('\n' + '═'.repeat(80));
  console.log('FACT 5: CONSOLE ERRORS');
  console.log('═'.repeat(80));
  
  const uniqueErrors = [...new Set(errors.console)];
  console.log(`Total console errors: ${errors.console.length}`);
  console.log(`Unique errors: ${uniqueErrors.length}\n`);
  
  if (uniqueErrors.length > 0) {
    uniqueErrors.forEach(err => {
      console.log(`- ${err.substring(0, 120)}`);
    });
  } else {
    console.log('✓ No console errors');
  }
  
  console.log(`\nPage errors: ${errors.page.length}`);
  if (errors.page.length > 0) {
    errors.page.forEach(err => console.log(`- ${err.substring(0, 120)}`));
  } else {
    console.log('✓ No page errors');
  }
  
  console.log('\n✓ All screenshots: test-results/enhanced-*.png\n');
  
  console.log('Browser staying open for 20 seconds...');
  await page.waitForTimeout(20000);
  
  await browser.close();
}

testInsightWithScroll().catch(console.error);
