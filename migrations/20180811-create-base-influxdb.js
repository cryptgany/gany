const Influx = require('influx');

const influx = new Influx.InfluxDB({
 host: 'localhost',
 database: 'gany',
  schema: [
    {
      measurement: 'ticker_data',
      fields: {
        open: Influx.FieldType.FLOAT,
        high: Influx.FieldType.FLOAT,
        low: Influx.FieldType.FLOAT,
        close: Influx.FieldType.FLOAT,
        volume: Influx.FieldType.FLOAT,
        volume24: Influx.FieldType.FLOAT,
      },
      tags: [ // BTC-NEO, Binance, 1D|1H|1|3|5|15
        'market', 'exchange', 'type'
      ]
    }
  ]
})

influx.dropDatabase('gany', console.log)

influx.getDatabaseNames().then(names => {
  if (!names.includes('gany')) {
  	console.log("DB didn't exist, creating it....")
    return influx.createDatabase('gany');
  }
})

influx.getDatabaseNames().then(console.log)
