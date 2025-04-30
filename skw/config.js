const { ethers } = require('ethers');
const axios = require('axios');
const chalk = require('chalk');

const amountLPUSDC = "10";
const amountLPR2USD = "480";
const amountswapUSDC = "980";
const amountstakeR2USD = "490";
const amountwbtc = "0.01";

const usdcAddress = "0xef84994eF411c4981328fFcE5Fda41cD3803faE4";
const r2usdAddress = "0x20c54C5F742F123Abb49a982BFe0af47edb38756";
const sr2usdAddress = "0xBD6b25c4132F09369C354beE0f7be777D7d434fa";
const wbtcAddress = "0x340a5B718557801f20AfD6E244C78Fcd1c0B2212";
const depo_router = "0x9e9C178271b20F4b7C0d5073ae513017aAdE1f61";
const poolAddress = "0x07aBD582Df3D3472AA687A0489729f9F0424b1e3";
const poolAddress2 = "0x61F2AB7B0C0E10E18a3ed1C3bC7958540374A8DC";
const sr2ARBusdAddress = "0x6b9573B7dB7fB98Ff4014ca8E71F57aB7B7ffDFB";
const ARBpoolAddress = "0xCcE6bfcA2558c15bB5faEa7479A706735Aef9634";
const ARBpoolAddress2 = "0x58F68180a997dA6F9b1af78aa616d8dFe46F2531";
const PLUMEpoolAddress = "0x726cD35eE1AcE22e31ae51021A06DD24745D7f45";
const PLUMEpoolAddress2 = "0x5DfEC10AE4EFdCBA51251F87949ae70fC6a36B5B";

const swap_usdc = "0x095e7a95";
const stake_r2u = "0x1a5f0f00";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const addLP_abi = [
  "function add_liquidity(uint256[] memory _amounts, uint256 _min_mint_amount, address _receiver) public returns (uint256)",
  "function stake(address _depositToken, uint256 _amount)"
];

const erc20_abi = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
];

async function getPriceData(retries = 5, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get('https://testnet.r2.money/v1/public/dashboard');
      return response.data.data.price;
    } catch (error) {
      console.error(`⚠️ Gagal ambil harga (Percobaan ${i + 1}):`);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        throw new Error("❌ Gagal mendapatkan data harga setelah beberapa percobaan.");
      }
    }
  }
}

async function approve(wallet, tokenAddress, spenderAddress, amountIn) {
  try {
    const Contract = new ethers.Contract(tokenAddress, erc20_abi, wallet);
    const allowance = await Contract.allowance(wallet.address, spenderAddress);
    if (allowance < amountIn) {
      console.log(chalk.hex('#20B2AA')(`🔓 Approving ${tokenAddress}`));
      const tx = await Contract.approve(spenderAddress, ethers.MaxUint256);
      await tx.wait();
      console.log(chalk.hex('#32CD32')(`✅ Approved ${tokenAddress}\n`));
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

module.exports = {
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
  sr2ARBusdAddress,
  ARBpoolAddress,
  ARBpoolAddress2,
  PLUMEpoolAddress,
  PLUMEpoolAddress2,
  addLP_abi,
  erc20_abi,
  swap_usdc,
  stake_r2u,
  delay,
  getPriceData,
  approve,
  checkBalance,
  getFormattedBalance,
};
