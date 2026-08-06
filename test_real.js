fetch("http://localhost:3000/api/ctrader/accounts", {
  headers: { "Authorization": "Bearer test" }
}).then(res => res.text()).then(text => console.log("RAW RESPONSE:", text)).catch(console.error);
