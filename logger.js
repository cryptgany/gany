require('./protofunctions.js');
var DateTime = require('node-datetime');

const GanyTheBot = require('./gany_the_bot');
const FileSystem = require('fs');
const Util = require('util');

function Logger(bot_enabled = true, test_mode = false) {
  this.start = DateTime.create()._now;
  this.log_file = FileSystem.createWriteStream(__dirname + '/log/debug_' + this.start.toFileName() + '.log', {flags : 'w'});
  console.log("Logfile is " + 'debug_' + this.start.toFileName());
  this.bot_enabled = bot_enabled;
  this.test_mode = test_mode;
  if (this.bot_enabled) {
    this.gany_the_bot = new GanyTheBot();
    this.gany_the_bot.start();
  }
}

Logger.prototype.log = function(name, str) {
  var time = DateTime.create()._now;
  if (this.bot_enabled) {
    if (this.test_mode) {
      this.gany_the_bot.broadcast(name + " [TEST]: " + str);
    } else {
      this.gany_the_bot.broadcast(name + ": " + str);
    }
  }
  console.log("[" + time + "] [" + name + "] " + str);
}

Logger.prototype.log_to_file = function(str) {
  this.log_file.write(Util.format(str) + '\n');
};

module.exports = Logger;
