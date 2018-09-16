require('dotenv').config();
const phantom = require('phantom');
const findRemoveSync = require('find-remove')

// Constants and Configuration
const chartWebsite = process.env.GANY_CHARTS_CONNECTION || 'http://localhost:3000'
const chartFileDir = './tmp/images'


// Function reviews the chart storage directory and removes any old images
function deleteOldFiles() {
  // Remove files from the chartFileDir that are older than 15 minutes
  findRemoveSync(chartFileDir, {age: {seconds: 180}, extensions: '.png', limit: 100})
}


// Function returns a randomly generated file name and fixed directory path based on chartFileDir
function genFileLocation() {
  const fileName = `${Math.random().toString().replace('0.', '')}.png`
  return `${chartFileDir}/${fileName}`
}



// [MAIN] Function takes a screenshot of generated chart based on charting parameters and returns the file name and location
const genChart = async (bot = {}, chatTargetID = 0, pair = 'BTC-USD', exchange = 'Coinbase', interval = 'D', studies = '') => {

  bot.sendChatAction(chatTargetID, 'upload_photo')
  // For now market from gany is BTC-USD type, but coinmarketcal and TV want / seperator. 
  // Convert market format purely as we may switch this in future so easier to do it here.
  pair = pair.replace('-','/')

  const chartReqURL = `${chartWebsite}/?interval=${interval.toUpperCase()}&pair=${pair.toUpperCase()}&exchange=${exchange.toUpperCase()}&studies=${studies}`
  const instance = await phantom.create(['--disk-cache=true']);  
  const page = await instance.createPage();
  const imagePath = genFileLocation();

  // Delete any old chart files
  deleteOldFiles()

  // Adjust viewport size
  await page.property('viewportSize', {width: 900, height: 600})

  async function doRender(){
    await page.render(imagePath);
          bot.sendPhoto(chatTargetID, imagePath);
          instance.exit();
  }

  await page.on('onCallback', function(data){
    console.log('CALLBACK: ' + JSON.stringify(data));
    doRender();
  })


  await page.on('onResourceReceived', async function (responseData) {
      console.log(responseData.id + ' ' + responseData.status + ' - ' + responseData.url);
  })


  // Register listener for any page errors, easy bomb out exit
  await page.on('onError', async (errString = '') => {
    console.error(errString);
    await instance.exit();
    return null;
  })


await page.on('onLoadFinished', async(status) => {
  console.log('load finished');
})


  // Open page
  const status = await page.open(chartReqURL);
  if (status !== "success") {
    console.log('Unable to load url');
    phantom.exit()
  };
}


