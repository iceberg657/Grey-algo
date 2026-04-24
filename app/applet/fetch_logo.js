const https = require('https');

https.get('https://deriv.com', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const match = data.match(/<svg[^>]*>.*?<\/svg>/ig);
        if (match) {
            match.forEach(svg => {
                if (svg.includes('deriv') || svg.includes('logo') || svg.includes('d')) {
                    console.log(svg.substring(0, 500));
                }
            });
        }
    });
});
