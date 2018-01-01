'use strict';
require('./protofunctions.js')
const Ticker = require('./models/ticker')
const TickerData = require('./models/ticker_data')
const ExchangeList = require('./exchange_list')
/*
    Handles all the ticker related information through time.
*/
class TickerHandler {
    constructor(detektor, logger) {
        this.detektor = detektor // for handling tickers blacklist, refactor me
        this.logger = logger
        this.current_data = {} // current data (1 record per ticker)
        this.last_minute_data = {} // current minute of tickers
        this.minutes_data = {} // every minute data of ticker (1 per minute)
        this.high_low = {} // High Low of last minute

        this.minute_counter_by_exchange_market = {} // counts 1 per ticker update per exchange per market, once equals to one minute data gets stored
        this.premiumClients = Object.keys(ExchangeList).filter((name)=>{ return ExchangeList[name].premiumOnly }).map((name) => { return ExchangeList[name].code })

        // configurations
        this.last_minute_data_cleaning_time = 20 // clean ever X minutes
        this.minute_data_cleaning_time = 5 // clean ever X minutes
        this.max_tickers_history = 40 // minutes of history to be kept in ticker-speed data
        this.max_minutes_tickers_history = 60 * 2 // minutes of history to be kept in minute-speed data

        // periodic functions
        setTimeout(() => { this.keep_tickers_limited() }, this.last_minute_data_cleaning_time * 60 * 1000)
        setTimeout(() => { this.keep_minute_tickers_limited() }, this.minute_data_cleaning_time * 60 * 1000)
    }

    update_ticker(exchange, market, data) {
        this.current_data[exchange] = this.current_data[exchange] || {}
        this.current_data[exchange][market] = data

        this.update_ticker_history(exchange, market, data)
        this.update_minute_ticker(exchange, market)
        this.updateHighLow(exchange, market, data)
    }

    update_ticker_history(exchange, market, data) {
        this.last_minute_data[exchange] = this.last_minute_data[exchange] || {}
        this.last_minute_data[exchange][market] = this.last_minute_data[exchange][market] || []
        this.last_minute_data[exchange][market].push(data)
    }

    updateHighLow(exchange, market, data) {
        this.high_low[exchange] = this.high_low[exchange] || {}
        this.high_low[exchange][market] = this.high_low[exchange][market] || {minuteHigh: data.last, minuteLow: data.last}
        if (data.last > this.high_low[exchange][market].minuteHigh)
            this.high_low[exchange][market].minuteHigh = data.last
        if (data.last < this.high_low[exchange][market].minuteLow)
            this.high_low[exchange][market].minuteLow = data.last
    }

    update_minute_ticker(exchange, market) {
        this.minute_counter_by_exchange_market[exchange+market] = this.minute_counter_by_exchange_market[exchange+market] || 0
        this.minute_counter_by_exchange_market[exchange+market] += 1
        if (this.minute_counter_by_exchange_market[exchange+market] == this.oneMinuteLength(exchange)) {
            // if we already have one minute of data then store minute data
            this.minutes_data[exchange] = this.minutes_data[exchange] || {}
            this.minutes_data[exchange][market] = this.minutes_data[exchange][market] || []
            let handled_data = this.last_minute_data[exchange][market].last()
            handled_data.open = this.getLastMinuteThElement(exchange, market, this.oneMinuteLength(exchange)).last
            handled_data.close = handled_data.last
            handled_data.minuteHigh = this.high_low[exchange][market].minuteHigh
            handled_data.minuteLow = this.high_low[exchange][market].minuteLow
            this.high_low[exchange][market] = {minuteHigh: handled_data.last, minuteLow: handled_data.last}
            this.minutes_data[exchange][market].push(handled_data)

            // create ticker data
            Ticker.store(exchange, market, handled_data)

            this.minute_counter_by_exchange_market[exchange+market] = 0
        }
        // si ya tenemos 1 minuto de data, guardar en "minute_data" as minute data
        // minute data debería guardar en DB
    }

    isPremiumExchange(exchange) {
        return this.premiumClients.indexOf(exchange) != -1
    }

    getLastMinuteThElement(exchange, market, time) {
        let length = this.last_minute_data[exchange][market].length
        return this.last_minute_data[exchange][market][length - time]
    }

    // should iteratively return time and data
    get_ticker_history(exchange, market, callback) {
        let tickers = this.last_minute_data[exchange][market]
        let ticker_time = this.cycle_time(exchange)
        let max_time = tickers.length <= ticker_time ? tickers.length : ticker_time
        for(let time = max_time; time > 1; time--) {
            let ticker = tickers[tickers.length - time] || tickers.first()
            if (ticker) {
                callback(time * this.exchange_ticker_speed(exchange), ticker)
            }
        }
    }

