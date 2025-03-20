const express = require('express');
const cors = require('cors');
const path = require('path');
const yahooFinance = require('yahoo-finance2').default;

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname)));

// Serve background.html at root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'background.html'));
});

app.get('/vix-data', async (req, res) => {
    try {
        const vixSymbols = ['^VIX9D', '^VIX', '^VIX3M', '^VIX6M'];
        const quotes = await Promise.all(
            vixSymbols.map(symbol => yahooFinance.quote(symbol))
        );
        res.json(quotes);
    } catch (error) {
        console.error('Error fetching VIX data:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/market-data', async (req, res) => {
    try {
        const marketSymbols = ['^VVIX', '^VOLI'];  // Add any additional market symbols here
        const quotes = await Promise.all(
            marketSymbols.map(symbol => yahooFinance.quote(symbol))
        );
        res.json(quotes);
    } catch (error) {
        console.error('Error fetching market data:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;

// Add self-ping function using native fetch
async function pingServer() {
    try {
        const response = await fetch(`http://localhost:10000/vix-data`);
        if (!response.ok) {
            throw new Error('Ping failed');
        }
        console.log('Self-ping successful:', new Date().toISOString());
    } catch (error) {
        console.error('Self-ping failed:', error);
    }
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Start ping cycle (14.5 minutes = 870000 milliseconds)
    setInterval(pingServer, 870000);
});
