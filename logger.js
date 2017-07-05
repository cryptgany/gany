var DateTime = require('node-datetime');

function Logger(market) {
  this.market = market;
}

Logger.prototype.log = function(str) {
  var time = DateTime.create()._now;
  console.log("[" + time + "] [" + this.market + "] " + str);
}

module.exports = Logger;
