const ChartjsNode = require('chartjs-node');
require('./vendor/Chart.Financial');
var moment = require('moment')

function randomNumber(min = 0, max = 999999999) {
    return Math.random() * (max - min) + min;
}

function genChart(exchange, market, data, type = 'minute') {// type = minute/hour/day
    var name = randomNumber() + "_chart.png"
    var dateFormat = 'hh mm';
    var date = moment(new Date(), dateFormat);
    var formattedData = []
    data.forEach((d) => {
        formattedData.push({
            t: date,
            o: d.open,
            h: d.minuteHigh,
            l: d.minuteLow,
            c: d.close
        })
        date = date.clone().add(1, 'm');
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

module.exports = genChart;
