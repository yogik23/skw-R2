const axios = require('axios');
const { ethers } = require('ethers');
const chalk = require('chalk');
require("dotenv").config();
const fs = require("fs");
const path = require("path");

const RPC = "https://ethereum-sepolia-rpc.publicnode.com/";
const provider = new ethers.JsonRpcProvider(RPC);

const privateKeys = fs.readFileSync(path.join(__dirname, "privatekey.txt"), "utf-8")
  .split("\n")
  .map(k => k.trim())
  .filter(k => k.length > 0);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function login(wallet) {
  const url = "https://testnet.r2.money/v1/auth/login";
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `Welcome! Sign this message to login to r2.money. This doesn't cost you anything and is free of any gas fees. Nonce: ${timestamp}`;
  const signature = await wallet.signMessage(message);

  const payload = { timestamp, signature, user: wallet.address };

  try {
    console.log(chalk.hex('#20B2AA')(`🔁 Mencoba Login`));
    const response = await axios.post(url, payload, {
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
      }
    });

    const token = response.data?.data?.token;
    console.log(chalk.hex('#32CD32')(`✅ Login Berhasil`));
    return token;
  } catch (error) {
    console.error(`❌ Login gagal: ${error.response?.status} - ${error.response?.data?.message || 'Unknown error'}`);
    return null;
  }
}

function formatPoints(points) {
  if (points >= 1_000_000_000) return (points / 1_000_000_000).toFixed(2) + 'B';
  if (points >= 1_000_000) return (points / 1_000_000).toFixed(2) + 'M';
  if (points >= 1_000) return (points / 1_000).toFixed(2) + 'K';
  return points.toString();
}

async function cekpoint(token, address) {
  const url = `https://testnet.r2.money/v1/user/points?user=${address}`;
  const headers = {
    "x-api-key": token,
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0",
  };

  try {
    const response = await axios.get(url, { headers });
    const point = response.data?.data?.all?.points;
    console.log(chalk.hex('#66CDAA')(`✅ Points: ${formatPoints(point)}`));
    return point;
  } catch (error) {
    console.log(`❌ Points Error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    return null;
  }
}

function escapeMarkdownV2(text) {
  return text.replace(/[_*[\]()~`>#+=|{}.!\\-]/g, '\\$&');
}

async function sendTG(address, point, retries = 3) {
  const date = escapeMarkdownV2(new Date().toISOString().split('T')[0]);
  const newpoint = escapeMarkdownV2(formatPoints(point));
  const newAddress = escapeMarkdownV2(address);
  const message = `🚀 *R2 Testnet*\n📅 *${date}*\n💦 *${newAddress}*\n➡️ *Points: ${newpoint}*`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,
        {
          chat_id: process.env.CHAT_ID,
          text: message,
          parse_mode: "MarkdownV2",
        }
      );
      console.log(chalk.hex('#FF8C00')(`✅ Message sent to Telegram successfully!\n`));
      return response.data;
    } catch (error) {
      if (attempt < retries) await delay(2000);
      else return null;
    }
  }
}

async function pointmain() {
  console.clear();
  for (const privateKey of privateKeys) {
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(chalk.hex('#7B68EE')(`\n🔑 Wallet: ${wallet.address}`));

    const token = await login(wallet);
    if (!token) continue;

    const point = await cekpoint(token, wallet.address);
    if (!point) continue;

    await sendTG(wallet.address, point);
    await delay(3000);
  }
}

module.exports = { pointmain };

if (require.main === module) {
  pointmain();
}
