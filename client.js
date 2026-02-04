const http = require('http');
const crypto = require('crypto');

const API_URL = 'http://localhost:3000/device/real/query';
const TOKEN = 'interview_token_123';
const MAX_BATCH_SIZE = 10;
const RATE_LIMIT_DELAY = 1000;
function generateSerialNumbers() {
  const sns = [];
  for (let i = 0; i < 500; i++) {
    sns.push(`SN-${i.toString().padStart(3, '0')}`);
  }
  return sns;
}

function generateSignature(url, token, timestamp) {
  const data = url + token + timestamp;
  return crypto.createHash('md5').update(data).digest('hex');
}

// Make a single request
function makeRequest(snList) {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now().toString();
    const signature = generateSignature('/device/real/query', TOKEN, timestamp);

    const postData = JSON.stringify({ sn_list: snList });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/device/real/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'signature': signature,
        'timestamp': timestamp
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}
async function fetchAllDevices() {
  const allSNs = generateSerialNumbers();
  const batches = [];
  for (let i = 0; i < allSNs.length; i += MAX_BATCH_SIZE) {
    batches.push(allSNs.slice(i, i + MAX_BATCH_SIZE));
  }

  const allResults = [];
  let retryCount = 0;
  const maxRetries = 3;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} devices)`);

    let success = false;
    while (!success && retryCount < maxRetries) {
      try {
        const result = await makeRequest(batch);
        allResults.push(...result.data);
        success = true;
        retryCount = 0;
      } catch (error) {
        console.error(`Error on batch ${i + 1}: ${error.message}`);
        if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
          console.log('Rate limit hit, retrying after delay...');
          retryCount++;
        } else {
          retryCount++;
        }
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY * (retryCount + 1)));
        }
      }
    }

    if (!success) {
      console.error(`Failed to process batch ${i + 1} after ${maxRetries} retries`);
    }
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }
  }

  return allResults;
}
function aggregateResults(results) {
  const summary = {
    totalDevices: results.length,
    onlineDevices: results.filter(r => r.status === 'Online').length,
    offlineDevices: results.filter(r => r.status === 'Offline').length,
    totalPower: results.reduce((sum, r) => sum + parseFloat(r.power), 0).toFixed(2) + ' kW'
  };
  return summary;
}
async function main() {
  try {
    console.log('Starting EnergyGrid Data Aggregator...');

    const results = await fetchAllDevices();

    const summary = aggregateResults(results);
    
    console.log('\nAggregation Summary:');

    console.log(JSON.stringify(summary, null, 2));

    console.log('\nSample device data:');
    
    console.log(JSON.stringify(results.slice(0, 5), null, 2));

  } catch (error) {
    console.error('Main error:', error);
  }
}

main();