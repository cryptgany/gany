require('dotenv').config();
const Influx = require('influx');

const influx = new Influx.InfluxDB({
 host: process.env.INFLUX_HOST,
 username: process.env.INFLUX_USER,
 password: process.env.INFLUX_PASS,
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


function testWrite(pair) {
  d = new Date(2018, 7, 22, 23, 50, 11, 0)
  data = []
  var open=10.32, close=10.30, high=10.35, low=10.31, volume=100; volume24=120;
  for(let i = 5000; i >= 0; i--) {
    let dir = Math.random() > 0.5 // wether we went "up" or "down"
    if (dir) {
      open += Math.random() * 0.1
      high += Math.random() * 0.1
      low += Math.random() * 0.1
      close += Math.random() * 0.1
      volume = Math.random() * 100
      volume24 = Math.random() * 1000
    } else {
      open -= Math.random() * 0.1
      high -= Math.random() * 0.1
      low -= Math.random() * 0.1
      close -= Math.random() * 0.1
      volume = Math.random() * 100
      volume24 = Math.random() * 1000
    }
    data.push({
      measurement: 'ticker_data',
      tags: { market: pair, exchange: 'Binance', type: '1' },
      fields: { open: open, high: high, low: low, close: close, volume: volume, volume24: volume24 },
      timestamp: new Date(d.getTime()-60000 * i)
    })
  }
  var st = new Date()
  var se = new Date()
  influx.writePoints(data, {precision: 's'}).then((e) => { se = new Date(); console.log("Inserted all records in", se-st) })
}

function testRead(pair) {
  st = new Date()
  influx.query(`select * from ticker_data where market='${pair}'`).then(results => {
    se = new Date()
    console.log("Finished getting", results.length, "records in", se-st)
  })
}


testWrite("HHSF1-BTC")
testWrite("WER2-BTC")
testWrite("WEF31-BTC")
testWrite("WEF52-BTC")
testWrite("WEF252-BTC")
testWrite("ASDZA-BTC")


testRead("HHSF1-BTC")
testRead("WER2-BTC")
testRead("WEF31-BTC")
testRead("WEF52-BTC")
testRead("ASDZA-BTC")



t2.small
100GB/1k IOPS - 40GB/2k IOPS
reading avg: 1100 ~ 1700 (once on cache its 1100~1200)
write avg: 2100 ~ 2200



t2.large
100GB/1k IOPS - 40GB/2k IOPS
reading avg: 1100 ~ 1700 (once on cache its 1100~1200)
write avg: 2100 ~ 2200


t2.small
100GB/2k IOPS - 60GB/3k IOPS
reading avg: 920 ~ 1200
write avg: 2100 ~ 2700 (writing probably uses more CPU/RAM)


t2.small
100GB/500 IOPS - 60GB/700 IOPS
reading avg: 760 ~ 900 (WTF)
write avg: 2100 ~ 2300 (writing probably uses more CPU/RAM) (peak to 6300)
--------------------------------------

t2.small
100GB/300 IOPS - 60GB/500 IOPS
reading avg: 773 ~ 815
write avg: 2170 ~ 2341

testWrite("CCC1-BTC")
>Inserted all records in 2341
testWrite("CCC2-BTC")
>Inserted all records in 2174
testWrite("CCC3-BTC")
>Inserted all records in 2170
testRead("CCC1-BTC")
>Finished getting 5001 records in 773
testRead("CCC2-BTC")
>Finished getting 5001 records in 1000
testRead("CCC3-BTC")
>Finished getting 5001 records in 815
