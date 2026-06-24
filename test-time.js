const axios = require('axios');
async function test() {
  const start = Date.now();
  const wcUrl = 'https://project-fomo.com/wp-json/wc/v3';
  const auth = { username: 'ck_e4b33e26694b5e81ed1f3b4b033bf9d1a23a1623', password: 'cs_19008259e84ee93c996da7b3c690943144d0059b' };
  
  const res = await axios.get(wcUrl + '/products', { auth, params: { per_page: 25, page: 1, orderby: 'id', order: 'asc' } });
  
  const withVariations = await Promise.all(
      res.data.map(async (p) => {
        if (p.type === 'variable' && p.variations?.length > 0) {
          try {
            const vres = await axios.get(`${wcUrl}/products/${p.id}/variations`, { auth, params: { per_page: 100 } })
            return { ...p, _variationDetails: vres.data }
          } catch {
            return p
          }
        }
        return p
      })
    )
  console.log(`Finished in ${Date.now() - start} ms. Items: ${withVariations.length}`);
}
test();
