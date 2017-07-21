// Will analyze the market
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

function GanyTheBot() {
  this.chats = [];
  this.vip_chats = [];
  this.vip_chats.push(parseInt(process.env.PERSONAL_CHANNEL)); // by default subscribe to my personal account
  // this.vip_chats.push(parseInt(process.env.OTHER_CHANNEL)); // by default subscribe to my personal account
  this.token = process.env.GANY_KEY;
  this.listeners = []

  this.telegram_bot = new TelegramBot(this.token, {polling: true});
}

GanyTheBot.prototype.start = function() {
  this.telegram_bot.onText(/\/subscribenowz/, (msg, match) => {
    // Subscribers
    const chatId = msg.chat.id;
    const resp = match[1]; // the captured "whatever"
    if (this.chats.includes(msg.chat.id)) {
      this.telegram_bot.sendMessage(chatId, "You are already subscribed");
    } else {
      console.log("Subscribed " + chatId);
      this.chats.push(chatId);
      this.telegram_bot.sendMessage(chatId, "Hello stranger. " + chatId + " subscribed.");
    }
  });
  this.telegram_bot.on('message', (msg) => {
    this.process(msg, (response) => { this.telegram_bot.sendMessage(msg.chat.id, response) })
  });

  this.telegram_bot.onText(/\/detektor/, (msg, match) => {
    if (this.vip_chats.includes(msg.chat.id)) // only process vip chat requests
      this.listeners.forEach((listener) => { listener(msg, (response) => { this.telegram_bot.sendMessage(msg.chat.id, response) }) })
  })
}

GanyTheBot.prototype.process = function(msg, responder) {
  text = msg.text; chat_id = msg.chat.id;
  if (text.match(/\/start/)) {
    responder('Hello ' + msg.from.first_name + '. My name is CryptGany, the Technical Analysis bot. I will help you setup your configuration so you get the best of me.')
    responder('First of all, you want to start with /subscribe to start getting your signals.')
  }
  if (text.match(/\/subscribe/)) {
    if (this.is_vip(chat_id)) {
      responder('You are now subscribed!')
    } else {
      responder('Sorry, by now only developers and certain users have access.')
    }
  }
}

GanyTheBot.prototype.is_vip = function(subscriber_id) {
  return this.vip_chats.includes(subscriber_id)
}

GanyTheBot.prototype.listen = function(callback) {
  this.listeners.push(callback)
}

GanyTheBot.prototype.broadcast = function(text, vip_only = false) {
  chats_for_broadcast = vip_only ? this.vip_chats : this.chats;
  chats_for_broadcast.forEach((chat_id) => {
    this.telegram_bot.sendMessage(chat_id, text, {parse_mode: "Markdown"}).catch((error) => {
      console.log(error.code);  // => 'ETELEGRAM'
      console.log(error.response.body); // => { ok: false, error_code: 400, description: 'Bad Request: chat not found' }
    });
  });
}

module.exports = GanyTheBot;
