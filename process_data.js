var fs = require('fs');
const csv = require('csv-parser');

const dataFolder = "./code/u22-xgboost/data/"

const tradeDetailsPath = dataFolder + "trade_details.json"
const priceInfoPath = dataFolder + "price_info60049.csv"

var rawTradeDetails = JSON.parse(fs.readFileSync(tradeDetailsPath, 'utf8'));

var tradeDetails = rawTradeDetails.map(elem => {
    return {
        ...elem,
        data: JSON.parse(elem.data),
    }
})

fs.writeFile(dataFolder + 'trades_details_json.json', JSON.stringify(tradeDetails), 'utf8', () => { });

const sign = side => side == "BUY" ? 1 : -1

const findPriceInfo = (prices, timestamp, marketType) => {
    for (i = 0; i < prices.length - 1; i++) {
        if (prices[i + 1].timestamp > timestamp) {
            break
        }
    }

    if (marketType == "Spot") return {
        volatility: prices[i].spot_price_volatility,
        last_update_interval: prices[i].spot_time_since_last_price_update,
    }

    return {
        volatility: prices[i].future_price_volatility,
        last_update_interval: prices[i].future_time_since_last_price_update,
    }
}

const assets = ["ENJ", "JUP", "GMX", "NTRN", "RLC", "ACE", "STORJ", "TAO", "XRP", "UNI", "CHR", "LOKA", "MEME", "STX", "POL", "INJ", "ALPACA", "FLM", "SUSHI", "VANRY", "EIGEN", "MAGIC", "YGG", "FLOKI", "BAND", "APE", "WOO", "XAI", "OP", "HMSTR", "THETA", "UMA", "NFP", "KLAY", "TNSR", "API3", "NEIRO", "DYDX", "TURBO"]

if (false) {
    let count = 0
    const prices = {};
    fs.createReadStream(priceInfoPath)
        .pipe(csv({
            headers: ['exchange', 'symbol', 'spot_price_volatility', 'spot_time_since_last_price_update',
                'future_price_volatility', 'future_time_since_last_price_update', 'timestamp'],
            separator: ';'
        }))
        .on('data', (row) => {
            count++
            if (count < 2) console.log("Sample data", row)
            // {
            //     exchange: 'binance',
            //     symbol: 'FLOKI',
            //     spot_price_volatility: '4.596802594141529e-06',
            //     spot_time_since_last_price_update: '0',
            //     future_price_volatility: '7.138107644200647e-06',
            //     future_time_since_last_price_update: '719',
            //     timestamp: '1729411200012'
            // }

            if (assets.includes(row.symbol)) {
                key = row.exchange + row.symbol
                listPrice = prices[key] || []
                listPrice.push({
                    exchange: row.exchange,
                    symbol: row.symbol,
                    spot_price_volatility: parseFloat(row.spot_price_volatility),
                    spot_time_since_last_price_update: parseInt(row.spot_time_since_last_price_update),
                    future_price_volatility: parseFloat(row.future_price_volatility),
                    future_time_since_last_price_update: parseInt(row.future_time_since_last_price_update),
                    timestamp: parseInt(row.timestamp),
                })
                prices[key] = listPrice
            }
        })
        .on('end', () => {
            console.log('CSV file successfully processed');
            console.log(`Processed ${prices.length} rows`);
            for (const [key, value] of Object.entries(prices)) {
                fs.writeFile(dataFolder + key + '.json', JSON.stringify(value), 'utf8', () => { });
            }
        })
        .on('error', (err) => {
            console.error('Error processing CSV file:', err);
        });
}

var prices = {}

// price_volatility
// time_since_last_price_update
// order size
// order submission latency
// number of orders
// observed slippage = sign(side) * (Initial_pice - Executed_price) / Initial_pice * 1e4 (bps)
var input = []

tradeDetails.forEach(t => {
    job = t.data.job
    res = t.data.invoke_result
    if (res.first_order_cum_quote > 0) {
        key = job.first_order_exchange + t.symbol
        if (!prices[key])
            prices[key] = JSON.parse(fs.readFileSync(dataFolder + key + ".json", 'utf8'));

        price = findPriceInfo(prices[key], new Date(res.first_order_requested_at).getTime(), job.first_order_market_type)
        short = {
            symbol: t.symbol,
            exchange: job.first_order_exchange,
            market_type: job.first_order_market_type,
            side: job.first_order_side,
            timestamp: new Date(res.first_order_requested_at).getTime(),
            price_volatility: price.volatility,
            time_since_last_price_update: price.last_update_interval,
            order_size: job.first_order_raw_qty,
            order_latency: new Date(res.first_order_finished_at) - new Date(res.first_order_requested_at),
            order_count: res.first_order_placing_count,
            observed_slippage: sign(job.first_order_side) * (1 - res.first_order_filled_price / job.first_order_raw_price)
        }

        input.push(short)
    }

    if (res.second_order_cum_quote > 0) {
        key = job.second_order_exchange + t.symbol
        if (!prices[key])
            prices[key] = JSON.parse(fs.readFileSync(dataFolder + key + ".json", 'utf8'));

        price = findPriceInfo(prices[key], new Date(res.second_order_requested_at).getTime(), job.second_order_market_type)
        short = {
            symbol: t.symbol,
            exchange: job.second_order_exchange,
            market_type: job.second_order_market_type,
            side: job.second_order_side,
            timestamp: new Date(res.second_order_requested_at).getTime(),
            price_volatility: price.volatility,
            time_since_last_price_update: price.last_update_interval,
            order_size: job.second_order_raw_qty,
            order_latency: new Date(res.second_order_finished_at) - new Date(res.second_order_requested_at),
            order_count: res.second_order_placing_count,
            observed_slippage: sign(job.second_order_side) * (1 - res.second_order_filled_price / job.second_order_raw_price) * 1e2
        }

        input.push(short)
    }
})

fs.writeFile(dataFolder + 'input.json', JSON.stringify(input), 'utf8', () => { });
