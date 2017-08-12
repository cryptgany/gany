'use strict';
/*
     This is the base class all exchange integration must extend from
     let's take advantage of OOP to accomplish DRY (Do Not Repeat Your self).

     @author Rafael Cadenas
     @date 08/12/2017
*/
class AbstractExchange {

    /* minimun attributes */
    constructor(exchangeName, ticketSpeed, cycleTime){
        this._exchangeName = exchangeName;
        this._ticketSpeed = ticketSpeed;
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