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
  amountwbtc,
  usdcAddress,
  r2usdAddress,
  sr2usdAddress,
  wbtcAddress,
  depo_router,
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
    return balance;
  } catch (error) {
    console.error(`Failed to check balance for token ${tokenAddress}:`, error);
  }
}

async function getFormattedBalance(wallet, tokenAddress, decimals) {
  const balanceRaw = await checkBalance(wallet, tokenAddress);
  return ethers.formatUnits(balanceRaw, decimals);
}

async function swapUSDC(wallet) {
  try {
    const usdcBalanceRaw = await getFormattedBalance(wallet, usdcAddress, 6);
    const r2usdBalanceRaw = await getFormattedBalance(wallet, r2usdAddress, 6);
    const usdcBalance = parseFloat(usdcBalanceRaw).toFixed(1);
    const r2usdBalance = parseFloat(r2usdBalanceRaw).toFixed(1);
    console.log(chalk.hex('#20B2AA')(`💰 Saldo USDC: ${usdcBalance}`));
    console.log(chalk.hex('#20B2AA')(`💰 Saldo R2USD: ${r2usdBalance}`));

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

async function depowbtc(wallet) {
  try {
    const wbtcBalanceRaw = await getFormattedBalance(wallet, wbtcAddress, 8);
    const wbtcBalance = parseFloat(wbtcBalanceRaw).toFixed(3);
    console.log(chalk.hex('#20B2AA')(`💰 Saldo WBTC: ${wbtcBalance}`));

    const amountWei = ethers.parseUnits(amountwbtc, 8);
    const depositca = new ethers.Contract(depo_router, addLP_abi, wallet);
    await approve(wallet, wbtcAddress, depo_router, amountWei);
    console.log(chalk.hex('#20B2AA')(`📤 DEPOSIT ${amountwbtc} WBTC `));

    const tx = await depositca.stake(
      wbtcAddress,
      amountWei,
      {
        gasLimit: 500000,
      }
    );

    console.log(chalk.hex('#FF8C00')(`⏳ Tx dikirim ke blokchain!\n🌐 https://eth-sepolia.blockscout.com/tx/${tx.hash}`));

    await tx.wait();
    console.log(chalk.hex('#66CDAA')(`✅ Deposit WBTC Suksess\n`));
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
    await delay(5000);

    console.log(chalk.hex('#66CDAA')(`🚀 DEPOSIT WBTC`));
    await depowbtc(wallet);
    await delay(5000);
  }
}

main();
