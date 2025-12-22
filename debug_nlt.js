const https = require('https');

const url = 'https://bolls.life/get-text/NLT/43/3/';

console.log('Fetching from ' + url);

https.get(url, (resp) => {
    let data = '';

    // A chunk of data has been received.
    resp.on('data', (chunk) => {
        data += chunk;
    });

    // The whole response has been received.
    resp.on('end', () => {
        try {
            const json = JSON.parse(data);
            // Log first 5 verses
            console.log(JSON.stringify(json.filter(v => v.verse <= 5), null, 2));
        } catch (e) {
            console.error('Error parsing JSON:', e.message);
            console.log('Raw data sample:', data.substring(0, 100));
        }
    });

}).on("error", (err) => {
    console.log("Error: " + err.message);
});
