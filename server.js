const express = require('express');
const cors = require('cors');
const yahooFinance = require('yahoo-finance2').default;
const fetch = require('node-fetch'); // Add this import

const app = express();
app.use(cors());

app.get('/vix-data', async (req, res) => {
    try {
        const symbols = ['^VIX9D', '^VIX', '^VIX3M', '^VIX6M'];
        const quotes = await Promise.all(
            symbols.map(symbol => yahooFinance.quote(symbol))
        );
        res.json(quotes);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3000 || process.env.PORT;

// Add self-ping function
async function pingServer() {
    try {
        const response = await fetch(`http://localhost:${PORT}/vix-data`);
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
