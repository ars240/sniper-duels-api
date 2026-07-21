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
        
        const uniqueItems = new Map();
        let currentPage = 1;
        let keepScraping = true;
        
        while (keepScraping) {
            console.log(`Navigating to piratevalue.com/value?page=${currentPage}...`);
            await page.goto(`https://piratevalue.com/value?page=${currentPage}`, { waitUntil: 'networkidle2' });
            
            // Try to wait for items, if it times out, we might have reached the end
            try {
                await page.waitForSelector('a[href^="/value/"]', { timeout: 5000 });
            } catch (e) {
                console.log(`No items found on page ${currentPage}, stopping pagination.`);
                break;
            }
            
            const currentItems = await page.evaluate(() => {
                const extracted = [];
                const elements = document.querySelectorAll('a[href^="/value/"]');
                
                elements.forEach(el => {
                    const link = el.getAttribute('href');
                    let name = decodeURIComponent(link.replace('/value/', ''));
                    
                    const nameEl = el.querySelector('span.max-w-\\[150px\\]');
                    if (nameEl) name = nameEl.innerText.trim();
                    
                    // Rarity extraction:
                    let rarity = 'Unknown';
                    const rarityLabel = Array.from(el.querySelectorAll('span')).find(s => s.innerText === 'Rarity:');
                    if (rarityLabel && rarityLabel.nextElementSibling) {
                        rarity = rarityLabel.nextElementSibling.innerText.trim();
                    }

                    // Value extraction:
                    let valueText = '0';
                    // We look for 'MC' paragraph
                    const mcP = Array.from(el.querySelectorAll('p')).find(p => p.innerText.includes('MC'));
                    if (mcP && mcP.nextElementSibling) {
                        const valContainer = mcP.nextElementSibling;
                        // The container has <span>💎</span> and <span>1.25m</span>
                        const spans = valContainer.querySelectorAll('span');
                        if (spans.length >= 2) {
                            valueText = spans[1].innerText.trim();
                        } else {
                            valueText = valContainer.innerText.replace('💎', '').trim();
                        }
                    }
                    
                    if (name) {
                        extracted.push({ name, value: valueText, rarity });
                    }
                });
                return extracted;
            });
            
            if (currentItems.length === 0) {
                keepScraping = false;
            } else {
                currentItems.forEach(item => {
                    uniqueItems.set(item.name, item);
                });
                console.log(`Scraped ${currentItems.length} items from page ${currentPage}. Total unique so far: ${uniqueItems.size}`);
                currentPage++;
            }
        }
        
        const items = Array.from(uniqueItems.values());
        console.log(`Successfully scraped ${items.length} items in total.`);
        
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
