const ChartjsNode = require('chartjs-node');
require('./vendor/Chart.Financial');
var moment = require('moment')

function randomNumber(min = 0, max = 999999999) {
    return Math.random() * (max - min) + min;
}

function genChart(exchange, market, data, type = 'minute') {// type = minute/hour/day
    var name = randomNumber() + "_chart.png"
    if (type == 'minute')
        var dateFormat = 'hh:mm';
    if (type == 'hour')
        var dateFormat = 'MMM Do hh:mm';
    var date = moment(new Date(), dateFormat);
    var formattedData = []
    if (data.length > 35) {
        [data, time] = reduceDataSize(data);
    }
    data.forEach((d) => {
        if (type == 'minute') {
            formattedData.push({
                t: date,
                o: d.open,
                h: d.minuteHigh,
                l: d.minuteLow,
                c: d.close
            })
            date = date.clone().add(1, 'm');
        } else {
            formattedData.push({
                t: date,
                o: d.open,
                h: d.high,
                l: d.low,
                c: d.close
            })
            date = date.clone().add(1, 'h');
        }
    })
    chartJsOptions = {
        type: 'financial',
        data: {
            datasets: [{
                label: exchange + " - " + market + " | CryptGany ~ CryptoWise.net",
                data: formattedData
            }]
        },
        options: {}
    }


    // 600x600 canvas size
    var chartNode = new ChartjsNode(800, 500);
    return chartNode.drawChart(chartJsOptions).then(() => {
        // chart is created

        // get image as png buffer
        return chartNode.getImageBuffer('image/png');
    }).then(buffer => {
        Array.isArray(buffer) // => true
        // as a stream
        return chartNode.getImageStream('image/png');
    }).then(streamResult => {
        // using the length property you can do things like
        // directly upload the image to s3 by using the
        // stream and length properties
        streamResult.stream // => Stream object
        streamResult.length // => Integer length of stream
        // write to a file
        return chartNode.writeImageToFile('image/png', './tmp/images/' + name);
    }).then(() => {
        return './tmp/images/' + name
        // chart is now written to the file path
        // ./testimage.png
    });
}

function reduceDataSize(data) {
    var length = parseInt(data.length() / 35)
    var newData = []
    data.eachPair(length, (e) => {

    })
}

function sumFinancialValues(data) {
    var o,h,l,c = 0;
    data.forEach((e) => {
        
    })
    return [o,h,l,c].map((e) => { return e / data.length })
}

Array.prototype.eachPair = function(n, callback) { // return in groups of n
    var count = 0; var idx = 0; var lgt = this.length
    var cache = []
    this.forEach((e) => {
        cache.push(e)
        count += 1; idx += 1
        if (count >= n || idx == lgt) {
            callback(cache)
            cache = []
            count = 0
        }
    })
}

module.exports = genChart;