// Supported trading view studies
const studyArray = [{ ShortName: 'ACCD', LongName: 'Accumulation/Distribution' }, { ShortName: 'studyADR', LongName: 'ADR' }, { ShortName: 'AROON', LongName: 'Aroon' }, { ShortName: 'ATR', LongName: 'Average True Range' }, { ShortName: 'AwesomeOscillator', LongName: 'Awesome Oscillator' }, { ShortName: 'BB', LongName: 'Bollinger Bands' }, { ShortName: 'BollingerBandsR', LongName: 'Bollinger Bands %B' }, { ShortName: 'BollingerBandsWidth', LongName: 'Bollinger Bands Width' }, { ShortName: 'CMF', LongName: 'Chaikin Money Flow' }, { ShortName: 'ChaikinOscillator', LongName: 'Chaikin Oscillator' }, { ShortName: 'chandeMO', LongName: 'Chande Momentum Oscillator' }, { ShortName: 'ChoppinessIndex', LongName: 'Choppiness Index' }, { ShortName: 'CCI', LongName: 'Commodity Channel Index' }, { ShortName: 'CRSI', LongName: 'ConnorsRSI' }, { ShortName: 'CorrelationCoefficient', LongName: 'Correlation Coefficient' }, { ShortName: 'DetrendedPriceOscillator', LongName: 'Detrended Price Oscillator' }, { ShortName: 'DM', LongName: 'Directional Movement' }, { ShortName: 'DONCH', LongName: 'Donchian Channels' }, { ShortName: 'DoubleEMA', LongName: 'Double EMA' }, { ShortName: 'EaseOfMovement', LongName: 'Ease Of Movement' }, { ShortName: 'EFI', LongName: 'Elder\'s Force Index' }, { ShortName: 'ElliottWave', LongName: 'Elliott Wave' }, { ShortName: 'ENV', LongName: 'Envelope' }, { ShortName: 'FisherTransform', LongName: 'Fisher Transform' }, { ShortName: 'HV', LongName: 'Historical Volatility' }, { ShortName: 'hullMA', LongName: 'Hull Moving Average' }, { ShortName: 'IchimokuCloud', LongName: 'Ichimoku Cloud' }, { ShortName: 'KLTNR', LongName: 'Keltner Channels' }, { ShortName: 'KST', LongName: 'Know Sure Thing' }, { ShortName: 'LinearRegression', LongName: 'Linear Regression' }, { ShortName: 'MACD', LongName: 'MACD' }, { ShortName: 'MOM', LongName: 'Momentum' }, { ShortName: 'MF', LongName: 'Money Flow' }, { ShortName: 'MoonPhases', LongName: 'Moon Phases' }, { ShortName: 'MASimple', LongName: 'Moving Average' }, { ShortName: 'MAExp', LongName: 'Moving Average Exponentional' }, { ShortName: 'MAWeighted', LongName: 'Moving Average Weighted' }, { ShortName: 'OBV', LongName: 'On Balance Volume' }, { ShortName: 'PSAR', LongName: 'Parabolic SAR' }, { ShortName: 'PivotPointsHighLow', LongName: 'Pivot Points High Low' }, { ShortName: 'PivotPointsStandard', LongName: 'Pivot Points Standard' }, { ShortName: 'PriceOsc', LongName: 'Price Oscillator' }, { ShortName: 'PriceVolumeTrend', LongName: 'Price Volume Trend' }, { ShortName: 'ROC', LongName: 'Rate Of Change' }, { ShortName: 'RSI', LongName: 'Relative Strength Index' }, { ShortName: 'VigorIndex', LongName: 'Relative Vigor Index' }, { ShortName: 'VolatilityIndex', LongName: 'Relative Volatility Index' }, { ShortName: 'SMIErgodicIndicator', LongName: 'SMI Ergodic Indicator' }, { ShortName: 'SMIErgodicOscillator', LongName: 'SMI Ergodic Oscillator' }, { ShortName: 'Stochastic', LongName: 'Stochastic' }, { ShortName: 'StochasticRSI', LongName: 'Stochastic RSI' }, { ShortName: 'TripleEMA', LongName: 'Triple EMA' }, { ShortName: 'Trix', LongName: 'TRIX' }, { ShortName: 'UltimateOsc', LongName: 'Ultimate Oscillator' }, { ShortName: 'VSTOP', LongName: 'Volatility Stop' }, { ShortName: 'Volume', LongName: 'Volume' }, { ShortName: 'VWAP', LongName: 'VWAP' }, { ShortName: 'MAVolumeWeighted', LongName: 'VWMA' }, { ShortName: 'WilliamR', LongName: 'Williams %R' }, { ShortName: 'WilliamsAlligator', LongName: 'Williams Alligator' }, { ShortName: 'WilliamsFractal', LongName: 'Williams Fractal' }, { ShortName: 'ZigZag', LongName: 'Zig Zag' }]

function convertStudyNames(studyShortNames = []){
  // Example studies = ['ACCD','AROON']
  const longStudyNames = studyShortNames.map((studyShortName) => {
    const foundStudy = studyArray.find(study => study.ShortName.toUpperCase() === studyShortName.toUpperCase())
    if(!foundStudy){
      return false
    }
    return foundStudy.LongName;
  }).filter(x => (x !== false ))
  return longStudyNames;
}

function isAChartStudy(testString = ""){
  const foundStudy = studyArray.find(study => study.ShortName.toUpperCase() === testString.toUpperCase());
  if(!foundStudy){
    return false
  }
  return true;
}

module.exports = {
  genChart,
  isAChartStudy,
}
