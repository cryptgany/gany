const phantom = require('phantom');
const findRemoveSync = require('find-remove')
const events = require('events');


// Constants and Configuration
const chartWebsite = 'https://flamboyant-mclean-510776.netlify.com'
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
const genChart = async (bot = {}, chatTargetID = 0, pair = 'BTC/USD', exchange = 'Coinbase', interval = 'D', studies = '') => {

  const chartReqURL = `${chartWebsite}/?interval=${interval.toUpperCase()}&pair=${pair.toUpperCase()}&exchange=${exchange.toUpperCase()}&studies=${studies}`
  const instance = await phantom.create();
  const page = await instance.createPage();
  const imagePath = genFileLocation();
  const resourceWait  = 200;
  const maxRenderWait = 3000;

  // Counter for resource requests
  let count = 0;
  let forcedRenderTimeout;
  let renderTimeout;

  // Delete any old chart files
  deleteOldFiles()

  // Adjust viewport size
  await page.property('viewportSize', {width: 900, height: 600})

  async function  doRender(){
    await page.render(imagePath);
          bot.sendPhoto(chatTargetID, imagePath);
          instance.exit();
  }

  // Register listener for requested being sent (debug)
  await page.on('onResourceRequested', function (requestData) {
    count += 1;
    console.info('> ' + requestData.id + ' - ' + requestData.url);
    clearTimeout(renderTimeout)
  });


  await page.on('onResourceReceived', async function (responseData) {
    if (!responseData.stage || responseData.stage === 'end') {
      count -= 1;
      console.log(responseData.id + ' ' + responseData.status + ' - ' + responseData.url);
      if (count === 0) {
          renderTimeout = setTimeout(doRender, resourceWait);
      }
  }
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
    phantom.exit();
  } else {
      forcedRenderTimeout = setTimeout(async function () {
          console.log(count);
          await doRender()
      }, maxRenderWait);
  }

}

module.exports = {
  genChart
}
