express = require('express');
const TickerData = require('./models/ticker_data.js')
const app = express();

app.use(express.static(__dirname + '/charts'));

app.get('/', (req, res) => {
	res.sendFile('index.html')
})

app.get('/config', (req, res) => {
	var desc = {
		exchanges: [{value: 'Binance', name: 'Binance', desc: 'Binance exchange'}, {value: 'Bittrex', name: 'Bittrex', desc: 'Bittrex exchange'}],
		symbols_types: [{name: 'bitcoin', value: 'bitcoin'}],
		supported_resolutions: ["60"],
		supports_marks: true,
		supports_time: true,
		supports_group_request: false,
		supports_search: true,
		supports_timescale_marks: true
	}
	res.send(desc)
})

app.get('/symbols', (req, res) => {
	console.log("Request to /symbols:", req.url)
	res.send({
		name: "BTC-USD",
		ticker: "BTC-USDT_Binance",
		description: "Bitcoin - USD",
		type: "bitcoin",
		exchange: "Binance",
		timezone: "America/Panama",
		minmov: 1,
		pricescale: 100,
		minmov2: 0,
		fractional: false,
		has_intraday: true,
		has_no_volume: true,
		pointvalue: 1,
		session: "24x7",
		supported_resolutions: ["60"],
	})
})

app.get('/history', (req, res) => {
	console.log("Request to history:", req.url)
	// /history?symbol=BTC-USD&resolution=60&from=1350568800&to=1351040399
	symbol = req.query.symbol.split("_")
	resolution = req.query.resolution
	pair = symbol[0]
	exchange = symbol[1]
	from = parseInt(req.query.from + '000')
	to = parseInt(req.query.to + '000')
	console.log("Fetch for: ", exchange, pair, from, to, resolution)
	TickerData.find({market: pair, exchange: exchange, ticker_type: 'hour', createdAt: {$gt: from, $lt: to}}, (err, data) => {
		res.send(convertToTvHistory(data))
	})
})

app.get('/time', (req, res) => {
	console.log("Request to time")
	res.send(Math.floor(new Date() / 1000).toString())
})

// Request to /symbols: /symbols?symbol=BTCUSD
// Request to /symbols: /symbols?symbol=Bitcoin%20-%20USD


app.listen(3000, () => console.log('Example app listening on port 3000!'))


// TODO: IMPLEMENT ME
// SEE udf_example_server.js
// "/config"
// "/symbols" && !!query["symbol"]
// "/search"
// "/history"
// "/quotes"
// "/marks"
// "/time"
// "/timescale_marks"
// "/news"
// "/futuresmag"


// options = {
// 	phantomConfig: {'sslProtocol': 'any', 'ignoreSslErrors': 'true'},
// }

// webshot('http://localhost:3000/', 'test.png', options, function(err) {
// 	if (err)
// 		console.log("Error: ",err)
// 	else
// 		console.log("Saved!")
// });

function convertToTvHistory(data) {
	res = {t: [], o: [], h: [], l: [], c: [], s: "ok"} // requires: v: volume array
	data.forEach((d) => {
		res.t.push(Math.floor(d.createdAt / 1000))
		res.o.push(d.open)
		res.h.push(d.high)
		res.l.push(d.low)
		res.c.push(d.close)
	})
	return res
}
