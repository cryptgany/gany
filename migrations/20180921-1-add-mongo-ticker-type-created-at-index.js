// migration in order to run next 20180921-2 migration file smoothly
// run in mongo client
use detektor;
db.ticker_datas.createIndex( { ticker_type: 1, createdAt: 1 } )
