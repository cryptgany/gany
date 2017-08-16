'use strict';
/*
     This is the base class all exchange integration must extend from
     let's take advantage of OOP to accomplish DRY (Do Not Repeat Your self).

     @author Rafael Cadenas
     @date 08/12/2017
*/
class AbstractExchange {

    /* minimun attributes */
    constructor(logger, pumpEvents, exchangeName, tickerSpeed, cycleTime){
        this._logger = logger;
        this._pumpEvents = pumpEvents;
        this._exchangeName = exchangeName;
        this._tickerSpeed = tickerSpeed;
        this._cycleTime = cycleTime;
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


}

module.exports = AbstractExchange;