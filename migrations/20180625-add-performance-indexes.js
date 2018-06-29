// As of today, we found out we don't have indexes... such a terrible setup.
// Run on raw mongo CLI

use detektor;
db.payments.createIndex( {telegram_id: 1} )
db.signals.createIndex( { exchange: 1, market: 1 } )
db.signals.createIndex( { exchange: 1 } )
db.signals.createIndex( { market: 1 } )
db.subscribers.createIndex( { telegram_id: 1 } )
db.subscribers.createIndex( { username: 1 } )
db.subscribers.createIndex( { btc_address: 1 } )
db.ticker_datas.createIndex( { exchange: 1 } )
db.ticker_datas.createIndex( { market: 1 } )
db.ticker_datas.createIndex( { ticker_type: 1 } )
db.ticker_datas.createIndex( { exchange: 1, market: 1, ticker_type: 1 } )
