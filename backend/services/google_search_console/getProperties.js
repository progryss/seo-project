const {searchconsole} = require('./index.js');

// 3. Example: Fetch list of all properties (sites)
const getProperties = async ()=> {
  const res = await searchconsole.sites.list();
  console.log('Your GSC properties:', res.data.siteEntry);
}

module.exports = { getProperties };