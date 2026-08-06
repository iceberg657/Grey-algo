const fetch = require('node-fetch');
fetch("http://localhost:3000/api/ctrader/status").then(res => res.text()).then(console.log);
