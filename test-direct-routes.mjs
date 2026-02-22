import { chromium } from 'playwright';

async function testDirectRoutes() {
  console.log('\n' + '═'.repeat(90));
  console.log('DIRECT ROUTE TESTING - BYPASSING ONBOARDING');
  console.log('═'.repeat(90) + '\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const page = await browser.newPage({
    viewport: { width: 375, height: 812 },
  });
  
  const results = [];
  const errors = { console: [], page: [] };
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.console.push(msg.text());
    }
  });
  
  page.on('pageerror', error => {
    errors.page.push(error.toString());
  });
  
  const routesToTest = [
    'http://localhost:8084/(tabs)',
    'http://localhost:8084/(tabs)/index',
    'http://localhost:8084/(tabs)/home',
    'http://localhost:8084/index',
    'http://localhost:8084/home',
    'http://localhost:8084/tabs',
    'http://localhost:8084/(tabs)/insight',
    'http://localhost:8084/insight',
    'http://localhost:8084/(tabs)/today',
  ];
  
  for (const route of routesToTest) {
    console.log(`\n🔗 Testing route: ${route}`);
    results.push(`\n━━━ ${route} ━━━`);
    
    try {
      await page.goto(route, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(2000);
      
      const text = await page.textContent('body');
      const url = page.url();
      
      console.log(`  Current URL: ${url}`);
      console.log(`  Content preview: "${text.substring(0, 100)}..."`);
      
      results.push(`✓ Loaded successfully`);
      results.push(`  URL: ${url}`);
      results.push(`  Content: "${text.substring(0, 150)}..."`);
      
      // Check what we see
      const indicators = {
        todaysInsight: text.includes("Today's Insight") || text.includes("Todays Insight"),
        callingAwaits: text.toLowerCase().includes('calling awaits'),
        homeTabs: (text.includes('Home') && text.includes('Profile')) || text.includes('Insights') || text.includes('Goals'),
        onboarding: text.includes('Start my journey') || text.includes('MEET ATLAS'),
        error: text.toLowerCase().includes('error') || text.toLowerCase().includes('not found'),
      };
      
      console.log(`  Indicators:`);
      Object.entries(indicators).forEach(([key, val]) => {
        const symbol = val ? '✓' : '✗';
        console.log(`    ${symbol} ${key}`);
        if (val) results.push(`  ✓ ${key}`);
      });
      
      await page.screenshot({ path: `test-results/route-${routesToTest.indexOf(route) + 1}.png`, fullPage: true });
      results.push(`  Screenshot: route-${routesToTest.indexOf(route) + 1}.png`);
      
      // If we found Today's Insight, try to click it
      if (indicators.todaysInsight) {
        console.log(`\n  🎯 Found "Today's Insight"! Attempting to click...`);
        results.push(`  🎯 FOUND Today's Insight - attempting to open`);
        
        try {
          const insightBtn = page.locator('text="Today\'s Insight"').first();
          if (await insightBtn.count() > 0) {
            await insightBtn.click({ timeout: 5000 });
            await page.waitForTimeout(4000);
            
            const insightText = await page.textContent('body');
            await page.screenshot({ path: `test-results/route-${routesToTest.indexOf(route) + 1}-insight.png`, fullPage: true });
            
            console.log(`  Insight screen text: "${insightText.substring(0, 150)}..."`);
            results.push(`  Insight opened`);
            results.push(`  Content: "${insightText.substring(0, 200)}..."`);
            
            // Check for queue/loading
            const hasQueue = insightText.toLowerCase().includes('queue');
            const hasLoading = insightText.toLowerCase().includes('loading') || insightText.toLowerCase().includes('generating');
            const hasSkipQueue = insightText.toLowerCase().includes('skip') && insightText.toLowerCase().includes('queue');
            
            console.log(`  Queue/Loading indicators:`);
            console.log(`    ${hasQueue ? '✓' : '✗'} Queue mentioned`);
            console.log(`    ${hasLoading ? '✓' : '✗'} Loading screen`);
            console.log(`    ${hasSkipQueue ? '✓' : '✗'} Skip Queue button`);
            
            results.push(`  ${hasQueue ? '✓' : '✗'} Queue screen: ${hasQueue ? 'YES' : 'NO'}`);
            results.push(`  ${hasLoading ? '✓' : '✗'} Loading screen: ${hasLoading ? 'YES' : 'NO'}`);
            results.push(`  ${hasSkipQueue ? '✓' : '✗'} Skip Queue button: ${hasSkipQueue ? 'YES' : 'NO'}`);
            
            // Try to find the exact Skip Queue button
            const skipBtn = page.locator('text=/skip.*queue/i, button:has-text("Skip Queue")');
            if (await skipBtn.count() > 0) {
              const isVisible = await skipBtn.first().isVisible();
              console.log(`  Skip Queue button visibility: ${isVisible ? 'VISIBLE' : 'HIDDEN'}`);
              results.push(`  Skip Queue button element: ${isVisible ? 'VISIBLE ✓' : 'EXISTS BUT HIDDEN'}`);
              
              if (isVisible) {
                await page.screenshot({ path: `test-results/skip-queue-visible.png`, fullPage: true });
              }
            }
          }
        } catch (clickErr) {
          console.log(`  ✗ Could not click: ${clickErr.message.substring(0, 80)}`);
          results.push(`  ✗ Click failed: ${clickErr.message.substring(0, 80)}`);
        }
        
        // Found what we need, can break
        break;
      }
      
    } catch (error) {
      console.log(`  ✗ Failed: ${error.message}`);
      results.push(`✗ Failed to load: ${error.message.substring(0, 100)}`);
    }
  }
  
  // Report errors
  console.log('\n' + '═'.repeat(90));
  console.log('ERROR SUMMARY');
  console.log('═'.repeat(90));
  
  console.log(`\nConsole errors: ${errors.console.length}`);
  if (errors.console.length > 0) {
    const uniqueErrors = [...new Set(errors.console)];
    console.log(`Unique errors: ${uniqueErrors.length}`);
    uniqueErrors.slice(0, 10).forEach(err => {
      console.log(`  - ${err.substring(0, 120)}`);
    });
  }
  
  console.log(`\nPage errors: ${errors.page.length}`);
  errors.page.forEach(err => {
    console.log(`  - ${err.substring(0, 120)}`);
  });
  
  // Write results
  console.log('\n' + '═'.repeat(90));
  console.log('COMPLETE RESULTS');
  console.log('═'.repeat(90));
  results.forEach(r => console.log(r));
  
  console.log('\n✓ All screenshots saved to: test-results/route-*.png\n');
  
  console.log('Keeping browser open for 15 seconds...');
  await page.waitForTimeout(15000);
  
  await browser.close();
}

testDirectRoutes().catch(console.error);
