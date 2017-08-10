var DateTime = require('node-datetime');

const FileSystem = require('fs');
const Util = require('util');

function Logger() {
}

Logger.prototype.log = function(type, str) {
  var time = DateTime.create()._now;
  message = "[" + time + "] " + str
  if (type == "error") { console.error(message) } else { console.log(message) }
}

module.exports = Logger;
