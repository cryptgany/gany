// This happened because Redis brought back items from oldest to newest, it was thought that it was the other way
// Resulting in an inverted open/close
// We do it in steps so we are sure we don't drop the server down

var TickerData = require('../models/ticker_data')

TickerData.find({exchange: 'Binance', ticker_type: 'hour'}, (err, datas)=>{
	datas.forEach((data) => {
		let close = data.close
		let open = data.open
		data.open = close
		data.close = open
		data.save()
	}); console.log('Done!')
})

TickerData.find({exchange: 'Bittrex', ticker_type: 'hour'}, (err, datas)=>{
	datas.forEach((data) => {
		let close = data.close
		let open = data.open
		data.open = close
		data.close = open
		data.save()
	}); console.log('Done!')
})

TickerData.find({exchange: 'EtherDelta', ticker_type: 'hour'}, (err, datas)=>{
	datas.forEach((data) => {
		let close = data.close
		let open = data.open
		data.open = close
		data.close = open
		data.save()
	}); console.log('Done!')
})

TickerData.find({exchange: 'Kraken', ticker_type: 'hour'}, (err, datas)=>{
	datas.forEach((data) => {
		let close = data.close
		let open = data.open
		data.open = close
		data.close = open
		data.save()
	}); console.log('Done!')
})

TickerData.find({exchange: 'Yobit', ticker_type: 'hour'}, (err, datas)=>{
	datas.forEach((data) => {
		let close = data.close
		let open = data.open
		data.open = close
		data.close = open
		data.save()
	}); console.log('Done!')
})

TickerData.find({exchange: 'Poloniex', ticker_type: 'hour'}, (err, datas)=>{
	datas.forEach((data) => {
		let close = data.close
		let open = data.open
		data.open = close
		data.close = open
		data.save()
	}); console.log('Done!')
})

TickerData.find({exchange: 'Cryptopia', ticker_type: 'hour'}, (err, datas)=>{
	datas.forEach((data) => {
		let close = data.close
		let open = data.open
		data.open = close
		data.close = open
		data.save()
	}); console.log('Done!')
})

TickerData.find({exchange: 'Kucoin', ticker_type: 'hour'}, (err, datas)=>{
	datas.forEach((data) => {
		let close = data.close
		let open = data.open
		data.open = close
		data.close = open
		data.save()
	}); console.log('Done!')
})

// Day is few data so it doesn't require much
TickerData.find({ticker_type: 'day'}, (err, datas)=>{
	datas.forEach((data) => {
		let close = data.close
		let open = data.open
		data.open = close
		data.close = open
		data.save()
	}); console.log('Done!')
})
