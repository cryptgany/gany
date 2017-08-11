// Will analyze the market
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const Subscriber = require('./models/subscriber');
const _ = require('underscore')

function GanyTheBot(logger) {
  this.logger = logger
  this.vip_chats = [];
  this.vip_chats.push(parseInt(process.env.PERSONAL_CHANNEL));
  if (process.env.ENVIRONMENT == 'production')
    this.vip_chats.push(parseInt(process.env.ADAM_CHANNEL));
  this.token = process.env.GANY_KEY;
  this.subscribers = []
  this.detektor = undefined
  Subscriber.find({}, (err, subscribers) => {
    if (err)
      this.logger.error("Could not get subscribers! fatal error", err)
    this.subscribers = subscribers
  })
  this.telegram_bot = new TelegramBot(this.token, {polling: true});
}

GanyTheBot.prototype.start = function() {

  // ***************** //
  // MESSAGE CALLBACKS //
  // ***************** //
  this.telegram_bot.onText(/\/start/, (msg, match) => {
    if (this.max_subscribers_reached()) {
      console.log("Received /start but maximum users reached", msg.from.id)
      message = 'Hello ' + msg.from.first_name + '. My name is CryptGany, the Technical Analysis bot.'
      message += "\nSorry I am currently unavailable whilst developments are ongoing."
      message += "\nWebsite www.cryptowise.net will be available soon."
      message += "\nFull release expected end of August."
      message += "\nFor further updates and discussion please see https://t.me/CryptoWarnings"
    } else {
      message = 'Hello ' + msg.from.first_name + '. My name is CryptGany, the Technical Analysis bot.'
      message += '\nI will help you setup your configuration so you get the best of me.'
      message += '\nFirst of all, you want to start with /subscribe to start getting notifications.'
    }
    this.send_message(msg.chat.id, message)
  })

  this.telegram_bot.onText(/\/subscribe/, (msg, match) => {
    if (this.is_subscribed(msg.chat.id)) {
      this.send_message(msg.chat.id, 'You are already subscribed.')
    } else {
      if (this.max_subscribers_reached()) {
        this.send_message(msg.chat.id, "We are sorry but we can't accept more people by now. Keep updated on our group https://t.me/CryptoWarnings")
      } else {
        this.subscribe_user(msg.chat.id, (err, subscriber) => {
          if (err) {
            this.send_message(msg.chat.id, 'Could not subscribe, please contact @frooks, your id is ' + msg.chat.id)
          } else {
            this.subscribers.push(subscriber)
            this.send_message(msg.chat.id, 'You are now subscribed! You will start getting notifications soon. Please be patient and wait.\nYou can also configure exchanges on /configure')
          }
        })
      }
    }
  })

  this.telegram_bot.onText(/\/subscription/, (msg, match) => {
    if (this.is_subscribed(msg.chat.id)) {
      subscriber = this.find_subscriber(msg.chat.id)
      if (subscriber.subscription_status) { // subscription updated
        message = "You are subscribed."
        message += "\nYour subscription expires on " + subscriber.subscription_expires_on
        message += "\nYou can send your monthly fee before the expiration date, so you can keep receiving the service without interruptions."
      } else { // not subscribed
        message = "You are not subscribed."
        message += "\nYou must send 0.01 BTC to address " + subscriber.btc_address + " to start receiving notifications."
        message += "\nIf you already did, you will start receiving our notifications as soon as we confirm the transaction."
      }
      this.send_message(subscriber.telegram_id, message)
    }
  })

  this.telegram_bot.onText(/\/configure/, (msg, match) => {
    if (this.is_subscribed(msg.chat.id)) // only process vip chat requests
      this.send_message(msg.chat.id, "Configuration menu:", this.configuration_menu_options())
  })

  this.telegram_bot.onText(/\/pay/, (msg, match) => {
    if (this.is_subscribed(msg.chat.id)) {
      subscriber = this.find_subscriber(msg.chat.id)
      options = { parse_mode: "Markdown" }
      if (subscriber.btc_address) {
        message = "Your BTC address for subscription payments is *" + subscriber.btc_address + "*"
        message += "\nYou should deposit 0.01 BTC monthly in order to receive our awesome notifications."
        message += "\nThis address will not change, you can keep using it for your monthly subscription."
        message += "\nThis is only intended for usage of the bot, you can not withdraw any money sent to this address."
        message += "\n*You will start receiving signals as soon as we get 3 confirmations of your payment*"
        message += "\nYou can check your current subscription on /subscription"
        this.send_message(subscriber.telegram_id, message, options)
      } else {
        subscriber.generate_btc_address().then((address) => {
          message = "Your BTC address for subscription payments is *" + address + "*"
          message += "\nYou should deposit 0.01 BTC monthly in order to receive our awesome notifications."
          message += "\nThis address will not change, you can keep using it for your monthly subscription."
          message += "\nThis is only intended for usage of the bot, you can not withdraw any money sent to this address."
          message += "\n*You will start receiving signals as soon as we get 3 confirmations of your payment*"
          message += "\nYou can check your current subscription on /subscription"
          this.send_message(subscriber.telegram_id, message, options)
        }).catch((e) => { this.logger.error("Error trying to generate btc address", e) })
      }
    }
  })

  this.telegram_bot.onText(/\/see/, (msg, match) => {
    market = msg.text.toUpperCase().replace(/\/SEE\ /, '')
    markets = this.detektor.get_market_data(market)
    if (markets.length == 0)
      message = "Not found."
    if (markets.length > 5)
      message = "Too many markets found"
    if (markets.length > 0 && markets.length < 5)
      message = markets.map((market_info) => {
        return this.telegram_post_price_check(market_info.exchange, market_info.market, market_info.ticker)
      }).join("\n\n")
    this.send_message(msg.chat.id, message)
  })

  this.telegram_bot.onText(/\/detektor/, (msg, match) => {
    command = msg.text
    if (this.is_vip(msg.chat.id)){ // only process vip chat requests
      console.log("Receiving request from VIP", msg.chat.id, "'" + msg.text + "'")
      if (command == '/detektor store snapshot') {
        this.detektor.store_snapshot()
        this.send_message(msg.chat.id, "Snapshot stored.")
      }
      if (command.match(/\/detektor see/)) {
        pair = command.replace(/\/detektor see\ /, '').split(" ")
        exchange = pair[0]; market = pair[1]
        ticker_info = this.detektor.tickers[exchange][market]
        message = this.telegram_post_price_check(exchange, market, ticker_info)
        this.send_message(msg.chat.id, message)
      }
    }
  })

  this.telegram_bot.onText(/\/sendmessage/, (msg, match) => {
    if (this.is_vip(msg.chat.id))
      this.broadcast(msg.text.replace(/\/sendmessage\ /, ''))
  })

  // ************** //
  // CALLBACK QUERY //
  // ************** //
  this.telegram_bot.on('callback_query', (msg) => {
    if (this.is_subscribed(msg.from.id)) {
      if (msg.data == "configure")
        this.send_message(msg.from.id, "Configuration menu:", this.configuration_menu_options())
      if (msg.data == "configure exchanges")
        this.send_message(msg.from.id, "Configure Exchanges:", this.configuration_menu_exchanges())
      if (msg.data.match(/configure exchange\ /)) {
        commands = msg.data.split(" ")
        if (commands.length == 3) { // show exchange options
          exchange_status = this.find_subscriber(msg.from.id).exchange_status(commands[2]) ? "enabled" : "disabled"
          this.send_message(msg.from.id, "Configure " + commands[2] + " (currently " + exchange_status + "):", this.configuration_menu_enable_disable("configure exchange " + commands[2]))
        }
        if (commands.length == 4) { // was enabled/disabled, show exchanges
          this.telegram_bot.answerCallbackQuery(msg.id, 'Exchange ' + commands[2] + " " + commands[3]);
          _.find(this.subscribers, (s) => {return s.telegram_id == msg.from.id}).change_exchange_status(commands[2], commands[3])
          this.send_message(msg.from.id, "Configure Exchanges:", this.configuration_menu_exchanges())
        }
      }
    }
  });
}

