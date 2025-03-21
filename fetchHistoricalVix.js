const fs = require('fs');
const https = require('https');

const symbols = ['^VIX9D', '^VIX', '^VIX3M', '^VIX6M', '^VVIX', '^VOLI'];
const endDate = Math.floor(Date.now() / 1000);
const startDate = endDate - (20 * 365 * 24 * 60 * 60); // 20 years ago

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchHistoricalData(symbol) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startDate}&period2=${endDate}&interval=1d`;
    
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    if (jsonData.chart.error) {
                        reject(new Error(`API Error for ${symbol}: ${jsonData.chart.error.description}`));
                        return;
                    }
                    
                    const quotes = jsonData.chart.result[0].indicators.quote[0];
                    const timestamps = jsonData.chart.result[0].timestamp;
                    
                    const processedData = timestamps.map((time, i) => ({
                        date: new Date(time * 1000).toISOString().split('T')[0],
                        open: quotes.open[i],
                        close: quotes.close[i]
                    })).filter(item => item.open !== null && item.close !== null);
                    
                    resolve({ symbol, data: processedData });
                } catch (error) {
                    reject(new Error(`Processing error for ${symbol}: ${error.message}`));
                }
            });
        }).on('error', reject);
    });
}

function calculateDailyAverage(open, close) {
    return (open + close) / 2;
}

function calculateContangoRatios(allData) {
    const contangoPairs = {
        'VIX9D_VIX': ['^VIX9D', '^VIX'],
        'VIX_VIX3M': ['^VIX', '^VIX3M'],
        'VIX_VIX6M': ['^VIX', '^VIX6M']
    };

    const contangoData = {};
    const vixDates = new Set(allData['^VIX'].map(item => item.date));

    for (const [pairName, [index1, index2]] of Object.entries(contangoPairs)) {
        contangoData[pairName] = [];

        for (const date of vixDates) {
            const index1Data = allData[index1]?.find(d => d.date === date);
            const index2Data = allData[index2]?.find(d => d.date === date);

            if (index1Data && index2Data) {
                const avg1 = calculateDailyAverage(index1Data.open, index1Data.close);
                const avg2 = calculateDailyAverage(index2Data.open, index2Data.close);
                
                contangoData[pairName].push({
                    date,
                    difference: avg1 - avg2,  // Changed from ratio to difference
                    index1_avg: avg1,
                    index2_avg: avg2
                });
            }
        }
    }

    return contangoData;
}

function calculateResiduals(allData) {
    const residuals = {};
    const vixDates = new Set(allData['^VIX'].map(item => item.date));
    
    // Calculate VIX-VOLI residual
    residuals['^VIX-VOLI'] = [];
    for (const date of vixDates) {
        const vixData = allData['^VIX']?.find(d => d.date === date);
        const voliData = allData['^VOLI']?.find(d => d.date === date);
        
        if (vixData && voliData) {
            const vixAvg = calculateDailyAverage(vixData.open, vixData.close);
            const voliAvg = calculateDailyAverage(voliData.open, voliData.close);
            
            residuals['^VIX-VOLI'].push({
                date,
                open: vixData.open - voliData.open,
                close: vixData.close - voliData.close,
                avg_diff: vixAvg - voliAvg
            });
        }
    }
    return residuals;
}

async function fetchAllData() {
    const allData = {};
    
    for (const symbol of symbols) {
        try {
            console.log(`Fetching data for ${symbol}...`);
            const result = await fetchHistoricalData(symbol);
            allData[symbol] = result.data;
            await delay(1000); // Delay to avoid rate limiting
        } catch (error) {
            console.error(`Error fetching ${symbol}:`, error.message);
        }
    }

    // Calculate contango data
    const contangoData = calculateContangoRatios(allData);
    
    // Calculate residuals
    const residualData = calculateResiduals(allData);
    
    // Save to JSON file with both raw data and calculations
    const outputData = {
        rawData: allData,
        contangoRatios: contangoData,
        residuals: residualData
    };
    
    fs.writeFileSync(
        'historical_vix_data.json',
        JSON.stringify(outputData, null, 2)
    );
    
    console.log('Data saved to historical_vix_data.json');
}

fetchAllData().catch(console.error);
