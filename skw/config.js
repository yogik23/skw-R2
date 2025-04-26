const amountLPUSDC = "10";
const amountLPR2USD = "480";
const amountswapUSDC = "980";
const amountstakeR2USD = "490";

const usdcAddress = "0xef84994eF411c4981328fFcE5Fda41cD3803faE4";
const r2usdAddress = "0x20c54C5F742F123Abb49a982BFe0af47edb38756";
const sr2usdAddress = "0xBD6b25c4132F09369C354beE0f7be777D7d434fa";
const poolAddress = "0x07aBD582Df3D3472AA687A0489729f9F0424b1e3";
const poolAddress2 = "0x61F2AB7B0C0E10E18a3ed1C3bC7958540374A8DC";

const swap_usdc = "0x095e7a95";
const stake_r2u = "0x1a5f0f00";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const addLP_abi = [
  "function add_liquidity(uint256[] memory _amounts, uint256 _min_mint_amount, address _receiver) public returns (uint256)"
];

const erc20_abi = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
];

module.exports = {
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
};
