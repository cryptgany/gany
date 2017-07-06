var DateTime = require('node-datetime');

const GanyTheBot = require('./gany_the_bot');

function Logger(market) {
  this.market = market;
  this.gany_the_bot = new GanyTheBot();
}

Logger.prototype.log = function(str) {
  var time = DateTime.create()._now;
  this.gany_the_bot.broadcast(str);
  console.log("[" + time + "] [" + this.market + "] " + str);
}

module.exports = Logger;