    keep_tickers_limited() { // will limit tickers history to not fill memory up
        this.logger.log("RUNNING TICKERS CLEANER...")
        Object.keys(this.last_minute_data).forEach((exchange) => {
            let max_tickers = 60 / this.exchange_ticker_speed(exchange) * this.max_tickers_history // calculate ticker size for configured value
            Object.keys(this.last_minute_data[exchange]).forEach((market) => {
                if (this.last_minute_data[exchange][market].length > max_tickers) {
                    let tickers = this.last_minute_data[exchange][market]
                    this.last_minute_data[exchange][market] = tickers.slice(tickers.length - max_tickers, tickers.length)
                }
            })
        })
        Object.keys(this.detektor.tickers_detected_blacklist).forEach((blacklisted) => {
            if (this.detektor.tickers_detected_blacklist[blacklisted] == 0)
                delete(this.detektor.tickers_detected_blacklist[blacklisted])
        })
        setTimeout(() => { this.keep_tickers_limited() }, this.last_minute_data_cleaning_time * 60 * 1000) // clean every 30 minutes
    }

    keep_minute_tickers_limited() { // will limit tickers history to not fill memory up
        this.logger.log("RUNNING MINUTE TICKERS CLEANER...")
        Object.keys(this.minutes_data).forEach((exchange) => {
            Object.keys(this.minutes_data[exchange]).forEach((market) => {
                if (this.minutes_data[exchange][market].length > this.max_minutes_tickers_history) {
                    let tickers = this.minutes_data[exchange][market]
                    this.minutes_data[exchange][market] = tickers.slice(tickers.length - this.max_minutes_tickers_history, tickers.length)
                }
            })
        })
        setTimeout(() => { this.keep_minute_tickers_limited() }, this.minute_data_cleaning_time * 60 * 1000) // clean every X minutes
    }

    cycle_time(exchange) {
        return ExchangeList[exchange].cycle_time * 60 / this.exchange_ticker_speed(exchange)
    }

    exchange_ticker_speed(exchange) {
        return ExchangeList[exchange].ticker_speed
    }

    oneMinuteLength(exchange) {
        return 60 / this.exchange_ticker_speed(exchange)
    }

    findMarketsByName(market_name, callback) {
        let market_name_ary = []
        if (market_name.match(/\-/))
            market_name_ary = [market_name, market_name.split(/\-/).reverse().join('-')]
        Object.keys(this.current_data).forEach((exchange) => {
            Object.keys(this.current_data[exchange]).forEach((market) => {
                if (market_name.match(/\-/)) { // for when using /see with a pair like /see eth-btc
                    if (market_name_ary.indexOf(market) != -1)
                        callback(exchange, market, this.current_data[exchange][market])
                } else {
                    if (market.split("-").includes(market_name))
                        callback(exchange, market, this.current_data[exchange][market])
                }
            })
        })
    }

    get_market_data(market_name, subscriber) { // subscriber config
        let markets = []
        this.findMarketsByName(market_name, (exchange, market, ticker) => {
            markets.push({exchange: exchange, market: market, ticker: ticker})
        })
        if (subscriber) // filter by configuration
            markets = markets.filter((market) => { return subscriber.exchanges[market.exchange] && subscriber.markets[this.getMarketType(market)]})
        if (subscriber && subscriber.subscription_status == false) // filter premium exchanges
            markets = markets.filter((market) => { return !this.isPremiumExchange(market.exchange)}) // only non prem
        if ((subscriber && (subscriber.telegram_id != 65954004 && subscriber.telegram_id != 403276254)) || !subscriber)
            markets = markets.filter((market) => { return market.exchange != 'EtherDelta' && market.exchange != 'Kucoin' }) // only mods

        return markets
    }

    getMarketDataForChart(market_name) {
        markets = this.get_market_data(market_name, false)
        
    }

    getMarketType(marketData) {
        return ExchangeList[marketData.exchange].volume_for(marketData.market)
    }

    getMarketDataWithTime(marketName, time, subscriber) {
        return new Promise((resolve, reject) => {
            let marketDatas = this.get_market_data(marketName, subscriber)
            let markets = []
            if (marketDatas.length == 0)
                resolve([])
            else
                marketDatas.forEach((marketData) => {
                    let exchange = marketData.exchange
                    let market = marketData.market
                    let ticker = marketData.ticker
                    Ticker.getOne(exchange, market, time, (err, firstTicker) => {
                        markets.push({exchange: exchange, market: market, firstTicker: firstTicker, lastTicker: ticker})
                        if (err)
                            reject(err)
                        else
                            if (exchange == marketDatas.last().exchange && market == marketDatas.last().market) {
                                // we finished loading
                                markets = markets.filter((data) => { return data.firstTicker != undefined })
                                if (markets.length == 0)
                                    reject('no_time_data')
                                else
                                    resolve(markets)
                            }
                    })
                })
        })
    }

    getMinuteMarketData(exchange, market, time) {
        return new Promise((resolve, reject) => {
            Ticker.getRange(exchange, market, 0, time, (err, data) => {
                if (err)
                    reject(err)
                else
                    if (data.length == 0)
                        reject('no_time_data')
                    else
                        resolve(data)
            })
        })
    }

    getHourMarketData(exchange, market, ticker_type, time) {
        return new Promise((resolve, reject) => {
            TickerData.find({exchange: exchange, market: market, ticker_type: ticker_type}).limit(time).sort([['createdAt', 'descending']]).exec((err, data) => {
                if (err)
                    reject(err)
                else
                    if (data.length == 0)
                        reject('no_time_data')
                    else
                        resolve(data)
            })
        })
    }
}

module.exports = TickerHandler;