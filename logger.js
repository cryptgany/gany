var DateTime = require('node-datetime');

const FileSystem = require('fs');
const Util = require('util');

function Logger() {
}

Logger.prototype.log = function(...args) {
  console.log(this._timestamp(), ...args)
}

Logger.prototype.error = function(...args) {
  console.error(this._timestamp(), ...args)
}

Logger.prototype._timestamp = function() { return "[" + DateTime.create()._now + "]" }

module.exports = Logger;
