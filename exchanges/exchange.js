'use strict';
/*
     This is the base class all exchange integration must extend from
     let's take advantage of OOP to accomplish DRY (Do Not Repeat Your self).

     @author Rafael Cadenas
     @date 08/12/2017
*/
class AbstractExchange {

    /* minimun attributes */
    constructor(logger, pumpEvents, exchangeName, tickerSpeed = 5, cycleTime, code, skipVolumes){
        this._logger = logger;
        this._pumpEvents = pumpEvents;
        this.exchange_name = exchangeName;
        this.ticker_speed = tickerSpeed;
        this.cycle_time = cycleTime;
        this._code = code;
        this._skipVolumes = skipVolumes;
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

    /*
        Override when necessary
    */
    volume_for(pair) {
        return 'BTC'
    }


}

module.exports = AbstractExchange;