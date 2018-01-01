'use strict';
/*
     This is the base class all exchange integration must extend from
     let's take advantage of OOP to accomplish DRY (Do Not Repeat Your self).

     @author Rafael Cadenas
     @date 08/12/2017
*/
class AbstractExchange {

    /* minimun attributes */
    constructor(logger, pumpEvents, tickerSpeed = 5, cycleTime = 20, skipVolumes){
        this.logger = logger;
        this.pumpEvents = pumpEvents;
        this.exchange_name = this.constructor.name;
        this.ticker_speed = tickerSpeed;
        this.cycle_time = cycleTime;
        this.code = this.constructor.name;
        this.skipVolumes = skipVolumes;
        this.markets = []
        this.lastData = {}
        this.premiumOnly = false
    }

    /*
        Abstract method,  implementing this is a MUST
    */
    watch(){
        throw new Error('You have to implement the method watch!');
    }

    /*
        Abstract method, implementing this is a MUST
    */
    marketUrl(){
        throw new Error('You have to implement the method marketUrl!');
    }

    watchFunction(_funct, time) {
        try {
            _funct()
        } catch (e) {
            this.logger.error("Error on " + this.exchange_name + " exchange:", e)
        }
        setTimeout(() => { this.watchFunction(_funct, time) }, time) // update markets every 5 mins
    }

    /*
        Override when necessary
    */
    volume_for(pair) { return this.constructor.volume_for(pair) }
    symbol_for(pair) { return this.constructor.symbol_for(pair) }
    market_url(pair) { return this.constructor.market_url(pair) }

    static volume_for(pair) { return pair.split("-")[0] }
    static symbol_for(pair) { return pair.split("-")[1] }

}

module.exports = AbstractExchange;