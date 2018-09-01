express = require('express');
const TickerData = require('./models/ticker_data.js')
const app = express();
require('dotenv').config();

app.use(express.static(__dirname + '/charts'));

app.get('/', (req, res) => {
	res.sendFile('index.html')
})
const Influx = require('influx');

const influx = new Influx.InfluxDB({
 host: process.env.INFLUX_HOST,
 username: process.env.INFLUX_USER,
 password: process.env.INFLUX_PASS,
 database: 'gany',
  schema: [
    {
      measurement: 'ticker_data',
      fields: {
        open: Influx.FieldType.FLOAT,
        high: Influx.FieldType.FLOAT,
        low: Influx.FieldType.FLOAT,
        close: Influx.FieldType.FLOAT,
        volume: Influx.FieldType.FLOAT,
        volume24: Influx.FieldType.FLOAT,
      },
      tags: [ // BTC-NEO, Binance, 1D|1H|1|3|5|15
        'market', 'exchange', 'type'
      ]
    }
  ]
})




app.get('/config', (req, res) => {
	var desc = {
		exchanges: [{value: 'Binance', name: 'Binance', desc: 'Binance exchange'}, {value: 'Bittrex', name: 'Bittrex', desc: 'Bittrex exchange'}],
		symbols_types: [{name: 'bitcoin', value: 'bitcoin'}],
		supported_resolutions: ["60", "1D"],
		supports_marks: false,
		supports_time: true,
		supports_group_request: false,
		supports_search: true,
		supports_timescale_marks: false
	}
	res.send(desc)
})

app.get('/symbols', (req, res) => {
	console.log("Request to /symbols:", req.url)
	symbol = req.query.symbol.split("_")
	market = symbol[0]; exchange = symbol[1]
	res.send({
		name: market,
		ticker: req.query.symbol,
		description: market,
		type: "bitcoin",
		exchange: exchange,
		timezone: "America/Panama",
		minmov: 1,
		pricescale: 1000000, // TODO: THIS SHOULD BE PARSED DEPENDING ON CURRENCY DECIMALS
		minmov2: 0,
		fractional: false,
		has_intraday: true,
		has_no_volume: false,
		pointvalue: 1,
		session: "24x7",
		supported_resolutions: ['1', "60", "1D"],
	})
})

app.get('/history', (req, res) => {
	console.log("Request to history:", req.url)
	// /history?symbol=BTC-USD&resolution=60&from=1350568800&to=1351040399
	symbol = req.query.symbol.split("_")
	time_type = req.query.resolution == '60' ? 'hour' : 'day'
	if (req.query.resolution == '1') {
		let resolution = parseInt(req.query.resolution)
		let pair = symbol[0]
		let exchange = symbol[1]
		let from = new Date(parseInt(req.query.from + '000'))
		let to = new Date(parseInt(req.query.to + '000'))
		console.log("Fetch for: ", exchange, pair, from, to, resolution)

		nanoFrom = Influx.toNanoDate(from.getTime()  + '000000')
		nanoTo = Influx.toNanoDate(to.getTime()  + '000000')

		influx.query(`select * from ticker_data where market='${pair}' and exchange='${exchange}' and time >= '${nanoFrom.toNanoISOString()}' and time <= '${nanoTo.toNanoISOString()}'`).then(results => {
		  console.log(results)
		  res.send(convertToTvHistory(results))
		})

	} else {
		resolution = req.query.resolution
		pair = symbol[0]
		exchange = symbol[1]
		from = parseInt(req.query.from + '000')
		to = parseInt(req.query.to + '000')
		console.log("Fetch for: ", exchange, pair, from, to, resolution)
		TickerData.find({market: pair, exchange: exchange, ticker_type: time_type, createdAt: {$gt: from, $lt: to}}, (err, data) => {
			res.send(convertToTvHistory(data))
		})
	}
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
	res = {t: [], o: [], h: [], l: [], c: [], v: [], s: data.length > 0 ? "ok" : "no_data"} // requires: v: volume array
	data.forEach((d) => {
		res.t.push(Math.floor((d.createdAt || new Date(d.time.toNanoISOString())) / 1000))
		res.o.push(d.open)
		res.h.push(d.high)
		res.l.push(d.low)
		res.c.push(d.close)
		res.v.push(d.volume)
	})
	return res
}
