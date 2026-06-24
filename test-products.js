const axios = require('axios');
const wcUrl = 'https://project-fomo.com/wp-json/wc/v3/products';
const auth = {
  username: 'ck_e4b33e26694b5e81ed1f3b4b033bf9d1a23a1623',
  password: 'cs_19008259e84ee93c996da7b3c690943144d0059b'
};

async function test() {
  try {
    const res1 = await axios.get(wcUrl, { auth, params: { per_page: 5, page: 1 } });
    console.log('Without orderby:', res1.data.length);
    
    const res2 = await axios.get(wcUrl, { auth, params: { per_page: 5, page: 1, orderby: 'id', order: 'asc' } });
    console.log('With orderby id:', res2.data.length);
  } catch(e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
test();
