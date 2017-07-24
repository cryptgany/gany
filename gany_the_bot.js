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
  this.allowed_chats.push(parseInt(process.env.CARLOSG_CHANNEL)); // Carlos G Designer
  this.vip_chats.push(parseInt(process.env.PERSONAL_CHANNEL));
  this.token = process.env.GANY_KEY;
  this.listeners = []
  this.subscriber = new Subscriber()
  this.subscribers = []
  this.detektor = undefined
  this.subscriber.all((err, data) => {
    this.subscribers = data
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

  this.telegram_bot.onText(/\/configure/, (msg, match) => {
    if (this.is_allowed(msg.chat.id)) // only process vip chat requests
      this.telegram_bot.sendMessage(msg.chat.id, "Configuration menu:", this.configuration_menu_options()).catch((error) => {
        console.log(error.code);  // => 'ETELEGRAM'
        console.log(error.response); // => { ok: false, error_code: 400, description: 'Bad Request: chat not found' }
      });
  })

  this.telegram_bot.on('callback_query', (msg) => {
    if (this.is_vip(msg.from.id)) {
      if (msg.data.match(/options/)) {
        exchange_market_code = msg.data.split(" ")[1]
        this.telegram_bot.sendMessage(msg.from.id, "Options for " + exchange_market_code + ":", this.vip_buy_options(exchange_market_code)).catch((error) => {
          console.log(error.code);  // => 'ETELEGRAM'
          console.log(error.response); // => { ok: false, error_code: 400, description: 'Bad Request: chat not found' }
        });
        this.telegram_bot.answerCallbackQuery(msg.id, 'View options below.');
      }
      if (msg.data.match(/detektor/)) { // process request of buy/sell
        this.detektor.process_telegram_request({text: "/detektor " + msg.data, id: msg.from.id}, (response) => { this.telegram_bot.sendMessage(msg.from.id, response) })
        this.telegram_bot.answerCallbackQuery(msg.id, 'Request processed.');
      }
    }
    if (msg.data == "configure") {
      if (this.is_allowed(msg.from.id)) // only process vip chat requests
        this.telegram_bot.sendMessage(msg.from.id, "Configuration menu:", this.configuration_menu_options()).catch((error) => {
          console.log(error.code);  // => 'ETELEGRAM'
          console.log(error.response); // => { ok: false, error_code: 400, description: 'Bad Request: chat not found' }
        });
    }
    if (msg.data == "configure exchanges" && this.is_allowed(msg.from.id)) {
      this.telegram_bot.sendMessage(msg.from.id, "Configure Exchanges:", this.configuration_menu_exchanges()).catch((error) => {
        console.log(error.code);  // => 'ETELEGRAM'
        console.log(error.response); // => { ok: false, error_code: 400, description: 'Bad Request: chat not found' }
      });
    }
    if (msg.data.match(/configure exchange\ /) && this.is_allowed(msg.from.id)) {
      commands = msg.data.split(" ")
      if (commands.length == 3) { // show exchange options
        this.telegram_bot.sendMessage(msg.from.id, "Configure " + commands[2] + ":", this.configuration_menu_enable_disable("configure exchange " + commands[2])).catch((error) => {
          console.log(error.code);  // => 'ETELEGRAM'
          console.log(error.response); // => { ok: false, error_code: 400, description: 'Bad Request: chat not found' }
        });
      }
      if (commands.length == 4) { // was enabled/disabled, show exchanges
        this.telegram_bot.answerCallbackQuery(msg.id, 'Exchange ' + commands[2] + " " + commands[3]);
        this.telegram_bot.sendMessage(msg.from.id, "Configure Exchanges:", this.configuration_menu_exchanges()).catch((error) => {
          console.log(error.code);  // => 'ETELEGRAM'
          console.log(error.response); // => { ok: false, error_code: 400, description: 'Bad Request: chat not found' }
        });
      }
    }
  });
}

GanyTheBot.prototype.process = function(msg, responder) {
  text = msg.text; chat_id = msg.chat.id;
  if (text) {
    if (text.match(/\/start/)) {
      if (this.is_allowed(chat_id)) {
        responder('Hello ' + msg.from.first_name + '. My name is CryptGany, the Technical Analysis bot. I will help you setup your configuration so you get the best of me.')
        responder('First of all, you want to start with /subscribe to start getting your signals.')
      } else {
        console.log("Received /start from unallowed id", msg.from.id)
        responder('Hello ' + msg.from.first_name + '. My name is CryptGany, the Technical Analysis bot.')
        responder("Sorry I am currently unavailable whilst developments are ongoing.")
        responder("Website www.cryptowarnings.com will be available next month.")
        responder("Full Release expected end of August.")
        responder("For further updates and discussion please see https://t.me/joinchat/A-5g1A5VXWFyN6llqtDzdw")
      }
    }
    if (this.is_allowed(chat_id)) {
      if (text.match(/\/subscribe/)) {
        this.subscriber.user_is_subscribed(chat_id, (err, data) => {
          if (data.length >= 1) {
            responder('You are already subscribed.')
          } else {
            this.subscriber.subscribe_user(chat_id, (data) => {
              console.log(data)
              if (data.result.ok == 1) {
                this.subscribers.push(chat_id)
                responder('You are now subscribed! You will start getting notifications soon. Please be patient and wait.')
              } else {
                responder('Could not subscribe, please contact @frooks, your id is ' + chat_id)
              }
            })
          }
        });
      }
      if (text.match(/\/all/)) {
        responder(this.subscribers.map((sub) => { return sub.id}).join(", ") || "No users subscribed")
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
}

GanyTheBot.prototype.send_signal = function(client, signal) {
  text = this.telegram_post(client, signal)
  console.log(text)
  this.subscribers.forEach((sub) => {
    this.telegram_bot.sendMessage(sub.id, text, this.options(client, signal, sub.id)).catch((error) => {
      console.log(error.code);  // => 'ETELEGRAM'
      console.log(error.response); // => { ok: false, error_code: 400, description: 'Bad Request: chat not found' }
    });
  });
}

GanyTheBot.prototype.show_open_orders = function(subscriber_id, opened_orders) {
  text = opened_orders.length + " opened orders at the moment.\n" + opened_orders.map((order) => { return order.message }).join("\n")
  options = opened_orders.length == 0 ? {} : this.sell_order_options(opened_orders)
  this.telegram_bot.sendMessage(subscriber_id, text, options).catch((error) => {
    console.log(error.code);  // => 'ETELEGRAM'
    console.log(error.response); // => { ok: false, error_code: 400, description: 'Bad Request: chat not found' }
  });
}

GanyTheBot.prototype.telegram_post = function(client, signal) {
  diff = signal.last_ticker.volume - signal.first_ticker.volume
  message = "[" + client.exchange_name + " - " + signal.market + "](" + client.market_url(signal.market) + ")"
  message += "\nVol. up by *" + diff.toFixed(2) + "* BTC since *" + this._seconds_to_minutes(signal.time) + "*"
  message += "\nVolume: " + signal.last_ticker.volume.toFixed(4) + " (*" + ((signal.change - 1) * 100).toFixed(2) + "%*)"
  message += "\nB: " + signal.first_ticker.bid.toFixed(8) + " " + this.telegram_arrow(signal.first_ticker.bid, signal.last_ticker.bid) + " " + signal.last_ticker.bid.toFixed(8)
  message += "\nA: " + signal.first_ticker.ask.toFixed(8) + " " + this.telegram_arrow(signal.first_ticker.ask, signal.last_ticker.ask) + " " + signal.last_ticker.ask.toFixed(8)
  message += "\nL: " + signal.first_ticker.last.toFixed(8) + " " + this.telegram_arrow(signal.first_ticker.last, signal.last_ticker.last) + " " + signal.last_ticker.last.toFixed(8)
  message += "\n24h Low: " + signal.last_ticker.low.toFixed(8) + "\n24h High: " + signal.last_ticker.high.toFixed(8)
  return message
}

GanyTheBot.prototype.options = function(client, signal, subscriber_id) {
  if (this.is_vip(subscriber_id)) { return this.vip_options(client, signal) }
  else { return { parse_mode: "Markdown" } }
}

GanyTheBot.prototype.vip_options = function(client, signal) {
  return {
    parse_mode: "Markdown",
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [{ text: 'Options', callback_data: 'options ' + client.code + "/" + signal.market }],
      ]
    })
  };
}

GanyTheBot.prototype.sell_order_options = function(opened_orders) {
  return {
    reply_markup: JSON.stringify({
      inline_keyboard: opened_orders.map((order) => { return [{text: "SELL: " + order.pump.exchange + "/" + order.pump.market, callback_data: "sell " + order.pump.exchange + "/" + order.pump.market}] })
    })
  };
}

GanyTheBot.prototype.vip_buy_options = function(exchange_market_code) {
  return {
    parse_mode: "Markdown",
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [{ text: 'See price', callback_data: ('see ' + exchange_market_code) }],
        [{ text: 'Buy 0.001 BTC', callback_data: ('buy ' + exchange_market_code + " 0.001") }],
        [{ text: 'Buy 0.01 BTC', callback_data: ('buy ' + exchange_market_code + " 0.01") }]
      ]
    })
  };
}

