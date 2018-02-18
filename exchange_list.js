var ExchangeList = {
	Bittrex: require('./exchanges/bittrex'),
	Yobit: require('./exchanges/yobit'),
	Poloniex: require('./exchanges/poloniex'),
	Cryptopia: require("./exchanges/cryptopia"),
	Kraken: require('./exchanges/kraken'),
	Binance: require('./exchanges/binance'),
	EtherDelta: require('./exchanges/ether_delta'),
	Kucoin: require('./exchanges/kucoin'),
	CoinExchange: require('./exchanges/coin_exchange'),
	Huobi: require('./exchanges/huobi'),
}

// Refactor me, im too tired to do it
ExchangeList.Bittrex.ticker_speed = 5
ExchangeList.Bittrex.cycle_time = 20

ExchangeList.Yobit.ticker_speed = 5
ExchangeList.Yobit.cycle_time = 20

ExchangeList.Kraken.ticker_speed = 5
ExchangeList.Kraken.cycle_time = 20

ExchangeList.Kucoin.ticker_speed = 5
ExchangeList.Kucoin.cycle_time = 20

ExchangeList.EtherDelta.ticker_speed = 10
ExchangeList.EtherDelta.cycle_time = 20
ExchangeList.EtherDelta.premiumOnly = true

ExchangeList.Poloniex.ticker_speed = 10
ExchangeList.Poloniex.cycle_time = 20

ExchangeList.Binance.ticker_speed = 20
ExchangeList.Binance.cycle_time = 20

ExchangeList.Cryptopia.ticker_speed = 20
ExchangeList.Cryptopia.cycle_time = 20

ExchangeList.CoinExchange.ticker_speed = 10
ExchangeList.CoinExchange.cycle_time = 20
ExchangeList.CoinExchange.modOnly = true

ExchangeList.Huobi.ticker_speed = 10
ExchangeList.Huobi.cycle_time = 20
ExchangeList.Huobi.modOnly = true


module.exports = ExchangeList