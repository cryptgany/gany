// Will analyze the market
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const Subscriber = require('./models/subscriber');
const Signal = require('./models/signal')
const _ = require('underscore')
require('./protofunctions.js')
var moment = require('moment');

CHECK_EXPIRED_USERS = 1 // hours

function GanyTheBot(logger) {
  this.logger = logger
  this.god_users = [parseInt(process.env.PERSONAL_CHANNEL)];
  this.mod_users = []
  if (process.env.ENVIRONMENT == 'production')
    this.mod_users = [parseInt(process.env.ADAM_CHANNEL)]
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
    if (this.is_not_a_group(msg)) {
      message = 'Hello ' + msg.from.first_name + '. I am CryptGany, the Cryptocurrency Trading Analyst Bot.'
      if (this.is_subscribed(msg.chat.id)) {
        if (this.is_paid_subscriber(msg.chat.id)) {
          message += "\nLooks like you are already subscribed as a paid user. Do you need any /help ?"
        } else {
          message += "\nLooks like you are already subscribed as a free user. Do you need any /help ?"
        }
      } else {
        message += '\nI will help you setup your configuration so you can start using me.'
        message += '\nFirst of all, you need to /subscribe to start getting notifications.'
      }
      this.send_message(msg.chat.id, message)
    }
  })

  this.telegram_bot.onText(/\/subscribe/, (msg, match) => {
    if (this.is_not_a_group(msg)) {
      if (this.is_subscribed(msg.chat.id)) {
        if (this.is_blocked(msg.chat.id)) {
          this.unblock_subscriber(msg.chat.id)
          this.send_message(msg.chat.id, 'You will now start receiving notifications again.')
        } else {
          if (this.is_paid_subscriber(msg.chat.id)) {
            this.send_message(msg.chat.id, 'You are already subscribed as a paid user. Do you need /help ?')
          } else {
            this.send_message(msg.chat.id, 'You are already subscribed as a free user. Do you need /help ?')
          }
        }
      } else {
        this.subscribe_user(msg.chat, (err, subscriber) => {
          if (err) {
            this.send_message(msg.chat.id, 'Could not subscribe, please contact @frooks, your id is ' + msg.from.id)
          } else {
            this.subscribers.push(subscriber)
            message = 'You are now subscribed! You will start getting notifications soon. Please be patient, the process should be finalized within 10 minutes.'
            message += '\nYou can also configure exchanges using the command: /configure.'
            message += '\nYou are currently a free user. The full version of CryptGany works with a monthly subscription fee of 0.01 BTC that you can pay using the command /pay.'
            message += "\nOr you can remain as a free user but you will only receive 25% of all of Gany's notifications. You will be able to use the /configure and /see commands."
            message += '\nGany paid version offers customized signal reviews, 100% notifications and will be implementing more features over time.'
            message += '\nIf you have any doubts or comments that you would like to ask, join the discussion group at https://t.me/CryptoWarnings'
            message += '\nYou can also use the /help command for further information'
            this.send_message(msg.chat.id, message)
          }
        })
      }
    }
  })

  this.telegram_bot.onText(/\/subscription/, (msg, match) => {
    if (this.is_not_a_group(msg)) {
      if (this.is_subscribed(msg.chat.id)) {
        subscriber = this.find_subscriber(msg.chat.id)
        if (subscriber.subscription_status) { // subscription updated
          message = "You are a paid user."
          message += "\nYour subscription expires on " + subscriber.subscription_expires_on
          message += "\nYou can send your monthly fee before the expiration date, so you can keep receiving the service without interruptions."
          this.send_message(subscriber.telegram_id, message)
        } else { // not subscribed
          if (subscriber.btc_address) {
            message = "You are a free user."
            message += "\nYou must send 0.01 BTC to address " + subscriber.btc_address + " in order to start using the full service."
            message += "\nIf you already did, you will start receiving our notifications as soon as we confirm the transaction."
            this.send_message(subscriber.telegram_id, message)
          } else {
            subscriber.generate_btc_address().then((address) => {
              message = "You are a free user."
              message += "\nYou must send 0.01 BTC to address " + address + " in order to start using the full service."
              message += "\nIf you already did, you will start receiving our notifications as soon as we confirm the transaction."
              this.send_message(subscriber.telegram_id, message)
            })
          }
        }
      }
    }
  })

  this.telegram_bot.onText(/\/balance/, (msg, match) => {
    if (this.is_subscribed(msg.chat.id)) {
      subscriber = this.find_subscriber(msg.chat.id)
      message = "Your balance is " + (subscriber.total_balance() / 100000000).toFixed(8)
      this.send_message(msg.chat.id, message)
    }
  })

  this.telegram_bot.onText(/\/configure/, (msg, match) => {
    if (this.is_not_a_group(msg)) {
      if (this.is_subscribed(msg.chat.id)) {
        this.send_message(msg.chat.id, "Configuration menu:", this.configuration_menu_options())
      } else {
        this.send_message(msg.chat.id, "You are not subscribed.\nType /subscribe to start receiving notifications and configure the information you see.")
      }
    }
  })

  this.telegram_bot.onText(/\/pay/, (msg, match) => {
    if (this.is_not_a_group(msg)) {
      if (this.is_subscribed(msg.chat.id)) {
        subscriber = this.find_subscriber(msg.chat.id)
        options = { parse_mode: "Markdown" }
        if (subscriber.btc_address) {
          message = "Your BTC address for subscription fee is *" + subscriber.btc_address + "*"
          message += "\nYou have to transfer 0.01 BTC monthly in order to use our full service."
          message += "\nThis address will not change, you can keep using it for your monthly subscription."
          message += "\nThis is only intended for usage of the bot, you can not withdraw any money sent to this address."
          message += "\nYou can check your current subscription on /subscription"
          this.send_message(subscriber.telegram_id, message, options)
        } else {
          subscriber.generate_btc_address().then((address) => {
            message = "Your BTC address for subscription payments is *" + address + "*"
            message += "\nYou have to transfer 0.01 BTC monthly in order to use our full service."
            message += "\nThis address will not change, you can keep using it for your monthly subscription."
            message += "\nThis is only intended for usage of the bot, you can not withdraw any money sent to this address."
            message += "\nYou can check your current subscription on /subscription"
            this.send_message(subscriber.telegram_id, message, options)
          }).catch((e) => { this.logger.error("Error trying to generate btc address", e) })
        }
      }
    }
  })

  // private, personal autotrader
  this.telegram_bot.onText(/\/autotrader/, (msg, match) => {
    if (this.is_god(msg.chat.id)) {
      if (msg.text == '/autotrader status') { this.send_message(msg.chat.id, this.detektor.ticker_autotrader_enabled) }
      if (msg.text == '/autotrader enable') { this.detektor.ticker_autotrader_enabled = true; this.send_message(msg.chat.id, 'Done') }
      if (msg.text == '/autotrader disable') { this.detektor.ticker_autotrader_enabled = false; this.send_message(msg.chat.id, 'Done') }
      if (msg.text == '/autotrader rate') { this.send_message(msg.chat.id, 'Current btc for orders: ' + this.detektor.autotrader_btc_amount) }
      if (msg.text.match(/\/autotrader\ set\ rate/)) {
        this.detektor.autotrader_btc_amount = parseFloat(msg.text.split(" ")[3])
        this.send_message(msg.chat.id, 'Btc for orders changed to: ' + this.detektor.autotrader_btc_amount)
      }
      if (msg.text == '/autotrader profit') {
        if (this.detektor.pumps.length > 0) {
          profit = this.detektor.pumps.map((pmp) => { return pmp.profit }).sum()
        } else {
          profit = 0
        }
        this.send_message(msg.chat.id, profit + " in profits so far.")
      }
      if (msg.text == '/autotrader open orders') {
        count = this.detektor.pumps.filter((pump) => { return !pump.pump_ended }).length
        messages = []
        this.detektor.pumps.filter((pump) => { return !pump.pump_ended }).forEach((pump) => {
          buy_price = pump.buy_order ? pump.buy_order.price_per_unit : pump.buy_rate
          current_price = this.detektor.tickers[pump.exchange][pump.market].ask
          message = pump.exchange + "/" + pump.market + "(" + pump.buy_order.quantity + ") [IN:" + buy_price.toFixed(8) + "][NOW:" + current_price.toFixed(8) + "] (" + (((current_price / buy_price) - 1) * 100).toFixed(2) + "%)"
          messages.push(message)
        })
        this.send_message(msg.chat.id, count + " opened orders at the moment.\n" + messages.join("\n"))
      }
      if (msg.text == '/autotrader closed orders') {
        count = this.detektor.pumps.filter((pump) => { return pump.pump_ended }).length
        this.send_message(msg.chat.id, count + " closed orders at the moment.")
      }
    }
  })

  this.telegram_bot.onText(/\/see/i, (msg, match) => {
    if (!msg.text.match(/^\/see\ [a-zA-Z0-9]+$/i) && !(msg.text.match(/^\/see\ ([a-zA-Z0-9]{1,6})\ \d+$/i)))
      this.send_message(msg.chat.id, 'You need to type the currency you want to see, examples:\n/see neo\n/see eth\n/see usdt\n/see neo 30')
  })

  this.telegram_bot.onText(/^\/see\ [a-zA-Z0-9]+$/i, (msg, match) => { // common users /see
    subscriber = undefined
    if (this.is_subscribed(msg.chat.id)) {
      subscriber = this.find_subscriber(msg.chat.id)
    }
    market = msg.text.toUpperCase().replace(/\/SEE\ /, '')
    markets = this.detektor.get_market_data(market, subscriber)
    if (markets.length == 0)
      message = "Not found."
    if (markets.length > 5)
      message = "Too many markets found"
    if (markets.length > 0 && markets.length <= 5)
      message = markets.map((market_info) => {
        return this.telegram_post_price_check(market_info.exchange, market_info.market, market_info.ticker)
      }).join("\n\n")
    this.send_message(msg.chat.id, message)
  })

  this.telegram_bot.onText(/^\/see\ ([a-zA-Z0-9]{1,6})\ \d+$/i, (msg, match) => {
    data = msg.text.toUpperCase().split(' ')
    market = data[1]
    time = parseInt(data[2])
    if (time.toString() != data[2] || time < 1 || time > 60 * 6) {
      this.send_message(msg.chat.id, 'Please enter a number between 1 and 360.')
    } else {
      this.detektor.getMarketDataWithTime(market, time-1).then((markets) => {
        if (markets.length == 0)
          message = "Not found."
        if (markets.length > 5)
          message = "Too many markets found"
        if (markets.length > 0 && markets.length <= 5)
          message = markets.map((market_info) => {
            return this.telegramPostPriceCheckWithTime(market_info.exchange, market_info.market, market_info.firstTicker, market_info.lastTicker, time)
          }).join("\n\n")
        this.send_message(msg.chat.id, message)
      }).catch((err) => {
        if (err == 'no_time_data') {
          this.send_message(msg.chat.id, "Sorry, I still don't have " + time + " minutes of data for that pair.")
        } else
          this.logger.error("Error fetching market with data:", err)
      })
    }
  })

  this.telegram_bot.onText(/\/(stop|block)/, (msg, match) => {
    if (this.is_subscribed(msg.chat.id)) {
      this.block_subscriber(msg.chat.id)
    }
    this.send_message(msg.chat.id, 'You wont receive my notifications anymore. To change that, you can type /subscribe')
  })

  this.telegram_bot.onText(/\/help/, (msg, match) => {
    message = "/whatisgany - What is this bot?"
    message += "\n/subscribe - Subscribe to Gany's notifications"
    message += "\n/subscription - Information about your subscription"
    message += "\n/stop - Stop receiving notifications from Gany"
    message += "\n/configure - Configure the exchanges you want or don't want"
    message += "\n/see XXX - See information on all exchanges about XXX currency"
    message += "\n/see XXX 20 - See information on all exchanges with change over 20 minutes"
    message += "\n/pricing - See information about pricing of Gany"
    message += '\n/pay - See information required for paying monthly fee'
    message += "\n/whatisbal - What is B A L ?"
    message += "\nThe information you want is not here? You can talk to us in our discussion group https://t.me/CryptoWarnings"
    this.send_message(msg.chat.id, message)
  })

  this.telegram_bot.onText(/\/whatisgany/, (msg, match) => {
    if (this.is_subscribed(msg.chat.id)) {
      message = "Gany is a CryptoCurrency Trading Analysis bot that monitors multiple exchanges and markets"
      message += " 24/7, giving its subscribers notifications when certain conditions happen in a given market.\n\n"
      message += "It's information is not a direct buy or sell signal, it gives detailed information about changes during specific times"
      message += " so traders can analyse them and make wiser decisions about their investments."
      this.send_message(msg.chat.id, message)
    }
  })

  this.telegram_bot.onText(/\/whatisbal/, (msg, match) => {
    if (this.is_subscribed(msg.chat.id)) {
      message = "\nB: Bid"
      message += "\nA: Ask"
      message += "\nL: Last"
      this.send_message(msg.chat.id, message)
    }
  })

  this.telegram_bot.onText(/\/pricing/, (msg, match) => {
    message = "Gany has both paid and free subscription:"
    message += '\n*Paid User*: 0.01 BTC monthly fee. Receives all Gany notifications and can use current features.'
    message += '\n*Free User*: Receives only 25% of notifications and can use /see and /configure commands.'
    message += "\n\nGany is an evolving product, there will be new exchanges added, mobile app (for which your subscription will work) and much more."
    message += "\nFor more information visit us at www.cryptowise.net"
    this.send_message(msg.chat.id, message)
  })

  this.telegram_bot.onText(/\/granttime/, (msg, match) => {
    if (this.is_mod(msg.chat.id)){ // only process vip chat requests
      command = msg.text.split(' ')
      subscriber = this.find_subscriber(parseInt(command[1])) || this.find_subscriber_by_username(command[1])
      time = parseInt(command[2])
      if (command.length != 3 || time <= 0) {
        this.send_message(msg.chat.id, 'Usage: /grant telegram_id time')
      } else {
        if (subscriber == undefined) {
          this.send_message(msg.chat.id, 'User ' + command[1] + ' not found')
        } else {
          subscriber.add_subscription_time(time)
          this.send_message(msg.chat.id, time + ' days applied to user ' + command[1], {parse_mode: 'HTML'})
        }
      }
    }
  })

  this.telegram_bot.onText(/\/finduser/, (msg, match) => {
    if (this.is_mod(msg.chat.id)){ // only process vip chat requests
      command = msg.text.split(' ')
      subscriber = this.find_subscriber(parseInt(command[1])) || this.find_subscriber_by_username(command[1])
      if (subscriber == undefined) {
        this.send_message(msg.chat.id, 'User ' + command[1] + ' not found')
      } else {
        message = "\nID: " + subscriber.telegram_id
        message += "\nName: " + subscriber.full_name
        message += "\nUsername: " + subscriber.username
        message += "\nBTC Address: " + subscriber.btc_address
        message += "\nSubscription status: " + (subscriber.subscription_status ? "Expires on " + subscriber.subscription_expires_on : "Free user")
        message += "\nBalance: " + (subscriber.total_balance() / 100000000).toFixed(8)
        message += "\nSubscriber since: " + subscriber.createdAt
        this.send_message(msg.chat.id, message, {parse_mode: 'HTML'})
      }
    }
  })

  this.telegram_bot.onText(/\/detektor/, (msg, match) => {
    command = msg.text
    if (this.is_mod(msg.chat.id)){ // only process vip chat requests
      this.logger.log("Receiving request from MOD", msg.chat.id, "'" + msg.text + "'")
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
      if (command.match(/\/detektor update users/)) {
        Subscriber.find({}, (err, subscribers) => {
          if (err)
            this.logger.error("Could not get subscribers! fatal error", err)
          this.subscribers = subscribers
        })
        this.send_message(msg.chat.id, "Done.")
      }
    }
  })

  this.telegram_bot.onText(/\/whatsmyid/, (msg, match) => {
    this.update_user(msg)
    this.send_message(msg.from.id, "Your id is " + msg.from.id)
  })

  this.telegram_bot.onText(/\/allcount/, (msg, match) => {
    if (this.is_mod(msg.chat.id)){ // only process vip chat requests
      this.send_message(msg.chat.id, this.subscribers.length + " subscribers.")
    }
  })

  this.telegram_bot.onText(/\/paidcount/, (msg, match) => {
    if (this.is_mod(msg.chat.id)){ // only process vip chat requests
      this.send_message(msg.chat.id, this.subscribers.filter((s) => { return s.subscription_status }).length + " paid subscribers.")
    }
  })

  this.telegram_bot.onText(/\/sendmessage/, (msg, match) => {
    if (this.is_mod(msg.chat.id))
      this.broadcast(msg.text.replace(/\/sendmessage\ /, ''))
  })

  this.telegram_bot.onText(/\/sendpaidmessage/, (msg, match) => {
    if (this.is_mod(msg.chat.id))
      this.broadcast(msg.text.replace(/\/sendpaidmessage\ /, ''), true)
  })

  // ************** //
  // CALLBACK QUERY //
  // ************** //
  this.telegram_bot.on('callback_query', (msg) => {
    if (this.is_subscribed(msg.from.id)) {
      if (msg.data == 'configure subscription')
        if (this.is_subscribed(msg.from.id)) {
          subscriber = this.find_subscriber(msg.from.id)
          if (subscriber.subscription_status) { // subscription updated
            message = "You are a paid user."
            message += "\nYour subscription expires on " + subscriber.subscription_expires_on
            message += "\nYou can send your monthly fee before the expiration date, so you can keep receiving the service without interruptions."
            this.send_message(subscriber.telegram_id, message)
          } else { // not subscribed
            if (subscriber.btc_address) {
              message = "You are a free user."
              message += "\nYou must send 0.01 BTC to address " + subscriber.btc_address + " in order to start using the full service."
              message += "\nIf you already did, you will start receiving our notifications as soon as we confirm the transaction."
              this.send_message(subscriber.telegram_id, message)
            } else {
              subscriber.generate_btc_address().then((address) => {
                message = "You are a free user."
                message += "\nYou must send 0.01 BTC to address " + address + " in order to start using the full service."
                message += "\nIf you already did, you will start receiving our notifications as soon as we confirm the transaction."
                this.send_message(subscriber.telegram_id, message)
              })
            }
          }
        }
      if (msg.data == "configure")
        this.send_message(msg.from.id, "Configuration menu:", this.configuration_menu_options())
      if (msg.data == "configure exchanges")
        this.send_message(msg.from.id, "Configure Exchanges:", this.configuration_menu_exchanges())
      if (msg.data.match(/configure exchange\ /)) {
        commands = msg.data.split(" ")
        if (commands.length == 3) { // show exchange options
          exchange_status = this.find_subscriber(msg.from.id).exchange_status(commands[2])
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

GanyTheBot.prototype.is_not_a_group = function(msg) {
  if (msg.chat.type == 'group' || msg.chat.type == 'supergroup') {
    this.send_message(msg.chat.id, 'Hello ' + msg.from.first_name + '. You need to talk to me directly in a private chat.\nGroups can only use the /see currency feature.')
  }
  return msg.chat.type != 'group' && msg.chat.type != 'supergroup'
}

GanyTheBot.prototype.send_message = function(chat_id, message, options = { parse_mode: "Markdown", disable_web_page_preview: true }) {
  this.telegram_bot.sendMessage(chat_id, message, options).catch((error) => {
    if (error.message.match(/bot\ was\ blocked\ by\ the\ user/) || error.message.match(/bot\ is\ not\ a\ member\ of\ the\ supergroup\ chat/) || error.message.match(/bot\ was\ kicked\ from\ the\ supergroup\ chat/) || error.message.match(/user\ is\ deactivated/)) { // user blocked the bot
      this.logger.log("Blocked user " + chat_id)
      this.block_subscriber(chat_id)
    }
    this.logger.error(error.code, error.message); // => { ok: false, error_code: 400, description: 'Bad Request: chat not found' }
  });
}

GanyTheBot.prototype.notify_user_got_confirmed = function(subscriber) {
  message = "Your subscription got processed!"
  message += "\nYou will start receiving notifications from now on."
  message += "\nYou can check your subscription status on /subscription"
  this.send_message(subscriber.telegram_id, message)
}

GanyTheBot.prototype.send_signal = function(client, signal) {
  this.previous_signal(signal.exchange, signal.market, (prev) => {
    text = this.telegram_post_signal(client, signal, prev)
    this.logger.log(text)
    if (client.exchange_name == 'Otherexchange') {
      this.message_gods(text); this.message_mods(text);
    } else {
      send_free = this.random_number(1,4) == 4 // randomly pick if we should send it or not
      this.subscribers.filter((sub) => { return sub.exchanges[signal.exchange] && !sub.blocked }).forEach((sub) => {
        if (sub.subscription_status == true) {
          this.send_message(sub.telegram_id, text)
        } else {
          // free users
          if (send_free)
            this.send_message(sub.telegram_id, text)
        }
      });
    }
    this.detektor.store_signal_in_background(signal)
  })
}

GanyTheBot.prototype.random_number = function(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive
}

GanyTheBot.prototype.previous_signal = async function(exchange, market, callback) {
  Signal.find({exchange: exchange, market: market}).limit(1).sort([['createdAt', 'descending']]).exec((err, data) => {
    callback(data[0])
  })
}

GanyTheBot.prototype.telegram_post_signal = function(client, signal, prev = undefined) {
  diff = signal.last_ticker.volume - signal.first_ticker.volume
  message = "[" + client.exchange_name + " - " + signal.market + "](" + client.market_url(signal.market) + ")"
  message += "\nVol. up by *" + diff.toFixed(2) + "* " + client.volume_for(signal.market) + " since *" + this._seconds_to_minutes(signal.time) + "*"
  message += "\nVolume: " + signal.last_ticker.volume.toFixed(4) + " (*" + ((signal.change - 1) * 100).toFixed(2) + "%*)"
  message += "\nB: " + signal.first_ticker.bid.toFixed(8) + " " + this.telegram_arrow(signal.first_ticker.bid, signal.last_ticker.bid) + " " + signal.last_ticker.bid.toFixed(8)
  message += "\nA: " + signal.first_ticker.ask.toFixed(8) + " " + this.telegram_arrow(signal.first_ticker.ask, signal.last_ticker.ask) + " " + signal.last_ticker.ask.toFixed(8)
  message += "\nL: " + signal.first_ticker.last.toFixed(8) + " " + this.telegram_arrow(signal.first_ticker.last, signal.last_ticker.last) + " " + signal.last_ticker.last.toFixed(8)
  message += "\n24h Low: " + signal.last_ticker.low.toFixed(8) + "\n24h High: " + signal.last_ticker.high.toFixed(8)
  if (prev) {
    if (prev.createdAt) { message += "\nLast Signal: " + moment(prev.createdAt).fromNow() }
    message += "\nLast Signal Price: " + prev.last_ticker.last.toFixed(8)
  }
  return message
}

GanyTheBot.prototype.telegram_post_price_check = function(exchange, market, ticker_info) {
  message = "[" + exchange + " - " + market + "](" + this.detektor.market_url(exchange, market) + ")"
  message += "\nB: " + ticker_info.bid.toFixed(8)
  message += "\nA: " + ticker_info.ask.toFixed(8)
  message += "\nL: " + ticker_info.last.toFixed(8)
  message += "\nVolume: " + ticker_info.volume.toFixed(4) + " " + this.detektor.api_clients[exchange].volume_for(market)
  message += "\n24h Low: " + ticker_info.low.toFixed(8)
  message += "\n24h High: " + ticker_info.high.toFixed(8)
  return message
}

GanyTheBot.prototype.telegramPostPriceCheckWithTime = function(exchange, market, firstTicker, lastTicker, time) {
  diff = lastTicker.volume - firstTicker.volume
  change = this.detektor.volume_change(firstTicker, lastTicker)
  message = "[" + exchange + " - " + market + "](" + this.detektor.market_url(exchange, market) + ")"
  message += "\nVol. changed by *" + diff.toFixed(2) + "* " + this.detektor.api_clients[exchange].volume_for(market) + " since *" + time + " minutes*"
  message += "\nVolume: " + lastTicker.volume.toFixed(4) + " (*" + ((change - 1) * 100).toFixed(2) + "%*)"
  message += "\nB: " + firstTicker.bid.toFixed(8) + " " + this.telegram_arrow(firstTicker.bid, lastTicker.bid) + " " + lastTicker.bid.toFixed(8)
  message += "\nA: " + firstTicker.ask.toFixed(8) + " " + this.telegram_arrow(firstTicker.ask, lastTicker.ask) + " " + lastTicker.ask.toFixed(8)
  message += "\nL: " + firstTicker.last.toFixed(8) + " " + this.telegram_arrow(firstTicker.last, lastTicker.last) + " " + lastTicker.last.toFixed(8)
  message += "\n24h Low: " + lastTicker.low.toFixed(8) + "\n24h High: " + lastTicker.high.toFixed(8)
  return message
}

GanyTheBot.prototype.find_subscriber = function(telegram_id) {
  return _.find(this.subscribers, (sub) => { return sub.telegram_id == telegram_id } )
}

GanyTheBot.prototype.find_subscriber_by_username = function(username) {
  return _.find(this.subscribers, (sub) => { return sub.username == username } )
}

GanyTheBot.prototype.is_paid_subscriber = function(telegram_id) {
  return _.find(this.subscribers, (sub) => { return sub.telegram_id == telegram_id && sub.subscription_status == true } )
}

GanyTheBot.prototype.is_subscribed = function(telegram_id) {
  return this.find_subscriber(telegram_id)
}

GanyTheBot.prototype.is_blocked = function(telegram_id) {
  sub = this.find_subscriber(telegram_id)
  return sub && sub.blocked
}

// TEMPORAL function to check for users
GanyTheBot.prototype.update_user = function(data) {
  if (subscriber = this.find_subscriber(data.from.id)) {
    changed = false
    full_name = data.from.first_name + (data.from.last_name ? " " + data.from.last_name : "")
    if (data.chat.type == 'group' || data.chat.type == 'supergroup') { changed = true; subscriber.blocked = true }
    if (subscriber.username != data.from.username) { changed = true; subscriber.username = data.from.username }
    if (subscriber.language != data.from.language_code) { changed = true; subscriber.language = data.from.language_code }
    if (subscriber.full_name != full_name) { changed = true; subscriber.full_name = full_name }
    if (changed) { subscriber.save(); } // if anything changed, store it
  }
}

GanyTheBot.prototype.subscribe_user = function(data, callback) {
  full_name = data.first_name + (data.last_name ? " " + data.last_name : "")
  sub = new Subscriber({telegram_id: data.id, full_name: full_name, username: data.username, language: data.language_code})
  sub.save((err) => {
    callback(err, sub)
  })
}

GanyTheBot.prototype.block_subscriber = function(telegram_id) {
  sub = this.find_subscriber(telegram_id)
  sub.blocked = true
  sub.save()
}

GanyTheBot.prototype.unblock_subscriber = function(telegram_id) {
  sub = this.find_subscriber(telegram_id)
  sub.blocked = false
  sub.save()
}

GanyTheBot.prototype.configuration_menu_options = function() {
  return {
    parse_mode: "Markdown",
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [{ text: 'Configure Exchanges', callback_data: 'configure exchanges' }, { text: 'Subscription', callback_data: 'configure subscription' }],
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
        [{ text: 'Kraken', callback_data: 'configure exchange Kraken' }, { text: 'Binance', callback_data: 'configure exchange Binance' }],
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

GanyTheBot.prototype.expire_expired_users = function() {
  date = new Date();
  setTimeout(() => { this.expire_expired_users() }, CHECK_EXPIRED_USERS * 60 * 60 * 1000) // 1 hour, should probably be every 1 day
  this.subscribers.filter((subscriber) => {
    return subscriber.subscription_status == true && subscriber.subscription_expires_on <= date
  }).forEach((subscriber) => {
    subscriber.subscription_status = false
    subscriber.save()
    message = "Looks like your subscription has expired :(\nPlease transfer again 0.01 BTC in order to continue receiving the service."
    this.send_message(subscriber.telegram_id, message)
  })
}

GanyTheBot.prototype._seconds_to_minutes = function(seconds) {
  var minutes = Math.floor(seconds / 60);
  var seconds = seconds - minutes * 60;
  return minutes == 0 ? (seconds + " seconds") : minutes + (minutes > 1 ? " minutes" : " minute")
}

GanyTheBot.prototype.is_god = function(subscriber_id) {
  return this.god_users.includes(subscriber_id)
}
GanyTheBot.prototype.is_mod = function(subscriber_id) {
  return this.mod_users.includes(subscriber_id) || this.is_god(subscriber_id)
}

GanyTheBot.prototype.message_gods = function(text) {
  this.god_users.forEach((chat_id) => {
    this.send_message(chat_id, text)
  });
}

GanyTheBot.prototype.message_mods = function(text) {
  this.mod_users.forEach((chat_id) => {
    this.send_message(chat_id, text)
  });
}

GanyTheBot.prototype.broadcast = function(text, only_paid = false) {
  this.subscribers.forEach((sub) => {
    if (only_paid) {
      if (sub.subscription_status == true) { this.send_message(sub.telegram_id, text) }
    } else { this.send_message(sub.telegram_id, text) }
  });
}

module.exports = GanyTheBot;
