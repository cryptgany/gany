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
        var dateFormat = 'MMM Do HH:00';
    var date = moment(new Date(), dateFormat);
    date.format(dateFormat)
    var formattedData = []
    var time = 1
    if (data.length >= 72) {
        returned = reduceDataSize(data, type);
        data = returned[0]
        time = returned[1]
    }
    // data = data.reverse()
    data.forEach((d) => {
        formattedData.push({
            t: date,
            o: d.open,
            h: d.minuteHigh || d.high,
            l: d.minuteLow  || d.low,
            c: d.close
        })
        if (type == 'minute') {
            date = date.clone().subtract(time, 'm');
        } else {
            date = date.clone().subtract(time, 'h');
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
        options: {
            scales: {
                xAxes: [{
                type: 'time',
                    time: {
                        displayFormats: {
                           'millisecond': dateFormat,
                           'second': dateFormat,
                           'minute': dateFormat,
                           'hour': dateFormat,
                           'day': dateFormat,
                           'week': dateFormat,
                           'month': dateFormat,
                           'quarter': dateFormat,
                           'year': dateFormat,
                        }
                    }
                }],
                yAxes: [
                    {
                        ticks: {
                            callback: function(label, index, labels) {
                                return label.toFixed(8);
                            }
                        },
                    }
                ]
            }
        }
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

function reduceDataSize(data, type) {
    var newSize = parseInt(data.length / 36)
    var newData = []
    data.eachPair(newSize, (e) => {
        newData.push(sumFinancialValues(e, type))
    })
    return [newData, newSize]
}

function sumFinancialValues(data, type) {
    var o = data[0].open
    if (type == 'minute') {
        var h = data[0].minuteHigh
        var l = data[0].minuteLow
    } else {
        var h = data[0].high
        var l = data[0].low
    }

    var c = data[data.length - 1].close
    data.forEach((e) => {
        if (type == 'minute') {
            if (e.minuteHigh > h)
                h = e.minuteHigh;
            if (e.minuteLow < l)
                l = e.minuteLow;
        } else {
            if (e.high > h)
                h = e.high;
            if (e.low < l)
                l = e.low;
        }
    })
    return {open: o, high: h, low: l, close: c}
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
