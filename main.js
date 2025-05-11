const { sepoliamain } = require('./sepolia');
const { arbmain } = require('./arb');
const { plumemain } = require('./plume');
const { pointmain } = require('./cekpoint');
const { displayskw } = require('./skw/displayskw');
const cron = require('node-cron');
const chalk = require('chalk');

async function startBot() {
  console.clear();
  displayskw();
  await sepoliamain();
  await arbmain();
  await plumemain();
  await pointmain();
}

async function main() {
  cron.schedule('0 1 * * *', async () => { 
    await startBot();
    console.log();
    console.log(chalk.hex('#FF00FF')(`Cron AKTIF`));
    console.log(chalk.hex('#FF1493')('Jam 08:00 WIB Autobot Akan Run'));
  });

  await startBot();
  console.log();
  console.log(chalk.hex('#FF00FF')(`Cron AKTIF`));
  console.log(chalk.hex('#FF1493')('Jam 08:00 WIB Autobot Akan Run'));
}

main();
