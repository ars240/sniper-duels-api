const express = require('express');
const cron = require('node-cron');
const fs = require('fs');
const scrapeValues = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;

// Root endpoint for UptimeRobot
app.get('/', (req, res) => {
    res.send('Sniper Duels API is running 24/7! (Go to /api/values for data)');
});

// Serve the values as JSON
app.get('/api/values', (req, res) => {
    try {
        if (fs.existsSync('data.json')) {
            const data = fs.readFileSync('data.json', 'utf8');
            res.json(JSON.parse(data));
        } else {
            res.status(404).json({ error: 'Data not available yet. Scraper might still be running.' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to read data' });
    }
});

// Start the server
app.listen(PORT, async () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api/values`);
    
    // Run an initial scrape immediately so we don't wait 10 minutes
    console.log('[INIT] Starting initial scrape...');
    try {
        await scrapeValues();
        console.log('[INIT] Initial scrape finished.');
    } catch (e) {
        console.log('[INIT] Error during initial scrape:', e);
    }
});

// Schedule scraper to run every 10 minutes
// Cron syntax: "*/10 * * * *"
cron.schedule('*/10 * * * *', async () => {
    console.log('[CRON] Starting scheduled scrape...');
    await scrapeValues();
    console.log('[CRON] Scrape finished.');
});

console.log('Cron job scheduled to run every 10 minutes.');
