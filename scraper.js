const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeValues() {
    let browser;
    try {
        console.log('Launching browser...');
        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        const page = await browser.newPage();
        
        console.log('Navigating to piratevalue.com/value...');
        await page.goto('https://piratevalue.com/value', { waitUntil: 'networkidle2' });
        
        console.log('Scrolling and extracting items...');
        const uniqueItems = new Map();
        let previousHeight = 0;
        
        while (true) {
            // Extract visible items in current view
            const currentItems = await page.evaluate(() => {
                const extracted = [];
                const elements = document.querySelectorAll('a[href^="/value/"]');
                elements.forEach(el => {
                    const link = el.getAttribute('href');
                    let name = decodeURIComponent(link.replace('/value/', ''));
                    const nameEl = el.querySelector('span.max-w-\\[150px\\]');
                    if (nameEl) name = nameEl.innerText.trim();
                    
                    const valSpans = Array.from(el.querySelectorAll('span')).filter(s => s.innerText.includes('💎'));
                    let valueText = '0';
                    if (valSpans.length > 0) {
                        valueText = valSpans[0].innerText.replace('💎', '').trim();
                    } else {
                        const fallback = el.querySelector('.text-mono, .font-mono');
                        if (fallback) valueText = fallback.innerText.replace('💎', '').trim();
                    }
                    if (valueText !== '0' && name) {
                        extracted.push({ name, value: valueText, rarity: 'Unknown' });
                    }
                });
                return extracted;
            });
            
            // Add to Map to handle duplicates
            currentItems.forEach(item => {
                uniqueItems.set(item.name, item);
            });
            
            // Scroll down
            await page.evaluate('window.scrollBy(0, 1000)');
            await new Promise(resolve => setTimeout(resolve, 800));
            
            let newHeight = await page.evaluate('document.documentElement.scrollTop + window.innerHeight');
            let docHeight = await page.evaluate('document.documentElement.scrollHeight');
            
            if (newHeight >= docHeight || previousHeight === newHeight) {
                // Wait a bit more to ensure it's really the bottom
                await new Promise(resolve => setTimeout(resolve, 1500));
                let finalCheckDocHeight = await page.evaluate('document.documentElement.scrollHeight');
                if (docHeight === finalCheckDocHeight) break;
            }
            previousHeight = newHeight;
        }
        
        const items = Array.from(uniqueItems.values());
        console.log(`Successfully scraped ${items.length} items.`);
        
        // Save to data.json
        fs.writeFileSync('data.json', JSON.stringify({
            lastUpdated: new Date().toISOString(),
            items: items
        }, null, 2));
        
        console.log('Data saved to data.json');
        return items;
    } catch (error) {
        console.error('Error scraping:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = scrapeValues;

if (require.main === module) {
    scrapeValues();
}
