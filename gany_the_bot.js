// Will analyze the market
require('dotenv').config();
var bittrex = require('node.bittrex.api');
const TelegramBot = require('node-telegram-bot-api');

function GanyTheBot() {
  this.chats = [];
  // this.chats.push(parseInt(process.env.WARNINGS_GROUP)); // disable for testing
  this.chats.push(parseInt(process.env.PERSONAL_CHANNEL)); // by default subscribe to my personal account
  // this.chats.push(parseInt(process.env.OTHER_CHANNEL)); // by default subscribe to my personal account
  this.token = process.env.GANY_KEY;

  this.telegram_bot = new TelegramBot(this.token, {polling: true});
}

GanyTheBot.prototype.start = function() {
  self = this;
  self.telegram_bot.onText(/\/dudeimking/, (msg, match) => {
    // Subscribers
    const chatId = msg.chat.id;
    const resp = match[1]; // the captured "whatever"
    if (self.chats.includes(msg.chat.id)) {
      self.telegram_bot.sendMessage(chatId, "You are already subscribed");
    } else {
      console.log("Subscribed " + chatId);
      self.chats.push(chatId);
      self.telegram_bot.sendMessage(chatId, "Hello stranger. " + chatId + " subscribed.");
    }
  });
}

GanyTheBot.prototype.broadcast = function(text) {
  self = this;
  self.chats.forEach(function(chat_id) {
    self.telegram_bot.sendMessage(chat_id, text).catch((error) => {
      console.log(error.code);  // => 'ETELEGRAM'
      console.log(error.response.body); // => { ok: false, error_code: 400, description: 'Bad Request: chat not found' }
    });
  });
}

module.exports = GanyTheBot;
