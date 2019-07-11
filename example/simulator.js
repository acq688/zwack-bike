var ZwackBLE = require('../lib/zwack-ble-sensor');
const readline = require('readline');
const http = require('http');

var argv = require('minimist')(process.argv.slice(2));
var metricsServerUrl = argv.server;
if (metricsServerUrl === undefined){
  console.error("Error: server parameter is required");
  process.exit(1);
}

// default parameters
var cadence = 90;
var power = 250;
var randomness = 0;
var sensorName = 'Zwack';

var stroke_count = 0;
var notificationInterval = 700;
var watts = power;

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

var zwackBLE = new ZwackBLE({ 
  name: sensorName,
  modelNumber: 'ZW-101',
  serialNumber: '1'
});

process.stdin.on('keypress', (str, key) => {
  if (key.name === 'x' || key.name == 'q' || ( key.ctrl && key.name == 'c' ) ) {
    process.exit(); // eslint-disable-line no-process-exit
  } else if (key.name === 'l') {
    listKeys();
  }
});


var notifyPowerCSP = function() {
  watts = Math.floor(Math.random() * randomness + power);

  try {
    zwackBLE.notifyCSP({'watts': watts});
  }
  catch( e ) {
    console.error(e);
  }
  
  setTimeout(notifyPowerCSP, notificationInterval);
};

var notifyCadenceCSP = function() {
  stroke_count += 1;
  if( cadence <= 0) {
    cadence = 0;
    setTimeout(notifyCadenceCSP, notificationInterval);
    return;
  }
  try {
    zwackBLE.notifyCSP({'watts': watts, 'rev_count': stroke_count });
  }
  catch( e ) {
    console.error(e);
  }
  
  setTimeout(notifyCadenceCSP, 60 * 1000/(Math.random() * randomness + cadence));
};


function listKeys() {
  console.log(`\nList of Available Keys`);
  console.log('x/q - Exit');
  console.log();
}

function pollMetricsFromServer() {
  http.get(metricsServerUrl, function(res){
    var body = '';

    res.on('data', function(chunk){
        body += chunk;
    });

    res.on('end', function(){
        var response = JSON.parse(body);
        console.log("Got a response:", "power:", response.power, "cadence:", response.cadence);
        cadence = response.cadence;
        power = response.power;
    });
  }).on('error', function(e){
    console.log("Got an error: ", e);
  });

  setTimeout(pollMetricsFromServer, notificationInterval);
}

// Main
console.log(`[ZWack] Faking test data for sensor: ${sensorName}`);

listKeys();
notifyPowerCSP();
notifyCadenceCSP();
pollMetricsFromServer();
