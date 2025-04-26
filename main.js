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
  sr2usdAddress,
  poolAddress,
  poolAddress2,
  addLP_abi,
  erc20_abi,
  swap_usdc,
  stake_r2u,
  delay,
} = require('./skw/config');

const RPC = "https://ethereum-sepolia-rpc.publicnode.com/";
const provider = new ethers.JsonRpcProvider(RPC);

const privateKeys = fs.readFileSync(path.join(__dirname, "privatekey.txt"), "utf-8")
  .split("\n")
  .map(k => k.trim())
  .filter(k => k.length > 0);

async function getPriceData() {
  const response = await axios.get('https://testnet.r2.money/v1/public/dashboard');
  return response.data.data.price;
}

async function approve(wallet, tokenAddress, spenderAddress, amountIn) {
  try {
    const Contract = new ethers.Contract(tokenAddress, erc20_abi, wallet);
    const allowance = await Contract.allowance(wallet.address, spenderAddress);
    if (allowance < amountIn) {
      console.log(chalk.hex('#20B2AA')(`🔓 Approving ${tokenAddress}`));
      const tx = await Contract.approve(spenderAddress, ethers.MaxUint256);
      await tx.wait();
      console.log(chalk.hex('#66CDAA')(`✅ Approved ${tokenAddress}\n`));
    }
  } catch (error) {
    console.error(`Failed to Approved token ${tokenAddress}:`, error);
  }
}

async function checkBalance(wallet, tokenAddress) {
  try {
    const Contract = new ethers.Contract(tokenAddress, erc20_abi, wallet);
    const balance = await Contract.balanceOf(wallet.address);
    return ethers.formatUnits(balance, 6);
  } catch (error) {
    console.error(`Failed to check balance for token ${tokenAddress}:`, error);
  }
}

async function swapUSDC(wallet) {
  try {
    const usdcBalanceRaw = await checkBalance(wallet, usdcAddress);
    const r2usdBalanceRaw = await checkBalance(wallet, r2usdAddress);
    const usdcBalance = parseFloat(usdcBalanceRaw).toFixed(1);
    const r2usdBalance = parseFloat(r2usdBalanceRaw).toFixed(1);
    console.log(chalk.hex('#20B2AA')(`💰 Saldo USDC`, usdcBalance));
    console.log(chalk.hex('#20B2AA')(`💰 Saldo R2USD`, r2usdBalance));

    const amountWei = ethers.parseUnits(amountswapUSDC, 6);
    const data = ethers.concat([
      ethers.getBytes(swap_usdc),
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256'],
        [wallet.address, amountWei, 0, 0, 0, 0, 0]
      )
    ]);

    await approve(wallet, usdcAddress, r2usdAddress, amountWei);
    console.log(chalk.hex('#20B2AA')(`🔁 Swapping USDC to R2...`));
    const tx = await wallet.sendTransaction({
      to: r2usdAddress,
      data,
      gasLimit: 500000,
    });
    console.log(chalk.hex('#FF8C00')(`⏳ Tx dikirim ke blokchain!\n🌐 https://eth-sepolia.blockscout.com/tx/${tx.hash}`));
    await tx.wait();
    console.log(chalk.hex('#66CDAA')(`✅ Swap success\n`));
  } catch (error) {
    console.error(`❌ Error during swap:`, error.message || error);
    console.log();
  }
}

async function stakeR2USD(wallet) {
  try {
    const usdcBalanceRaw = await checkBalance(wallet, usdcAddress);
    const r2usdBalanceRaw = await checkBalance(wallet, r2usdAddress);
    const usdcBalance = parseFloat(usdcBalanceRaw).toFixed(1);
    const r2usdBalance = parseFloat(r2usdBalanceRaw).toFixed(1);
    console.log(chalk.hex('#20B2AA')(`💰 Saldo USDC`, usdcBalance));
    console.log(chalk.hex('#20B2AA')(`💰 Saldo R2USD`, r2usdBalance));

    const amountWei = ethers.parseUnits(amountstakeR2USD, 6);
    const amountHex = ethers.toBeHex(amountWei, 32);
    const data = ethers.concat([
      ethers.getBytes(stake_r2u),
      ethers.getBytes(amountHex),
      ethers.getBytes("0x" + "00".repeat(576)) // padding
    ]);

    await approve(wallet, r2usdAddress, sr2usdAddress, amountWei);
    console.log(chalk.hex('#20B2AA')(`⛏️  Staking R2 to SR2...`));
    const tx = await wallet.sendTransaction({
      to: sr2usdAddress,
      data,
      gasLimit: 500000,
    });
    console.log(chalk.hex('#FF8C00')(`⏳ Tx dikirim ke blokchain!\n🌐 https://eth-sepolia.blockscout.com/tx/${tx.hash}`));
    await tx.wait();
    console.log(chalk.hex('#66CDAA')(`✅ Staking confirmed\n`));
  } catch (error) {
    console.error(`❌ Failed to stake R2USD:`, error.message || error);
    console.log();
  }
}

