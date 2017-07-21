// Will analyze the market
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const Subscriber = require('./subscriber');

function GanyTheBot() {
  this.vip_chats = [];
  this.allowed_chats = [];
  this.allowed_chats.push(parseInt(process.env.PERSONAL_CHANNEL)) // my telegram
  this.allowed_chats.push(parseInt(process.env.OTHER_CHANNEL)); // naj
  this.allowed_chats.push(parseInt(process.env.ADAM_CHANNEL)); // adam
  this.vip_chats.push(parseInt(process.env.PERSONAL_CHANNEL));
  this.vip_chats.push(parseInt(process.env.OTHER_CHANNEL));
  this.token = process.env.GANY_KEY;
  this.listeners = []
  this.subscriber = new Subscriber()
  this.chats = []
  this.subscriber.all((err, data) => {
    this.chats = data.map((rec) => { return rec.id })
  })

  this.telegram_bot = new TelegramBot(this.token, {polling: true});
}

GanyTheBot.prototype.start = function() {
  this.telegram_bot.on('message', (msg) => {
    this.process(msg, (response) => { this.telegram_bot.sendMessage(msg.chat.id, response) })
  });

  this.telegram_bot.onText(/\/detektor/, (msg, match) => {
    if (this.is_vip(msg.chat.id)) // only process vip chat requests
      this.listeners.forEach((listener) => { listener(msg, (response) => { this.telegram_bot.sendMessage(msg.chat.id, response) }) })
  })
}

GanyTheBot.prototype.process = function(msg, responder) {
  text = msg.text; chat_id = msg.chat.id;
  if (text.match(/\/start/)) {
    if (this.is_allowed(chat_id)) {
      responder('Hello ' + msg.from.first_name + '. My name is CryptGany, the Technical Analysis bot. I will help you setup your configuration so you get the best of me.')
      responder('First of all, you want to start with /subscribe to start getting your signals.')
    } else {
      responder('Hello ' + msg.from.first_name + '. My name is CryptGany, the Technical Analysis bot.')
      responder("I am terribly sorry but people is still working on me so I'm not available :(.")
    }
  }
  if (this.is_allowed(chat_id)) {
    if (text.match(/\/subscribe/)) {
      this.subscriber.user_is_subscribed(chat_id, (err, data) => {
        if (data.length >= 1) {
          responder('You are already subscribed.')
        } else {
          this.subscriber.subscribe_user(chat_id, (data) => {
            if (data.result.ok == 1) {
              this.chats.push(chat_id)
              responder('You are now subscribed! You will start getting notifications soon. Please be patient and wait.')
            } else {
              responder('Could not subscriber, please contact @frooks, your id is ' + chat_id)
            }
          })
        }
      });
    }
    if (text.match(/\/all/)) {
      responder(this.chats.join(", ") || "No users subscribed")
    }
  }

  if (this.is_vip(chat_id)) {
    if (text.match(/\/sendmessage/)) {
      this.broadcast(text.replace(/\/sendmessage\ /, ''))
    }
    if (text.match(/\/delete/)) {
      this.subscriber.delete_data({}, (err, resp) => { responder('Data deleted.') })
    }
    if (text.match(/\/test/)) {
      this.broadcast("This is a test to all subscribers")
    }
  }
}

GanyTheBot.prototype.is_allowed = function(subscriber_id) {
  return this.allowed_chats.includes(subscriber_id)
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