GanyTheBot.prototype.configuration_menu_options = function() {
  return {
    parse_mode: "Markdown",
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [{ text: 'Configure Exchanges', callback_data: 'configure exchanges' }, { text: 'Configure Subscription', callback_data: 'configure subscription' }],
      ]
    })
  };
}

GanyTheBot.prototype.configuration_menu_exchanges = function() {
  return {
    parse_mode: "Markdown",
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [{ text: 'Bittrex', callback_data: 'configure exchange Bittrex' }, { text: 'Poloniex', callback_data: 'configure exchange Poloniex' }],
        [{ text: 'Yobit', callback_data: 'configure exchange Yobit' }, { text: 'Cryptopia', callback_data: 'configure exchange Cryptopia' }],
        [{ text: 'Go Back', callback_data: 'configure' }]
      ]
    })
  };
}

GanyTheBot.prototype.configuration_menu_enable_disable = function(menu_str) {
  return {
    parse_mode: "Markdown",
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [{ text: 'Enable', callback_data: menu_str + " enable" }, { text: 'Disable', callback_data: menu_str + " disable" }],
      ]
    })
  };
}

GanyTheBot.prototype.telegram_arrow = function(first_val, last_val) {
  if (first_val < last_val) return '\u2197'
  if (first_val > last_val) return '\u2198'
  return "\u27A1"
}

GanyTheBot.prototype._seconds_to_minutes = function(seconds) {
  var minutes = Math.floor(seconds / 60);
  var seconds = seconds - minutes * 60;
  return minutes == 0 ? (seconds + " seconds") : minutes + (minutes > 1 ? " minutes" : " minute")
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
  chats_for_broadcast = vip_only ? this.vip_chats : this.subscribers.map((sub) => { return sub.id });
  chats_for_broadcast.forEach((chat_id) => {
    this.telegram_bot.sendMessage(chat_id, text, {parse_mode: "Markdown"}).catch((error) => {
      console.log(error.code);  // => 'ETELEGRAM'
      console.log(error.response); // => { ok: false, error_code: 400, description: 'Bad Request: chat not found' }
    });
  });
}

module.exports = GanyTheBot;
