var ExchangeList = {
	Bittrex: require('./exchanges/bittrex'),
	Yobit: require('./exchanges/yobit'),
	Poloniex: require('./exchanges/poloniex'),
	Cryptopia: require("./exchanges/cryptopia"),
	Kraken: require('./exchanges/kraken'),
	Binance: require('./exchanges/binance'),
	EtherDelta: require('./exchanges/ether_delta'),
	Kucoin: require('./exchanges/kucoin'),
	Huobi: require('./exchanges/huobi'),
	IDEX: require('./exchanges/idex'),
	Bitfinex: require('./exchanges/bitfinex'),
	Stellar: require('./exchanges/stellar'),
}

// Refactor me, im too tired to do it
ExchangeList.Bittrex.ticker_speed = 20
ExchangeList.Bittrex.cycle_time = 20

ExchangeList.Yobit.ticker_speed = 20
ExchangeList.Yobit.cycle_time = 20

ExchangeList.Kraken.ticker_speed = 20
ExchangeList.Kraken.cycle_time = 20

ExchangeList.Kucoin.ticker_speed = 20
ExchangeList.Kucoin.cycle_time = 20

ExchangeList.EtherDelta.ticker_speed = 20
ExchangeList.EtherDelta.cycle_time = 20
ExchangeList.EtherDelta.premiumOnly = true

ExchangeList.Poloniex.ticker_speed = 20
ExchangeList.Poloniex.cycle_time = 20

ExchangeList.Binance.ticker_speed = 20
ExchangeList.Binance.cycle_time = 20

ExchangeList.Cryptopia.ticker_speed = 20
ExchangeList.Cryptopia.cycle_time = 20

ExchangeList.Huobi.ticker_speed = 30
ExchangeList.Huobi.cycle_time = 30

ExchangeList.IDEX.ticker_speed = 20
ExchangeList.IDEX.cycle_time = 20

ExchangeList.Bitfinex.ticker_speed = 20
ExchangeList.Bitfinex.cycle_time = 20

ExchangeList.Stellar.ticker_speed = 30
ExchangeList.Stellar.cycle_time = 30

module.exports = ExchangeList
