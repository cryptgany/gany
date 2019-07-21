require('dotenv').config();
//const phantom = require('phantom');
const puppeteer = require('puppeteer');
const findRemoveSync = require('find-remove')

// Constants and Configuration
const chartWebsite = process.env.GANY_CHARTS_CONNECTION || 'http://gany_charts:3000'
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
const genChart = async (bot = {}, chatTargetID = 0, pair = 'BTC-USD', exchange = 'Coinbase', interval = 'D', studies = '', logScale = 1, theme = 'Light') => {

  bot.sendChatAction(chatTargetID, 'upload_photo')
  // For now market from gany is BTC-USD type, but coinmarketcal and TV want / seperator. 
  // Convert market format purely as we may switch this in future so easier to do it here.
  pair = pair.replace('-','/')

  const chartReqURL = `${chartWebsite}/?interval=${interval.toUpperCase()}&pair=${pair.toUpperCase()}&exchange=${exchange.toUpperCase()}&studies=${studies}&logScale=${logScale}&theme=${theme}`
  const imagePath = genFileLocation();

  // Delete any old chart files
  deleteOldFiles()

  // ensure phantom process ends if nothing below triggers
  const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
  const page = await browser.newPage();

  setTimeout(() => { console.log("Killing browser instance if it's still around"); browser.close(); }, 20000);

  async function doRender(){
      await page.screenshot({path: imagePath});
      await browser.close();
      bot.sendPhoto(chatTargetID, imagePath);
      console.log(`Screenshot File: ${imagePath}`)
  }

  console.log(`Opening page: ${chartReqURL}`)
  await page.goto(chartReqURL).catch(err => console.log(err));

  page.on('console', async (msg) => {
    //console.log(msg);
    if (msg._type === "log" && msg._text === "Take screenshot!"){
        await doRender()
    }   
  });



}




