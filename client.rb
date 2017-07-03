#   require './client'; Client.pnd_fixed_price(0.001, Client.currency_price("BTC-ANS"), Client.currency_price("BTC-ANS"), 'BTC-ANS')

#   require './client'; Client.pnd_in_time(0.1, 0.9, 3, "BTC-ANS")

#   require './client'; Client.pnd(0.4, 1.2, 1.02, 'BTC-XEL', true)

# REAL USE CASE FOR MANUAL PUMP
# require './client';
# Client.pnd_in_time(0.1, 1.3, 15, "BTC-ANS")


# PurePumps | Crypto Investments
# 2623 members
# Buy In: 1.05 | Sell time: 20
# Client.pnd_in_time(0.2, 1.05, 20, "BTC-")

# Pump Notifier/Trading Signals
# 17363 members
# Buy In: 1.05 | Sell time: 20
# Client.pnd_in_time(0.4, 1.05, 20, "BTC-")

require 'json'
require 'base64'
require 'uri'
require 'net/http'
require 'openssl'
require 'time'


class Client
  HOST="https://bittrex.com/api/v1.1"
  class << self
    attr_accessor :buy_count
    def get(path, params = {}, headers = {})
      nonce = Time.now.to_i
      uri = URI("#{HOST}/#{path}")
      uri.query = URI.encode_www_form(params.merge(apikey: ENV['KEY'], nonce: nonce))
      url = uri.to_s

      req = Net::HTTP::Get.new(uri.to_s)
      req["apisign"] = signature(url)
      response = Net::HTTP.start(uri.hostname, uri.port, :use_ssl => true) {|http|
        http.request(req)
      }
      JSON.parse(response.body)["result"]
    end

    def public_get(url, params)
      uri = URI(url)
      uri.query = URI.encode_www_form(params)
      JSON.parse(Net::HTTP.get(uri))
    end

    def signature(url)
      OpenSSL::HMAC.hexdigest('sha512', ENV['SECRET'], url)
    end

    def currency_price(market)
      data = public_get("https://bittrex.com/api/v1.1/public/getticker", market: market)
      data["result"]["Last"]
    end
   
    def get_orders
      get("market/getopenorders")
    end
    alias_method :orders, :get_orders

    def get_balances
      get 'account/getbalances'
    end
    alias_method :balances, :get_balances

    def get_balance(currency = 'BTC')
      get 'account/getbalance', {currency: currency}
    end
    alias_method :balance, :get_balance

    def get_order(order_id)
      get 'account/getorder', {uuid: order_id}
    end

    def market_buy_limit(market, quantity, rate)
      get 'market/buylimit', {market: market, quantity: quantity, rate: rate}
    end

    def market_sell_limit(market, quantity, rate)
      get 'market/selllimit', {market: market, quantity: quantity, rate: rate}
    end

    def cancel_order(order_id)
      get 'market/cancel', {uuid: order_id}
    end

    def cancel_all
      get_orders.each {|order| cancel_order(order["OrderUuid"])}
    end
    alias_method :x, :cancel_all

    def pnd_in_time(amount, buy_at, wait_seconds, market)
      current_price = currency_price(market)
      buy_price = (current_price * buy_at).round(8)
      pnd_time_based(amount, buy_price, wait_seconds, market)
    end

    def pnd_time_based(amount, buy_price, wait_seconds, market) # buys, waits time, sells
      @buy_count ||= 0
      @buy_count += 1
      start_time = Time.now

      currencies_to_buy = (real_amount(amount) / buy_price).round(8)
      # make buy order
      log "Placing buy order for #{fts currencies_to_buy} #{market} at #{fts buy_price} BTC, took #{fts Time.now - start_time} ms"
      order = market_buy_limit(market, currencies_to_buy, buy_price)
      log "Order id is #{order["uuid"]}"

      # wait
      log "Sleeping #{wait_seconds} seconds..."
      sleep wait_seconds # seconds

      # cancel order or make sell order
      if get_order(order["uuid"])["Closed"].nil?
        # cancel order
        cancel_order(order["uuid"])
        log "Could not buy, order canceled"
      else
        # make sell order, take profit
        sell_price = currency_price(market)
        log "Placing sell order for #{fts currencies_to_buy} #{market} at #{fts sell_price} BTC"
        order = market_sell_limit(market, currencies_to_buy, sell_price)
        log "Order id is #{order["uuid"]}"

        # wait
        while (res = get_order(order["uuid"]))["Closed"].nil?
          price = currency_price(market)
          log "[#{buy_count}] Waiting for sell order to complete... current_price is #{fts price.round(8)}, sold set at #{fts sell_price}"
          sleep 0.5
        end
        cost = currencies_to_buy * buy_price * 1.0025 # 0.0025% fee
        reward = currencies_to_buy * sell_price * 0.9975 # 0.0025% fee
        profit = reward - cost
        log "SOLD! profit = #{fts(profit)}"
        profit
      end
    end

    def pnd_fixed_price(amount, buy_price, sell_price, market)
      start_time = Time.now
      currencies_to_buy = (real_amount(amount) / buy_price).round(8)
      log "Placing buy order for #{fts currencies_to_buy} #{market} at #{fts buy_price} BTC, took #{fts Time.now - start_time} ms"
      order = market_buy_limit(market, currencies_to_buy, buy_price)
      log "Order id is #{order["uuid"]}"
      # wait
      while (res = get_order(order["uuid"]))["Closed"].nil?
        price = currency_price(market)
        log "Waiting for buy order to complete... current_price is #{fts price.round(8)}, bought set at #{fts buy_price}"
        sleep 0.5
      end
      log "BOUGHT! Now selling..."

      # make sell order
      log "Placing sell order for #{fts currencies_to_buy} #{market} at #{fts sell_price} BTC"
      order = market_sell_limit(market, currencies_to_buy, sell_price)
      log "Order id is #{order["uuid"]}"

      # wait
      while (res = get_order(order["uuid"]))["Closed"].nil?
        price = currency_price(market)
        log "Waiting for sell order to complete... current_price is #{fts price.round(8)}, sold set at #{fts sell_price}"
        sleep 0.5
      end
      cost = currencies_to_buy * buy_price * 1.0025 # 0.0025% fee
      reward = currencies_to_buy * sell_price * 0.9975 # 0.0025% fee
      profit = reward - cost
      log "SOLD! PROFIT = #{fts(profit)}"
      profit
    end

    def pnd(amount, buy_when, sell_when, market, recursive = false)
      @buy_count ||= 0
      @buy_count += 1
      start_time = Time.now

      current_price = currency_price(market)
      buy_at_price = (current_price * buy_when).round(8)
      currencies_to_buy = (real_amount(amount) / buy_at_price).round(8)

      # make buy order
      log "Current price is #{fts current_price}"
      log "Placing buy order for #{fts currencies_to_buy} #{market} at #{fts buy_at_price} BTC, took #{fts Time.now - start_time} ms"
      order = market_buy_limit(market, currencies_to_buy, buy_at_price)
      log "Order id is #{order["uuid"]}"
      # wait
      while (res = get_order(order["uuid"]))["Closed"].nil?
        price = currency_price(market)
        log "[#{buy_count}] Waiting for buy order to complete... current_price is #{fts price.round(8)}, bought set at #{fts buy_at_price}"
        sleep 0.5
      end

      log "BOUGHT! Now selling..."

      # make sell order
      sell_at_price = (current_price * sell_when).round(8)
      log "Placing sell order for #{fts currencies_to_buy} #{market} at #{fts sell_at_price} BTC"
      order = market_sell_limit(market, currencies_to_buy, sell_at_price)
      log "Order id is #{order["uuid"]}"

      # wait
      while (res = get_order(order["uuid"]))["Closed"].nil?
        price = currency_price(market)
        log "[#{buy_count}] Waiting for sell order to complete... current_price is #{fts price.round(8)}, sold set at #{fts sell_at_price}"
        sleep 0.5
      end
      cost = currencies_to_buy * buy_at_price * 1.0025 # 0.0025% fee
      reward = currencies_to_buy * sell_at_price * 0.9975 # 0.0025% fee
      profit = reward - cost
      log "SOLD! profit = #{fts(profit)}"
      pnd(amount, buy_when, sell_when, market, recursive) if recursive
    end

    def real_amount(n) # calculate btc to use without FEES so fees are 100% of provided amount
      n * 0.9975
    end

    def fts(n)
      "%1.8f" % n
    end

    def log(str)
      puts "[#{Time.now.strftime('%d/%m/%Y %H:%M:%S')}] [AUTOTRADER] #{str}"
    end
  end
end
