require 'faraday'
require 'json'
require 'base64'
require 'uri'
require 'net/http'
require 'openssl'

# class Client

HOST="https://bittrex.com/api/v1.1"


  def connection
    @connection ||= Faraday.new(:url => HOST) do |faraday|
      faraday.request  :url_encoded
      faraday.adapter  Faraday.default_adapter
    end
  end

  def get(path, params = {}, headers = {})
    nonce = Time.now.to_i
    uri = URI("#{HOST}/#{path}")
    uri.query = URI.encode_www_form(params.merge(apikey: KEY, nonce: nonce))
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
    OpenSSL::HMAC.hexdigest('sha512', SECRET, url)
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

  def pnd(amount, buy_when, sell_when, currency)
    start_time = Time.now
    amount = 0.01 # BTC
    currency_to_buy = currency # currency

    current_price = currency_price(currency_to_buy)
    buy_at_price = current_price * buy_when
    currencies_to_buy = amount / buy_at_price

    # make buy order
    puts "Current price is #{current_price}, set order for #{currencies_to_buy} at #{buy_at_price}, took #{Time.now - start_time} ms"
    order = market_buy_limit(currency_to_buy, currencies_to_buy, buy_at_price)
    puts "Order id is #{order["uuid"]}"
    # wait
    while (res = get_order(order["uuid"]))["Closed"].nil?
      price = currency_price(currency_to_buy)
      puts "Waiting for order to complete... current_price is #{price}, bought set at #{buy_at_price}, coins_remaining = #{res["QuantityRemaining"]}"
      sleep 0.5
    end

    puts "BOUGHT! Now selling..."

    # make sell order
    sell_at_price = current_price * sell_when
    puts "Putting sell order for #{currencies_to_buy} at #{sell_at_price}"
    order = market_sell_limit(currency, currencies_to_buy, sell_at_price)
    puts "Order id is #{order["uuid"]}"

    # wait
    while (res = get_order(order["uuid"]))["Closed"].nil?
      price = currency_price(currency_to_buy)
      puts "Waiting for order to complete... current_price is #{price}, sold set at #{sell_at_price}, coins_remaining = #{res["QuantityRemaining"]}"
      sleep 0.5
    end
    puts "SOLD! profits = #{((currencies_to_buy * sell_at_price) - (currencies_to_buy * buy_at_price)) * 0.994}" # 0.2 for buying 0.2 for selling
  end

  z = pnd(0.01, 1.001, 1.005, 'ANS')


