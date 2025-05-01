const { ethers } = require('ethers');
const axios = require('axios');
const chalk = require('chalk');
const fs = require("fs");
const path = require("path");

const {
  amountLPUSDC,
  amountLPR2USD,
  amountswapUSDC,
  amountstakeR2USD,
  usdcAddress,
  r2usdAddress,
  sr2ARBusdAddress,
  ARBpoolAddress,
  ARBpoolAddress2,
  addLP_abi,
  erc20_abi,
  swap_usdc,
  stake_r2u,
  delay,
  getPriceData,
  approve,
  checkBalance,
  getFormattedBalance,
} = require('./skw/config');

const RPC = "https://arbitrum-sepolia-rpc.publicnode.com";
const provider = new ethers.JsonRpcProvider(RPC);

const privateKeys = fs.readFileSync(path.join(__dirname, "privatekey.txt"), "utf-8")
  .split("\n")
  .map(k => k.trim())
  .filter(k => k.length > 0);

async function swapUSDC(wallet) {
  try {
    const usdcBalanceRaw = await getFormattedBalance(wallet, usdcAddress, 6);
    const r2usdBalanceRaw = await getFormattedBalance(wallet, r2usdAddress, 6);
    const usdcBalance = parseFloat(usdcBalanceRaw).toFixed(1);
    const r2usdBalance = parseFloat(r2usdBalanceRaw).toFixed(1);


    console.log(chalk.hex('#7B68EE')(`💰 Saldo USDC: ${usdcBalance}`));
    console.log(chalk.hex('#7B68EE')(`💰 Saldo R2USD: ${r2usdBalance}`));

    if (parseFloat(amountswapUSDC) < parseFloat(usdcBalance)) {
      const amountWei = ethers.parseUnits(amountswapUSDC, 6);

      const data = ethers.concat([ 
        ethers.getBytes(swap_usdc),
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256'],
          [wallet.address, amountWei, 0, 0, 0, 0, 0]
        )
      ]);

      await approve(wallet, usdcAddress, r2usdAddress, amountWei);
      console.log(chalk.hex('#20B2AA')(`🔁 Swapping ${amountswapUSDC} USDDC to R2...`));
      const tx = await wallet.sendTransaction({
        to: r2usdAddress,
        data,
        gasLimit: 500000,
      });
      console.log(chalk.hex('#66CDAA')(`⏳ Tx dikirim ke blokchain!\n🌐 https://arbitrum-sepolia.blockscout.com/tx/${tx.hash}`));
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
    const r2usdBalanceRaw = await getFormattedBalance(wallet, r2usdAddress, 6);
    const r2usdBalance = parseFloat(r2usdBalanceRaw).toFixed(1);
    console.log(chalk.hex('#7B68EE')(`💰 Saldo R2USD: ${r2usdBalance}`));

    if (parseFloat(amountstakeR2USD) < parseFloat(r2usdBalance)) {
      const amountWei = ethers.parseUnits(amountstakeR2USD, 6);
      const amountHex = ethers.toBeHex(amountWei, 32);
      const data = ethers.concat([
        ethers.getBytes(stake_r2u),
        ethers.getBytes(amountHex),
        ethers.getBytes("0x" + "00".repeat(576))
      ]);

      await approve(wallet, r2usdAddress, sr2ARBusdAddress, amountWei);
      console.log(chalk.hex('#20B2AA')(`⛏️ Staking ${amountstakeR2USD} R2USD to SR2USDT...`));
      const tx = await wallet.sendTransaction({
        to: sr2ARBusdAddress,
        data,
        gasLimit: 500000,
      });
      console.log(chalk.hex('#66CDAA')(`⏳ Tx dikirim ke blokchain!\n🌐 https://arbitrum-sepolia.blockscout.com/tx/${tx.hash}`));
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

async function addLP1(wallet) {
  try {
    const usdcBalanceRaw = await getFormattedBalance(wallet, usdcAddress, 6);
    const r2usdBalanceRaw = await getFormattedBalance(wallet, r2usdAddress, 6);
    const usdcBalance = parseFloat(usdcBalanceRaw).toFixed(1);
    const r2usdBalance = parseFloat(r2usdBalanceRaw).toFixed(1);

    console.log(chalk.hex('#7B68EE')(`💰 Saldo USDC: ${usdcBalance}`));
    console.log(chalk.hex('#7B68EE')(`💰 Saldo R2USD: ${r2usdBalance}`));

    const usdcAmount = ethers.parseUnits(amountLPUSDC, 6);    
    const priceData = await getPriceData();
    const r2usdPrice = parseFloat(priceData.r2usd_usdc);

    const usdcAmountFloat = parseFloat(ethers.formatUnits(usdcAmount, 6));
    const r2usdAmountFloat = usdcAmountFloat / r2usdPrice;
    const r2usdAmount = ethers.parseUnits(r2usdAmountFloat.toFixed(6), 6);

    if (parseFloat(usdcBalanceRaw) < parseFloat(ethers.formatUnits(usdcAmount, 6))) {
      console.log(chalk.hex('#FF8C00')(`⚠️ Saldo USDC tidak cukup untuk add LP\n`));
      return;
    }
    if (parseFloat(r2usdBalanceRaw) < parseFloat(ethers.formatUnits(r2usdAmount, 6))) {
      console.log(chalk.hex('#FF8C00')(`⚠️ Saldo R2USD tidak cukup untuk add LP\n`));
      return;
    }

    await approve(wallet, usdcAddress, ARBpoolAddress, usdcAmount);
    await approve(wallet, r2usdAddress, ARBpoolAddress, r2usdAmount);

    const minMintAmount = ethers.parseUnits("1", 18);
    const contractPool1 = new ethers.Contract(ARBpoolAddress, addLP_abi, wallet);
    console.log(chalk.hex('#20B2AA')(`📤 ADD ${amountLPUSDC} USDC + ${ethers.formatUnits(r2usdAmount, 6)} R2USD `));

    const tx1 = await contractPool1.add_liquidity(
      [usdcAmount, r2usdAmount],
      minMintAmount,
      wallet.address,
      { gasLimit: 500000 }
    );

    console.log(chalk.hex('#66CDAA')(`⏳ Tx dikirim ke blokchain!\n🌐 https://arbitrum-sepolia.blockscout.com/tx/${tx1.hash}`));

    await tx1.wait();
    console.log(chalk.hex('#32CD32')(`✅ Liquidity added to the pool\n`));
  } catch (error) {
    console.error(`❌ Failed to ADD Liquidity:`, error);
    console.log();
  }
}

async function addLP2(wallet) {
  try {
    const r2usdBalanceRaw = await getFormattedBalance(wallet, r2usdAddress, 6);
    const sr2usdBalanceRaw = await getFormattedBalance(wallet, sr2ARBusdAddress, 6);
    const r2usdBalance = parseFloat(r2usdBalanceRaw).toFixed(1);
    const sr2usdBalance = parseFloat(sr2usdBalanceRaw).toFixed(1);

    console.log(chalk.hex('#7B68EE')(`💰 Saldo R2USD: ${r2usdBalance}`));
    console.log(chalk.hex('#7B68EE')(`💰 Saldo R2USD: ${sr2usdBalance}`));

    const r2usdAmount = ethers.parseUnits(amountLPR2USD, 6);    
    const priceData = await getPriceData();
    const sr2usdPrice = parseFloat(priceData.r2usd_usdc);

    const r2usdAmountFloat = parseFloat(ethers.formatUnits(r2usdAmount, 6));
    const sr2usdAmountFloat = r2usdAmountFloat / sr2usdPrice;
    const sr2usdAmount = ethers.parseUnits(sr2usdAmountFloat.toFixed(6), 6); 

    if (parseFloat(r2usdBalanceRaw) < r2usdAmountFloat) {
      console.log(chalk.hex('#FF8C00')(`⚠️  Saldo R2USD tidak cukup untuk add LP2\n`));
      return;
    }
    if (parseFloat(sr2usdBalanceRaw) < sr2usdAmountFloat) {
      console.log(chalk.hex('#FF8C00')(`⚠️  Saldo SR2USD tidak cukup untuk add LP2\n`));
      return;
    }

    await approve(wallet, r2usdAddress, ARBpoolAddress2, r2usdAmount);
    await approve(wallet, sr2ARBusdAddress, ARBpoolAddress2, sr2usdAmount);

    const minMintAmount = ethers.parseUnits("1", 18);
    const contractPool2 = new ethers.Contract(ARBpoolAddress2, addLP_abi, wallet);
    console.log(chalk.hex('#20B2AA')(`📤 ADD ${amountLPR2USD} R2USD + ${ethers.formatUnits(sr2usdAmount, 6)} SR2USD `));

    const tx2 = await contractPool2.add_liquidity(
      [r2usdAmount, sr2usdAmount],
      minMintAmount,
      wallet.address,
      { gasLimit: 500000 }
    );

    console.log(chalk.hex('#66CDAA')(`⏳ Tx dikirim ke blokchain!\n🌐 https://arbitrum-sepolia.blockscout.com/tx/${tx2.hash}`));

    await tx2.wait();
    console.log(chalk.hex('#32CD32')(`✅ Liquidity added to the pool\n`));
  } catch (error) {
    console.error(`❌ Failed to ADD Liquidity:`, error);
    console.log();
  }
}

async function arbmain() {
  console.clear();
  for (const privateKey of privateKeys) {
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(chalk.hex('#800080')(`🌐 ARBITRUM SEPOLIA ${wallet.address}`));
    
    console.log(chalk.hex('#DC143C')(`🚀 SWAP`));
    await swapUSDC(wallet);
    await delay(10000);

    console.log(chalk.hex('#DC143C')(`🚀 STAKE`));
    await stakeR2USD(wallet);
    await delay(10000);

    console.log(chalk.hex('#DC143C')(`🚀 ADD USDC-R2USDC`));
    await addLP1(wallet);    
    await delay(10000);

    console.log(chalk.hex('#DC143C')(`🚀 ADD R2USDC-sR2USDC`));
    await addLP2(wallet);
    await delay(10000);  

  }
}

module.exports = { arbmain };

if (require.main === module) {
  arbmain();
}