GanyTheBot.prototype.send_message = function(chat_id, message, options = { parse_mode: "Markdown", disable_web_page_preview: true }) {
  this.telegram_bot.sendMessage(chat_id, message, options).catch((error) => {
    console.log(error.code);  // => 'ETELEGRAM'
    console.log(error.response); // => { ok: false, error_code: 400, description: 'Bad Request: chat not found' }
  });
}

GanyTheBot.prototype.notify_user_got_confirmed = function(subscriber) {
  message = "Your payment got processed!"
  message += "\nYou will start receiving notifications from now on."
  message += "\nYou can check your subscription status on /subscription"
  this.send_message(subscriber.telegram_id, message)
}

GanyTheBot.prototype.send_signal = function(client, signal) {
  text = this.telegram_post_signal(client, signal)
  this.logger.log(text)
  this.subscribers.filter((sub) => { return sub.exchanges[signal.exchange] }).forEach((sub) => {
    this.send_message(sub.telegram_id, text)
  });
}

GanyTheBot.prototype.telegram_post_signal = function(client, signal) {
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

GanyTheBot.prototype.telegram_post_price_check = function(exchange, market, ticker_info) {
  message = "[" + exchange + " - " + market + "](" + this.detektor.market_url(exchange, market) + ")"
  message += "\nB: " + ticker_info.bid.toFixed(8)
  message += "\nA: " + ticker_info.ask.toFixed(8)
  message += "\nL: " + ticker_info.last.toFixed(8)
  message += "\nVolume: " + ticker_info.volume.toFixed(4) + " BTC"
  message += "\n24h Low: " + ticker_info.low.toFixed(8)
  message += "\n24h High: " + ticker_info.high.toFixed(8)
  return message
}

GanyTheBot.prototype.max_subscribers_reached = function() {
  return this.subscribers.length >= 100 // max number of subscribers at the moment
}

GanyTheBot.prototype.find_subscriber = function(telegram_id) {
  return _.find(this.subscribers, (sub) => { return sub.telegram_id == telegram_id } )
}

GanyTheBot.prototype.is_subscribed = function(telegram_id) {
  return this.find_subscriber(telegram_id)
}

GanyTheBot.prototype.subscribe_user = function(telegram_id, callback) {
  sub = new Subscriber({telegram_id: telegram_id})
  sub.save((err) => {
    callback(err, sub)
  })
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
        [{ text: 'Enable', callback_data: menu_str + " enabled" }, { text: 'Disable', callback_data: menu_str + " disabled" }],
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

GanyTheBot.prototype.is_vip = function(subscriber_id) {
  return this.vip_chats.includes(subscriber_id)
}

GanyTheBot.prototype.broadcast = function(text, vip_only = false) {
  chats_for_broadcast = vip_only ? this.vip_chats : this.subscribers.map((sub) => { return sub.telegram_id });
  chats_for_broadcast.forEach((chat_id) => {
    this.send_message(chat_id, text)
  });
}

module.exports = GanyTheBot;
