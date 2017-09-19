'use strict';
require('./protofunctions.js')
/*
    Handles all the ticker related information through time.
*/
class TickerHandler {
    constructor(detektor, logger, clients) {
        this.detektor = detektor // for handling tickers blacklist, refactor me
        this.logger = logger
        this.current_data = {} // current data (1 record per ticker)
        this.last_minute_data = {} // current minute of tickers
        this.minutes_data = {} // every minute data of ticker (1 per minute)
        this.minute_counter_by_exchange_market = {} // counts 1 per ticker update per exchange per market, once equals to one minute data gets stored
        this.clients = clients

        // configurations
        this.last_minute_data_cleaning_time = 20 // clean ever X minutes
        this.max_tickers_history = 60 // minutes of history to be kept

        // periodic functions
        setTimeout(() => { this.keep_tickers_limited() }, this.last_minute_data_cleaning_time * 60 * 1000)
    }

    update_ticker(exchange, market, data) {
        this.current_data[exchange] = this.current_data[exchange] || {}
        this.current_data[exchange][market] = data

        this.update_ticker_history(exchange, market, data)
        this.update_minute_ticker(exchange, market)
    }

    update_ticker_history(exchange, market, data) {
        this.last_minute_data[exchange] = this.last_minute_data[exchange] || {}
        this.last_minute_data[exchange][market] = this.last_minute_data[exchange][market] || []
        this.last_minute_data[exchange][market].push(data)
    }

    update_minute_ticker(exchange, market) {
        this.minute_counter_by_exchange_market[exchange+market] = this.minute_counter_by_exchange_market[exchange+market] || 0
        this.minute_counter_by_exchange_market[exchange+market] += 1
        if (this.minute_counter_by_exchange_market[exchange+market] == this.oneMinuteLength(exchange)) {
            // if we already have one minute of data then store minute data
            this.minutes_data[exchange] = this.minutes_data[exchange] || {}
            this.minutes_data[exchange][market] = this.minutes_data[exchange][market] || []
            this.minutes_data[exchange][market].push(this.last_minute_data[exchange][market].last())

            this.minute_counter_by_exchange_market[exchange+market] = 0
        }
        // si ya tenemos 1 minuto de data, guardar en "minute_data" as minute data
        // minute data debería guardar en DB
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
            max_tickers = 60 / this.exchange_ticker_speed(exchange) * this.max_tickers_history // calculate ticker size for configured value
            Object.keys(this.last_minute_data[exchange]).forEach((market) => {
                if (this.last_minute_data[exchange][market].length > max_tickers) {
                    tickers = this.last_minute_data[exchange][market]
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

    cycle_time(exchange) {
        return this.clients[exchange].cycle_time * 60 / this.exchange_ticker_speed(exchange)
    }

    exchange_ticker_speed(exchange) {
        return this.clients[exchange].ticker_speed
    }

    oneMinuteLength(exchange) {
        return 60 / this.exchange_ticker_speed(exchange)
    }

    get_market_data(market_name) {
        let markets = []
        Object.keys(this.current_data).forEach((exchange) => {
            Object.keys(this.current_data[exchange]).forEach((market) => {
                if (market.split("-").includes(market_name))
                    markets.push({exchange: exchange, market: market, ticker: this.current_data[exchange][market]})
            })
        })
        return markets
    }

}

module.exports = TickerHandler;