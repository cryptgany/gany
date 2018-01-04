// This happened because Redis brought back items from oldest to newest, it was thought that it was the other way
// Resulting in an inverted open/close
// We do it in steps so we are sure we don't drop the server down

var TickerData = require('../models/ticker_data')

TickerData.count({}, (err,c)=>{ console.log(c) })

TickerData.collection.update({}, { $rename: { "open": "tmpclose", "close": "tmpopen" } }, { multi: true }, (err,c)=>{
	console.log(err,c)
	console.log("Done, records updated.")
});

// RUN SEPARATED

TickerData.collection.update({}, { $rename: { "tmpclose": "close", "tmpopen": "open" } }, { multi: true }, (err,c)=>{
	console.log(err,c)
	console.log("Done, records updated.")
});
