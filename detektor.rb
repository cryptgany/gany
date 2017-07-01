require 'json'
require 'uri'
require 'net/http'
require 'time'

# class Client
HOST="https://bittrex.com/api/v1.1"
#   z = Detektor.watch(0.01, 0.998, 1.01, 'ANS')

#          require './detektor'; Detektor.watch
#          z = 
class Detektor
  VALUES = %w{ Volume Last Bid Ask } # you can add as you wish OpenBuyOrders OpenSellOrders
  PUMP_PERCENTAGE = 1.05 # if one second changes that percentage for any VALUES it will warn
  DUMP_PERCENTAGE = 0.95 # if one second changes that percentage for any VALUES it will warn
  DEBUG_MODE = false
  FAVORITE_COINS = /(ANS|DGB|SC|SNT)/
  USE_FAVORITE_COINS_ONLY = false

  class << self

    attr_accessor :previous_data, :current_data, :changes

    def watch
      log_debug "Reading first info..."
      res = public_get("#{HOST}/public/getmarketsummaries")["result"]
      log_debug "Got it, going for cycle"
      @previous_data = res

      while (true) do # every second, get market information
        fetch_time = Time.now

        log_debug "Reading current info..."
        res = public_get("#{HOST}/public/getmarketsummaries")["result"]
        @current_data = res
        log_debug "Got it, detecting changes"
        detect_changes
        warn_changes_detected
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
      @previous_data.reject!{|d| d["Volume"] <= 0}
      @current_data.reject!{|d| d["Volume"] <= 0}
    end

    def leave_only_btc_markets # optional?
      log_debug "Cleaning non-btc markets"
      @previous_data.reject!{|d| d["MarketName"] !~ /^BTC/}
      @current_data.reject! {|d| d["MarketName"] !~ /^BTC/}
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
            str = "[#{dtype} on #{market}]: #{change_values}"
          end
          log str
        end
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
