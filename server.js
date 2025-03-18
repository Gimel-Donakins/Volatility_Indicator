const express = require('express');
const cors = require('cors');
const yahooFinance = require('yahoo-finance2').default;

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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
