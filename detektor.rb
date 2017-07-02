#          require './detektor'; Detektor.watch

require 'json'
require 'uri'
require 'net/http'
require 'time'
require './client'

# class Client

class Detektor
  HOST="https://bittrex.com/api/v1.1"
  VALUES = %w{ Last Bid } # you can add as you wish Volume Ask OpenBuyOrders OpenSellOrders
  PUMP_PERCENTAGE = 1.03 # if one second changes that percentage for any VALUES it will warn
  DUMP_PERCENTAGE = 0.93 # if one second changes that percentage for any VALUES it will warn
  TIMEFRAME_FOR_PUMP_ACCEPTATION = 3 # cycles/seconds, every THAT bot will reset counters
  PUMP_CERTAIN_COUNT = 3 # continued seconds for pump to be recognized as real
  DEBUG_MODE = false
  FAVORITE_COINS = /(ANS|DGB|SC|SNT)/
  USE_FAVORITE_COINS_ONLY = false
  USE_REAL_ORDERS = true
  ORDER_SELL_STRATEGY = :time # fixed_price | time
  ORDER_SELL_TIME_STRATEGY_TIME = 10 # seconds for time strategy
  AUTOTRADER_AMOUNT = 0.001 # btc
  AUTOTRADER_BUY_PRICE = 1.01
  AUTOTRADER_SELL_PRICE = 1.1
  AMOUNT = 0.001 # BTC

  class << self

    attr_accessor :previous_data, :current_data, :changes, :pump_market_count, :order_track

    def watch
      log_debug "Reading first info..."
      res = public_get("#{HOST}/public/getmarketsummaries")["result"]
      log_debug "Got it, going for cycle"
      @previous_data = res
      @pump_market_count = {}

      while (true) do # every second, get market information
        fetch_time = Time.now

        log_debug "Reading current info..."
        result = public_get("#{HOST}/public/getmarketsummaries")
        unless result["success"]
          log "[ERROR] #{result["message"]}"
          raise "ERROR"
        end

        res = result["result"]
        @current_data = res
        log_debug "Got it, detecting changes"
        detect_changes
        warn_changes_detected
        keep_track_of_pump_for_next_second
        warn_of_definitive_pump_detected
        verify_if_orders_won
        @previous_data = res

        wait_until { Time.now - fetch_time >= 1 } # try to make sure we do exactly one second, no less
      end
    end

    def leave_only_favorite_coins
      return unless USE_FAVORITE_COINS_ONLY
      @previous_data.reject!{|d| d["MarketName"] !~ FAVORITE_COINS}
      @current_data.reject!{|d| d["MarketName"] !~ FAVORITE_COINS}
    end

    def clean_volume_0_coins
      log_debug "Cleaning volume 0 coins"
      @previous_data.reject!{|d| d["Volume"].nil? || d["Volume"] <= 0}
      @current_data.reject!{|d| d["Volume"].nil? || d["Volume"] <= 0}
    end

    def leave_only_btc_markets # optional?
      log_debug "Cleaning non-btc markets"
      @previous_data.reject!{|d| d["MarketName"] !~ /^BTC/}
      @current_data.reject! {|d| d["MarketName"] !~ /^BTC/}
    end

    def data_for_market(market)
      @current_data.select{|x| x["MarketName"] == market}[0]
    end

    def last_price_of_market(market)
      data_for_market(market)['Last']
    end

    def detect_changes
      leave_only_favorite_coins
      clean_volume_0_coins
      leave_only_btc_markets
      log_debug "Organizing data"
      organized_prev = @previous_data.map{|c| [c["MarketName"], VALUES.map{|v| [v, c[v]]}.to_h]}.to_h
      organized_curr = @current_data.map{|c| [c["MarketName"], VALUES.map{|v| [v, c[v]]}.to_h]}.to_h
      log_debug "Organized_sample: #{organized_prev}"
      markets = organized_prev.map{|market, _| market}
      @changes = {}
      markets.each do |market|
        log_debug "Reading market #{market}"
        VALUES.each do |val|
          prev_val = organized_prev[market][val]
          curr_val = organized_curr[market][val]
          if curr_val / prev_val >= PUMP_PERCENTAGE # detect pump
            @changes[market] ||= {}
            @changes[market]["pump"] ||= {}
            @changes[market]["pump"][val] = [prev_val, curr_val]
          end
          if curr_val / prev_val <= DUMP_PERCENTAGE # detect dump
            @changes[market] ||= {}
            @changes[market]["dump"] ||= {}
            @changes[market]["dump"][val] = [prev_val, curr_val]
          end
        end
        log_debug "Changes: #{@changes[market]}"
      end
    end

    def warn_changes_detected
      if @changes.any?
        @changes.each do |market, detection|
          str = ""
          detection.each do |dtype, values|
            change_values = values.map {|val, chg| "#{val}(#{pts (chg[1] / chg[0]).round(2)}%): #{fts chg[0]} vs #{fts chg[1]}"}.join(" | ")
            str = "[#{dtype.upcase} on #{market}]: #{change_values}"
          end
          log str
        end
      end
    end

    def keep_track_of_pump_for_next_second
      pump_markets = @changes.select{|_, chg| chg["pump"] }.map{|market, _| market}
      pump_market_count.select{|mk, _| !pump_markets.include?(mk) }.each{|mk, values| values["life"] -= 1}
      pump_market_count.reject!{|mk, v| !pump_markets.include?(mk) && v["life"] <= 0 } # reject any non_continuous pump
      pump_markets.each do |market, _|
        pump_market_count[market] ||= {}
        pump_market_count[market]["count"] ||= 0
        pump_market_count[market]["count"] += 1
        pump_market_count[market]["life"] = TIMEFRAME_FOR_PUMP_ACCEPTATION
      end
    end

    def warn_of_definitive_pump_detected
      pumped_markets = pump_market_count.select{|_,v| v["count"] >= PUMP_CERTAIN_COUNT }.map{|m,_| m}

      detected = pumped_markets.join(" | ")

      log "DEFINITIVE PUMP DETECTED #{detected}" if detected != ""
      pumped_markets.each do |pumped_market|
        make_order(pumped_market)
      end
    end

    def make_order(market)
      @order_track ||= {}
      @order_track[market] ||= {}

      return if order_track[market]["ban_until"] && order_track[market]["ban_until"] >= (Time.now - 3600)
      log "Making order for #{market}"
      @order_track[market]["ban_until"] = Time.now
      @order_track[market]["check_again"] = Time.now + 5
      price = last_price_of_market(market)
      buy_when = price * AUTOTRADER_BUY_PRICE
      sell_when = price * AUTOTRADER_SELL_PRICE
      currencies_to_buy = (AMOUNT / buy_when).round(8)

      if USE_REAL_ORDERS
        if ORDER_SELL_STRATEGY == :time
          log "[AUTOTRADER] Placing real order [TIME STRATEGY]"
          Thread::new{
            Client.pnd_time_based(AUTOTRADER_AMOUNT, buy_when, ORDER_SELL_TIME_STRATEGY_TIME, market)
          }
        else
          log "[AUTOTRADER] Placing real order [FIXED PRICE STRATEGY]"
          Thread::new{
             Client.pnd_fixed_price(AUTOTRADER_AMOUNT, buy_when, sell_when, market)
          }
        end
      else
        cost = currencies_to_buy * buy_when * 1.0025 # 0.0025% fee
        reward = currencies_to_buy * sell_when * 0.9975 # 0.0025% fee
        profit = reward - cost
        log "[AUTOTRADER] #{market} [BUY: price #{fts buy_when} cost #{fts cost}] [SELL price #{fts sell_when} #{fts reward}] [PROFIT: #{fts profit}]"
      end
    end

    def verify_if_orders_won
      return unless @order_track
      @order_track.select{|mk, v| v["check_again"] > Time.now}.each do |mk, v|
        log "[AUTOTRADER] Price check #{mk} after #{v["check_again"] - Time.now} #{fts last_price_of_market(mk)}"
      end
    end

    def public_get(url, params = {})
      uri = URI(url)
      uri.query = URI.encode_www_form(params)
      JSON.parse(Net::HTTP.get(uri))
    end

    def wait_until(interval = 0.1, max_time = 10)
      seconds = 0
      until yield || (seconds >= max_time) do
        sleep interval
        seconds += interval
      end
    end

    def fts(n)
      "%1.8f" % n
    end

    def pts(n)
      "%1.2f" % n
    end

    def log(str)
      puts "[#{Time.now.strftime('%d/%m/%Y %H:%M:%S')}] #{str}"
    end

    def log_debug(str)
      return unless DEBUG_MODE
      puts "[#{Time.now.strftime('%d/%m/%Y %H:%M:%S')}][DEBUG] #{str}"
    end
  end
end
