const { sepoliamain } = require('./sepolia');
const { arbmain } = require('./arb');
const { plumemain } = require('./plume');
const { displayskw } = require('./skw/displayskw');

(async () => {
  console.clear();
  displayskw();
  await sepoliamain();
  await arbmain();
  await plumemain();
})();