async function addLP1(wallet) {
  try {
    const usdcBalanceRaw = await checkBalance(wallet, usdcAddress);
    const r2usdBalanceRaw = await checkBalance(wallet, r2usdAddress);
    const usdcBalance = parseFloat(usdcBalanceRaw).toFixed(1);
    const r2usdBalance = parseFloat(r2usdBalanceRaw).toFixed(1);
    console.log(chalk.hex('#20B2AA')(`💰 Saldo USDC`, usdcBalance));
    console.log(chalk.hex('#20B2AA')(`💰 Saldo R2USD`, r2usdBalance));

    const usdcAmount = ethers.parseUnits(amountLPUSDC, 6);    
    const priceData = await getPriceData();
    const r2usdPrice = parseFloat(priceData.r2usd_usdc);
    const r2usdAmount = ethers.parseUnits(
      (parseFloat(ethers.formatUnits(usdcAmount, 6)) / r2usdPrice).toFixed(6), 
      6
    );

    await approve(wallet, usdcAddress, poolAddress, r2usdAmount);

    const minMintAmount = ethers.parseUnits("1", 18);
    const contractPool1 = new ethers.Contract(poolAddress, addLP_abi, wallet);
    console.log(chalk.hex('#20B2AA')(`📤 ADD ${ethers.formatUnits(usdcAmount, 6)} USDC + ${ethers.formatUnits(r2usdAmount, 6)} R2USD `));

    const tx1 = await contractPool1.add_liquidity(
      [usdcAmount, r2usdAmount],
      minMintAmount,
      wallet.address,
      {
        gasLimit: 500000,
      }
    );

    console.log(chalk.hex('#FF8C00')(`⏳ Tx dikirim ke blokchain!\n🌐 https://eth-sepolia.blockscout.com/tx/${tx1.hash}`));

    await tx1.wait();
    console.log(chalk.hex('#66CDAA')(`✅ Liquidity added to the pool\n`));
  } catch (error) {
    console.error(`❌ Failed to ADD Liquidity:`, error);
    console.log();
  }
}

async function addLP2(wallet) {
  try {
    const usdcBalanceRaw = await checkBalance(wallet, usdcAddress);
    const r2usdBalanceRaw = await checkBalance(wallet, r2usdAddress);
    const usdcBalance = parseFloat(usdcBalanceRaw).toFixed(1);
    const r2usdBalance = parseFloat(r2usdBalanceRaw).toFixed(1);
    console.log(chalk.hex('#20B2AA')(`💰 Saldo USDC`, usdcBalance));
    console.log(chalk.hex('#20B2AA')(`💰 Saldo R2USD`, r2usdBalance));

    const r2usdAmount = ethers.parseUnits(amountLPR2USD, 6);    
    const priceData = await getPriceData();
    const sr2usdPrice = parseFloat(priceData.r2usd_usdc);
    const sr2usdAmount = ethers.parseUnits(
      (parseFloat(ethers.formatUnits(r2usdAmount, 6)) / sr2usdPrice).toFixed(6), 
      6
    ); 

    await approve(wallet, r2usdAddress, poolAddress2, r2usdAmount);
    await approve(wallet, sr2usdAddress, poolAddress2, sr2usdAmount);

    const minMintAmount = ethers.parseUnits("1", 18);
    const contractPool2 = new ethers.Contract(poolAddress2, addLP_abi, wallet);
    console.log(chalk.hex('#20B2AA')(`📤 ADD ${ethers.formatUnits(r2usdAmount, 6)} R2USD + ${ethers.formatUnits(sr2usdAmount, 6)} SR2USD `));

    const tx2 = await contractPool2.add_liquidity(
      [r2usdAmount, sr2usdAmount],
      minMintAmount,
      wallet.address,
      {
        gasLimit: 500000,
      }
    );

    console.log(chalk.hex('#FF8C00')(`⏳ Tx dikirim ke blokchain!\n🌐 https://eth-sepolia.blockscout.com/tx/${tx2.hash}`));

    await tx2.wait();
    console.log(chalk.hex('#66CDAA')(`✅ Liquidity added to the pool\n`));
  } catch (error) {
    console.error(`❌ Failed to ADD Liquidity:`, error);
    console.log();
  }
}

async function main() {
  console.clear();
  for (const privateKey of privateKeys) {
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(chalk.hex('#7B68EE')(`👤 Memproses ${wallet.address}\n`));
    console.log(chalk.hex('#66CDAA')(`🚀 SWAP`));
    await swapUSDC(wallet);
    await delay(2000);

    console.log(chalk.hex('#66CDAA')(`🚀 STAKE`));
    await stakeR2USD(wallet);
    await delay(2000);

    console.log(chalk.hex('#66CDAA')(`🚀 ADD USDC-R2USDC`));
    await addLP1(wallet);    
    await delay(2000);

    console.log(chalk.hex('#66CDAA')(`🚀 ADD R2USDC-sR2USDC`));
    await addLP2(wallet);
    await delay(2000);  

  }
}

main();
