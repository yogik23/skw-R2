const { ethers } = require('ethers');
const axios = require('axios');
const chalk = require('chalk');
const fs = require("fs");
const path = require("path");

const {
  usdcAddress,
  r2usdAddress,
  sr2usdAddress,
  erc20_abi,
  swap_usdc,
  stake_r2u,
  delay,
  approve,
  checkBalance,
  getFormattedBalance,
} = require('./skw/config');

const RPC = "https://bsc-testnet-rpc.publicnode.com";
const provider = new ethers.JsonRpcProvider(RPC);

const privateKeys = fs.readFileSync(path.join(__dirname, "privatekey.txt"), "utf-8")
  .split("\n")
  .map(k => k.trim())
  .filter(k => k.length > 0);

async function swapUSDC(wallet) {
  try {
    const usdcBalancewei = await checkBalance(wallet, usdcAddress);
    const usdcBalanceRaw = await getFormattedBalance(wallet, usdcAddress, 6);
    const r2usdBalanceRaw = await getFormattedBalance(wallet, r2usdAddress, 6);
    const usdcBalance = parseFloat(usdcBalanceRaw).toFixed(1);
    const r2usdBalance = parseFloat(r2usdBalanceRaw).toFixed(1);

    console.log(chalk.hex('#7B68EE')(`💰 Saldo USDC: ${usdcBalance}`));
    console.log(chalk.hex('#7B68EE')(`💰 Saldo R2USD: ${r2usdBalance}`));

    if (parseFloat(usdcBalancewei) > parseFloat("1", 6)) {

      const data = ethers.concat([ 
        ethers.getBytes(swap_usdc),
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256'],
          [wallet.address, usdcBalancewei, 0, 0, 0, 0, 0]
        )
      ]);

      await approve(wallet, usdcAddress, r2usdAddress, usdcBalancewei);
      console.log(chalk.hex('#20B2AA')(`🔁 Swapping ${usdcBalance} USDDC to R2...`));
      const tx = await wallet.sendTransaction({
        to: r2usdAddress,
        data,
        gasLimit: 500000,
      });

      console.log(chalk.hex('#66CDAA')(`⏳ Tx dikirim ke blokchain!\n🌐 https://testnet.bscscan.com/tx/${tx.hash}`));
      await tx.wait();
      console.log(chalk.hex('#32CD32')(`✅ Swap success\n`));
    } else {
      console.log(chalk.hex('#FF8C00')(`⚠️ Saldo USDC tidak cukup untuk swap\n`));
    }
  } catch (error) {
    console.error(`❌ Error during swap:`, error.message || error);
    console.log();
  }
}

async function stakeR2USD(wallet) {
  try {
    const r2usdBalancewei = await checkBalance(wallet, r2usdAddress);
    const r2usdBalanceRaw = await getFormattedBalance(wallet, r2usdAddress, 6);
    const r2usdBalance = parseFloat(r2usdBalanceRaw).toFixed(1);
    console.log(chalk.hex('#7B68EE')(`💰 Saldo R2USD: ${r2usdBalance}`));

    if (parseFloat(r2usdBalancewei) > parseFloat("1", 6)) {
      const amountHex = ethers.toBeHex(r2usdBalancewei, 32);
      const data = ethers.concat([
        ethers.getBytes(stake_r2u),
        ethers.getBytes(amountHex),
        ethers.getBytes("0x" + "00".repeat(576))
      ]);

      await approve(wallet, r2usdAddress, sr2usdAddress, r2usdBalancewei);
      console.log(chalk.hex('#20B2AA')(`⛏️ Staking ${r2usdBalance} R2USD to sR2USD...`));
      const tx = await wallet.sendTransaction({
        to: sr2usdAddress,
        data,
        gasLimit: 500000,
      });
      console.log(chalk.hex('#66CDAA')(`⏳ Tx dikirim ke blokchain!\n🌐 https://testnet.bscscan.com/tx/${tx.hash}`));
      await tx.wait();
      console.log(chalk.hex('#32CD32')(`✅ Staking confirmed\n`));
    } else {
      console.log(chalk.hex('#FF8C00')(`⚠️ Saldo R2USD tidak cukup untuk staking\n`));
    }
  } catch (error) {
    console.error(`❌ Failed to stake R2USD:`, error.message || error);
    console.log();
  }
}

async function bscmain() {
  console.clear();
  for (const privateKey of privateKeys) {
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(chalk.hex('#800080')(`🌐 BSC TESTNET ${wallet.address}`));
    
    console.log(chalk.hex('#DC143C')(`🚀 SWAP`));
    await swapUSDC(wallet);
    await delay(10000);

    console.log(chalk.hex('#DC143C')(`🚀 STAKE`));
    await stakeR2USD(wallet);
    await delay(10000);

  }
}

module.exports = { bscmain };

if (require.main === module) {
  bscmain();
}
