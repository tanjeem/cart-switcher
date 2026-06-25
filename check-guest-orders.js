const axios = require('axios');

async function checkOrders() {
  const url = 'https://project-fomo.com/wp-json/wc/v3/orders?per_page=10&_nocache=' + Date.now() + '&consumer_key=ck_ba31fd5dc7122b232f9ba9d2eef49e1d40f6a5d2&consumer_secret=cs_1a52dffa9aa84654f0766f1f673114b180249d2e';
  
  try {
    const res = await axios.get(url);
    const orders = res.data;
    
    let guestCount = 0;
    let registeredCount = 0;
    
    console.log(`Checking ${orders.length} recent orders...`);
    orders.forEach(order => {
      if (order.customer_id === 0) {
        guestCount++;
        console.log(`Order #${order.id} - Guest Checkout (${order.billing.email})`);
      } else {
        registeredCount++;
        console.log(`Order #${order.id} - Registered Customer ID: ${order.customer_id} (${order.billing.email})`);
      }
    });
    
    console.log(`\nSummary of last ${orders.length} orders:`);
    console.log(`Guest Checkouts: ${guestCount}`);
    console.log(`Registered Customers: ${registeredCount}`);
  } catch(err) {
    console.error("Error fetching orders:", err.response ? err.response.data : err.message);
  }
}

checkOrders();
