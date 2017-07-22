// Handles all the subscription process
const Database = require('./database')

function Signal() {
  this.database = new Database("signals")
}

Signal.prototype.store_signal = function(signal_info, callback) {
  // subscribes an user
  this.database.store_data(signal_info, callback)
}

Signal.prototype.all = function(callback) {
  // returns all signals
  this.database.read_data({}, callback)
}

module.exports = Signal;