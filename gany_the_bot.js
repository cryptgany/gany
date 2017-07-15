// Will analyze the market
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

function GanyTheBot() {
  this.chats = [];
  this.vip_chats = [];
  this.chats.push(parseInt(process.env.WARNINGS_GROUP)); // disable for testing
  this.vip_chats.push(parseInt(process.env.PERSONAL_CHANNEL)); // by default subscribe to my personal account
  this.vip_chats.push(parseInt(process.env.OTHER_CHANNEL)); // by default subscribe to my personal account
  this.token = process.env.GANY_KEY;
  this.listeners = []

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
  self.telegram_bot.onText(/\/detektor/, (msg, match) => {
    if (this.vip_chats.includes(msg.chat.id)) // only process vip chat requests
      this.listeners.forEach((listener) => { listener(msg, (response) => { this.telegram_bot.sendMessage(msg.chat.id, response) }) })
  })
}

GanyTheBot.prototype.listen = function(callback) {
  this.listeners.push(callback)
}

GanyTheBot.prototype.broadcast = function(text, vip_only = false) {
  self = this;
  chats_for_broadcast = vip_only ? self.vip_chats : self.chats;
  chats_for_broadcast.forEach(function(chat_id) {
    self.telegram_bot.sendMessage(chat_id, text, {parse_mode: "Markdown"}).catch((error) => {
      console.log(error.code);  // => 'ETELEGRAM'
      console.log(error.response.body); // => { ok: false, error_code: 400, description: 'Bad Request: chat not found' }
    });
  });
}

module.exports = GanyTheBot;
