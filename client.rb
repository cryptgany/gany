require 'json'
require 'base64'
require 'uri'
require 'net/http'
require 'openssl'
require 'time'

# class Client

HOST="https://bittrex.com/api/v1.1"

#   z = client.pnd(0.01, 0.998, 1.01, 'ANS')

class Client
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
    # [JSON.parse(response.body)["result"], response]
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

  def currency_price(currency = 'ANS')
    data = public_get("https://bittrex.com/api/v1.1/public/getticker", market: "BTC-#{currency}")
    data["result"]["Last"]
  end
 
  def get_orders
    get("market/getopenorders")
  end

  def get_balances
    get 'account/getbalances'
  end

  def get_balance(currency = 'BTC')
    get 'account/getbalance', {currency: currency}
  end

  def get_order(order_id)
    get 'account/getorder', {uuid: order_id}
  end

  def market_buy_limit(currency, quantity, rate)
    get 'market/buylimit', {market: "BTC-#{currency}", quantity: quantity, rate: rate}
  end

  def market_sell_limit(currency, quantity, rate)
    get 'market/selllimit', {market: "BTC-#{currency}", quantity: quantity, rate: rate}
  end

  def cancel_order(order_id)
    get 'market/cancel', {uuid: order_id}
  end

  def cancel_all
    get_orders.each {|order| cancel_order(order["OrderUuid"])}
  end
  alias_method :x, :cancel_all

  #  client.watch({currencies: %w{ ANS SC DGB EMC2 SNT }, cicles: 20})
  def watch(opts) # watches currencies forever
    cicles = opts[:cicles]
    _cicles = 0
    currencies = opts[:currencies]
    currs = currencies.map{|cur| [cur, {}]}.to_h
    log "Watching on currencies #{opts['currencies']}"
    currencies.each { |cur| currs[cur][:initial] = currency_price(cur) }
    log currs.map{|cur, vals| "#{cur}: #{fts vals[:initial]} (0.00%)"}.join(" | ")
    while(cicles >= _cicles) do
      currencies.each do |cur|
        price = currency_price(cur)
        currs[cur][:last] = price
        currs[cur][:change] = (1 - (currs[cur][:initial] / price))
      end
      log currs.map{|cur, vals| "#{cur}: #{fts vals[:last]} (#{"%1.2f" % (vals[:change] * 100)}%)"}.join(" | ")
      _cicles += 1
    end
  end

  def pnd(amount, buy_when, sell_when, currency, recursive = false)
    @buy_count ||= 0
    @buy_count += 1
    start_time = Time.now
    amount = 0.01 # BTC
    currency_to_buy = currency # currency

    current_price = currency_price(currency_to_buy)
    buy_at_price = (current_price * buy_when).round(8)
    currencies_to_buy = (amount / buy_at_price).round(8)

    # make buy order
    log "Current price is #{fts current_price}"
    log "Putting buy order for #{fts currencies_to_buy} #{currency} at #{fts buy_at_price} BTC, took #{Time.now - start_time} ms"
    order = market_buy_limit(currency_to_buy, currencies_to_buy, buy_at_price)
    log "Order id is #{order["uuid"]}"
    # wait
    while (res = get_order(order["uuid"]))["Closed"].nil?
      price = currency_price(currency_to_buy)
      log "[#{buy_count}] Waiting for buy order to complete... current_price is #{fts price.round(8)}, bought set at #{fts buy_at_price}"
      sleep 0.5
    end

    log "BOUGHT! Now selling..."

    # make sell order
    sell_at_price = (current_price * sell_when).round(8)
    log "Putting sell order for #{fts currencies_to_buy} #{currency} at #{fts sell_at_price} BTC"
    order = market_sell_limit(currency, currencies_to_buy, sell_at_price)
    log "Order id is #{order["uuid"]}"

    # wait
    while (res = get_order(order["uuid"]))["Closed"].nil?
      price = currency_price(currency_to_buy)
      log "[#{buy_count}] Waiting for sell order to complete... current_price is #{fts price.round(8)}, sold set at #{fts sell_at_price}"
      sleep 0.5
    end
    cost = currencies_to_buy * buy_at_price * 1.0025 # 0.0025% fee
    reward = currencies_to_buy * sell_at_price * 0.9975 # 0.0025% fee
    profit = reward - cost
    log "SOLD! profit = #{fts(profit)}"
    pnd(amount, buy_when, sell_when, currency, recursive) if recursive
  end

  def fts(n)
    "%1.8f" % n
  end

  def log(str)
    puts "[#{Time.now.strftime('%d/%m/%Y %H:%M:%S')}] #{str}"
  end
end
