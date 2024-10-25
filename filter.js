var fs = require('fs');
const inputPath = `./code/u22-xgboost/data/input.json`

var inputData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

let mapp = {}

inputData.forEach(elem => {
    prices = mapp[elem.symbol] || []
    prices.push(elem)
    mapp[elem.symbol] = prices
})

quantities = Object.entries(mapp).map(([k, v]) => [k, v.length])

quantities.sort((a, b) => b[1] - a[1])

console.log(quantities, "total")

fs.writeFile(`./code/u22-xgboost/data/input_${quantities[0][0]}.json`, JSON.stringify(mapp[quantities[0][0]]), 'utf8', () => { });
fs.writeFile(`./code/u22-xgboost/data/input_${quantities[1][0]}.json`, JSON.stringify(mapp[quantities[1][0]]), 'utf8', () => { });
fs.writeFile(`./code/u22-xgboost/data/input_${quantities[2][0]}.json`, JSON.stringify(mapp[quantities[2][0]]), 'utf8', () => { });
