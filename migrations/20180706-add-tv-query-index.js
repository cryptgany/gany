// Trading view query
use detektor;
db.ticker_datas.createIndex( { exchange: 1, market: 1, ticker_type: 1, createdAt: 1 } )