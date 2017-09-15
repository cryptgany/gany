'use strict';
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
    }

    update_ticker_history(exchange, market, data) {
        this.last_minute_data[exchange] = this.last_minute_data[exchange] || {}
        this.last_minute_data[exchange][market] = this.last_minute_data[exchange][market] || []
        this.last_minute_data[exchange][market].push(data)
    }

    get_ticker_history(exchange, market) {
        return this.last_minute_data[exchange][market]
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