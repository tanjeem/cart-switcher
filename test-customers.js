const axios = require('axios');

async function test() {
  const url = 'https://project-fomo.com/wp-json/wc/v3/customers?per_page=1&_nocache=' + Date.now() + '&consumer_key=ck_ba31fd5dc7122b232f9ba9d2eef49e1d40f6a5d2&consumer_secret=cs_1a52dffa9aa84654f0766f1f673114b180249d2e';
  try {
    const res = await axios.get(url);
    console.log("Customer GET Count:", res.headers['x-wp-total']);
    
    const headRes = await axios.head(url);
    console.log("Customer HEAD Count:", headRes.headers['x-wp-total']);
  } catch(err) {
    console.error("Error:", err.response ? err.response.data : err.message);
  }
}
test();
