/*
Backfill script for CryptoTransaction records.

Usage:
  node scripts/backfill-crypto-transactions.js quick 0xYourWalletAddress
    - Quick mode: create CryptoTransaction for all orders with paymentMethod='CRYPTO' and paymentRef present, assigning to given wallet address.

  node scripts/backfill-crypto-transactions.js rpc <RPC_URL>
    - RPC mode: use RPC_URL (or set RPC_URL env) to fetch tx details by txHash (paymentRef) and create accurate records (to, from, value).

Notes:
- This script will skip orders that already have a cryptoTransaction.
- It requires DATABASE_URL env and Prisma client generated.
- It will ensure at least one Cryptocurrency record exists (create default 'SGB' if none).
*/

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const { ethers } = require('ethers');

async function ensureCryptoRecord() {
  let c = await prisma.cryptocurrency.findFirst();
  if (!c) {
    c = await prisma.cryptocurrency.create({
      data: {
        name: 'Songbird',
        code: 'SGB',
        symbol: 'SGB',
        priceVND: 8750,
        chainName: 'Songbird',
        rpcUrl: process.env.RPC_URL || '',
        chainId: '0x13',
        decimals: 18,
        isActive: true,
        description: 'Default placeholder token created by backfill script'
      }
    });
  }
  return c;
}

async function quickMode(assignTo) {
  if (!assignTo || !/^0x[a-fA-F0-9]{40}$/.test(assignTo)) {
    console.error('Quick mode requires a valid wallet address as second arg. Example: node scripts/backfill-crypto-transactions.js quick 0xAbc...');
    process.exit(1);
  }

  const cryptoRecord = await ensureCryptoRecord();

  const orders = await prisma.order.findMany({
    where: {
      paymentMethod: 'CRYPTO',
      paymentRef: { not: null }
    },
    include: { cryptoTransactions: true }
  });

  let created = 0;
  for (const order of orders) {
    if (order.cryptoTransactions && order.cryptoTransactions.length > 0) {
      console.log(`Skipping order ${order.id} (already has cryptoTransaction)`);
      continue;
    }
    try {
      await prisma.cryptoTransaction.create({
        data: {
          transactionHash: String(order.paymentRef || ''),
          fromAddress: '',
          toAddress: assignTo,
          amount: '',
          amountInFiat: Number(order.totalPrice) || 0,
          status: 'SUCCESS',
          description: `Backfilled from order ${order.id}`,
          orderId: order.id,
          cryptoId: cryptoRecord.id
        }
      });
      created++;
      console.log(`Created cryptoTransaction for order ${order.id}`);
    } catch (e) {
      console.warn(`Failed to create cryptoTransaction for order ${order.id}:`, e.message || e);
    }
  }

  console.log(`Done. Created ${created} cryptoTransaction(s).`);
  await prisma.$disconnect();
}

async function rpcMode(rpcUrl) {
  const RPC = rpcUrl || process.env.RPC_URL;
  if (!RPC) {
    console.error('RPC mode requires RPC URL as second arg or RPC_URL env var');
    process.exit(1);
  }
  const provider = new ethers.providers.JsonRpcProvider(RPC);
  const cryptoRecord = await ensureCryptoRecord();

  const orders = await prisma.order.findMany({
    where: {
      paymentMethod: 'CRYPTO',
      paymentRef: { not: null }
    },
    include: { cryptoTransactions: true }
  });

  let created = 0;
  for (const order of orders) {
    if (order.cryptoTransactions && order.cryptoTransactions.length > 0) {
      console.log(`Skipping order ${order.id} (already has cryptoTransaction)`);
      continue;
    }
    const txHash = String(order.paymentRef || '');
    if (!txHash) {
      console.warn(`Order ${order.id} has empty paymentRef, skipping`);
      continue;
    }
    try {
      const tx = await provider.getTransaction(txHash);
      if (!tx) {
        console.warn(`Transaction ${txHash} not found on RPC for order ${order.id}, creating fallback record`);
        await prisma.cryptoTransaction.create({
          data: {
            transactionHash: txHash,
            fromAddress: '',
            toAddress: '',
            amount: '',
            amountInFiat: Number(order.totalPrice) || 0,
            status: 'UNKNOWN',
            description: `Backfilled (rpc miss) from order ${order.id}`,
            orderId: order.id,
            cryptoId: cryptoRecord.id
          }
        });
        created++;
        continue;
      }

      // tx.value is a BigNumber in wei - format using decimals from cryptoRecord (fallback 18)
      const decimals = cryptoRecord.decimals || 18;
      const amount = ethers.utils.formatUnits(tx.value || 0, decimals);

      await prisma.cryptoTransaction.create({
        data: {
          transactionHash: txHash,
          fromAddress: tx.from || '',
          toAddress: tx.to || '',
          amount: String(amount),
          amountInFiat: Number(order.totalPrice) || 0,
          status: 'SUCCESS',
          description: `Backfilled from on-chain tx for order ${order.id}`,
          orderId: order.id,
          cryptoId: cryptoRecord.id
        }
      });
      created++;
      console.log(`Created cryptoTransaction for order ${order.id} from tx ${txHash}`);
    } catch (e) {
      console.warn(`Error fetching/creating for order ${order.id} tx ${txHash}:`, e.message || e);
    }
  }

  console.log(`Done. Created ${created} cryptoTransaction(s).`);
  await prisma.$disconnect();
}

(async function main(){
  const mode = process.argv[2] || 'quick';
  if (mode === 'quick') {
    const assignTo = process.argv[3] || process.env.BACKFILL_WALLET;
    await quickMode(assignTo);
  } else if (mode === 'rpc') {
    const rpc = process.argv[3] || process.env.RPC_URL;
    await rpcMode(rpc);
  } else {
    console.error('Unknown mode. Use quick or rpc.');
    process.exit(1);
  }
})();