// Supported trading view studies
const studyArray = [{ ShortName: 'ACCD', LongName: 'Accumulation/Distribution' }, { ShortName: 'AD', LongName: 'Advance/Decline' }, { ShortName: 'ADX', LongName: 'Average Directional Index' }, { ShortName: 'ALMA', LongName: 'Arnaud Legoux Moving Average' }, { ShortName: 'AO', LongName: 'Awesome Oscillator' }, { ShortName: 'AROON', LongName: 'Aroon' }, { ShortName: 'ASI', LongName: 'Accumulative Swing Index' }, { ShortName: 'ATR', LongName: 'Average True Range' }, { ShortName: 'BB', LongName: 'Bollinger Bands' }, { ShortName: 'BBR', LongName: 'Bollinger Bands %B' }, { ShortName: 'BBW', LongName: 'Bollinger Bands Width' }, { ShortName: 'BoP', LongName: 'Balance of Power' }, { ShortName: 'CC', LongName: 'Correlation Coeff' }, { ShortName: 'CCI', LongName: 'Commodity Channel Index' }, { ShortName: 'CI', LongName: 'Choppiness Index' }, { ShortName: 'CKS', LongName: 'Chande Kroll Stop' }, { ShortName: 'CLOUD', LongName: 'Ichimoku Cloud' }, { ShortName: 'CMF', LongName: 'Chaikin Money Flow' }, { ShortName: 'CMO', LongName: 'Chande Momentum Oscillator' }, { ShortName: 'CO', LongName: 'Chaikin Oscillator' }, { ShortName: 'CopCurve', LongName: 'Coppock Curve' }, { ShortName: 'CRSI', LongName: 'Connors RSI' }, { ShortName: 'CZ', LongName: 'Chop Zone' }, { ShortName: 'DEMA', LongName: 'Double Exponential Moving Average' }, { ShortName: 'DM', LongName: 'Directional Movement Index' }, { ShortName: 'DONCH', LongName: 'Donchian Channels' }, { ShortName: 'DPO', LongName: 'Detrended Price Oscillator' }, { ShortName: 'EFI', LongName: 'Elders Force Index' }, { ShortName: 'EMAC', LongName: 'EMA Cross' }, { ShortName: 'ENV', LongName: 'Envelope' }, { ShortName: 'EOM', LongName: 'Ease of Movement' }, { ShortName: 'FT', LongName: 'Fisher Transform' }, { ShortName: 'HMA', LongName: 'Hull MA' }, { ShortName: 'HV', LongName: 'Historical Volatility' }, { ShortName: 'KELC', LongName: 'Keltner Channels' }, { ShortName: 'KLINGO', LongName: 'Klinger Oscillator' }, { ShortName: 'KST', LongName: 'Know Sure Thing' }, { ShortName: 'LRC', LongName: 'Linear Regression Curve' }, { ShortName: 'LSMA', LongName: 'Least Squares Moving Average' }, { ShortName: 'MA', LongName: 'Moving Average' }, { ShortName: 'MAC', LongName: 'Moving Average Channel' }, { ShortName: 'MACD', LongName: 'MACD' }, { ShortName: 'MAEMAX', LongName: 'MA with EMA Cross' }, { ShortName: 'MAEXP', LongName: 'Moving Average Exponential' }, { ShortName: 'MASSI', LongName: 'Mass Index' }, { ShortName: 'MAWEIGHT', LongName: 'Moving Average Weighted' }, { ShortName: 'MAX', LongName: 'MA Cross' }, { ShortName: 'MCDYN', LongName: 'McGinley Dynamic' }, { ShortName: 'MF', LongName: 'Money Flow' }, { ShortName: 'MOM', LongName: 'Momentum' }, { ShortName: 'NV', LongName: 'Net Volume' }, { ShortName: 'OBV', LongName: 'On Balance Volume' }, { ShortName: 'PC', LongName: 'Price Channel' }, { ShortName: 'PIVOTS', LongName: 'Pivot Points Standard' }, { ShortName: 'POSC', LongName: 'Price Oscillator' }, { ShortName: 'PSAR', LongName: 'Parabolic SAR' }, { ShortName: 'PVT', LongName: 'Price Volume Trend' }, { ShortName: 'ROC', LongName: 'Rate Of Change' }, { ShortName: 'RSI', LongName: 'Relative Strength Index' }, { ShortName: 'RVI', LongName: 'Relative Vigor Index' }, { ShortName: 'RVOI', LongName: 'Relative Volatility Index' }, { ShortName: 'ShortName', LongName: 'Long name' }, { ShortName: 'SMIIO', LongName: 'SMI Ergodic Indicator/Oscillator' }, { ShortName: 'SMMA', LongName: 'Smoothed Moving Average' }, { ShortName: 'Stoch', LongName: 'Stochastic' }, { ShortName: 'StochRSI', LongName: 'Stochastic RSI' }, { ShortName: 'SuperTrend', LongName: 'SuperTrend' }, { ShortName: 'TEMA', LongName: 'Triple EMA' }, { ShortName: 'Trix', LongName: 'TRIX' }, { ShortName: 'TSI', LongName: 'True Strength Indicator' }, { ShortName: 'ULTO', LongName: 'Ultimate Oscillator' }, { ShortName: 'VOLO', LongName: 'Volume Oscillator' }, { ShortName: 'Volume', LongName: 'Volume' }, { ShortName: 'VORTI', LongName: 'Vortex Indicator' }, { ShortName: 'VWAP', LongName: 'VWAP' }, { ShortName: 'VWMA', LongName: 'VWMA' }, { ShortName: 'WILLALLI', LongName: 'Williams Alligator' }, { ShortName: 'WILLFRAC', LongName: 'Williams Fractals' }, { ShortName: 'WILLR', LongName: 'Willams %R' }, { ShortName: 'ZigZag', LongName: 'Zig Zag' }]

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

function getStudyListString(){
  let replyString = ""
  studyArray.forEach((study, index) => {
    replyString += `${study.LongName} (${study.ShortName})\n`
  }) 
  return replyString;
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
  getStudyListString,
}
