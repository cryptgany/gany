
const ChartjsNode = require('chartjs-node');
require('./vendor/Chart.Financial');
var moment = require('moment')

function randomNumber(min, max) {
    return Math.random() * (max - min) + min;
}

function randomBar(date, lastClose) {
    var open = randomNumber(lastClose * .95, lastClose * 1.05);
    var close = randomNumber(open * .95, open * 1.05);
    var high = randomNumber(Math.max(open, close), Math.max(open, close) * 1.1);
    var low = randomNumber(Math.min(open, close) * .9, Math.min(open, close));
    return {
        t: date.valueOf(),
        o: open,
        h: high,
        l: low,
        c: close
    };
}

function genChart() {
    var dateFormat = 'MMMM DD YYYY';
    var date = moment('April 01 2017', dateFormat);
    var data = [randomBar(date, 30)];
    while (data.length < 60) {
        date = date.clone().add(1, 'd');
        if (date.isoWeekday() <= 5) {
            data.push(randomBar(date, data[data.length - 1].c));
        }
    }

    chartJsOptions = {
        type: 'financial',
        data: {
            datasets: [{
                label: "CHRT - Chart.js Corporation",
                data: data
            }]
        },
        options: {}
    }


    // 600x600 canvas size
    var chartNode = new ChartjsNode(600, 600);
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
        return chartNode.writeImageToFile('image/png', './testimage.png');
    }).then(() => {
        // chart is now written to the file path
        // ./testimage.png
    });
}

module.exports = genChart;
