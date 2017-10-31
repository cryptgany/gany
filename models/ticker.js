// Stores data for each minute. Should be cleaned for 30+ days old data
var redis = require('redis');

if (process.env.REDISCLOUD_URL) { // production environment detected
    var rtg   = require("url").parse(process.env.REDISCLOUD_URL);
    var client = require("redis").createClient(rtg.port, rtg.hostname);
    client.auth(rtg.auth.split(":")[1]);
} else {
    var client = require("redis").createClient();
}

class Ticker {
    static client(){
        return client
    }
    static store(exchange, market, data) {
        client.lpush([exchange+'.'+market, JSON.stringify(data)], function(err, reply) { });
    }

    static getOne(exchange, market, number, callback) {
        this.getRange(exchange, market, number, number, (err, reply) => { callback(err, reply[0])})
    }

    static getRange(exchange, market, from = 0, to = 0, callback) {
        client.lrange(exchange+'.'+market, from, to, function(err, reply) { callback(err, reply.map((e) => { return JSON.parse(e) })) })
    }

    static getExchangeMarkets(callback) {
        client.keys('*', callback)
    }
    static getHighLowResume(data) { // data = any ticker ary from any exchange with high/low data, returns OHLC
        return new Promise((resolve, reject) => {
            try {
                let high = 0
                let low = data[0]
                data.forEach((d) => {
                    if (d > high)
                        high = d
                    if (d < low)
                        low = d
                })

                resolve({open: data[0], high: high, low: low, close: data[data.length-1]})
            } catch (e) { reject(e) }
        })
    }
}

module.exports = Ticker;
