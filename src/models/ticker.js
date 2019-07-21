// Stores data for each minute. Should be cleaned for 30+ days old data
var redis = require('redis');
var client = undefined;
if (process.env.REDISCLOUD_URL) { // heroku staging
    var rtg   = require("url").parse(process.env.REDISCLOUD_URL);
    var client = require("redis").createClient(rtg.port, rtg.hostname);
    client.auth(rtg.auth.split(":")[1]);
} else {
    if (process.env.REDIS_URL) { // production environment detected
        var client = require("redis").createClient(process.env.REDIS_URL);
    } else {
        var client = require("redis").createClient();
    }
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
}

module.exports = Ticker;
