import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const wallets = await prisma.wallet.findMany({ include: { transactions: true } });

  let allOk = true;
  for (const wallet of wallets) {
    // "hold"/"release" only move money into and out of `held` – they never touch `balance`.
    const balanceSum = wallet.transactions
      .filter((txn) => txn.type !== 'hold' && txn.type !== 'release')
      .reduce((total, txn) => total + txn.amount.toNumber(), 0);
    const heldSum = wallet.transactions
      .filter((txn) => txn.type === 'hold' || txn.type === 'release')
      .reduce((total, txn) => total + txn.amount.toNumber(), 0);
    const balance = wallet.balance.toNumber();
    const held = wallet.held.toNumber();

    if (Math.abs(balanceSum - balance) > 0.01) {
      allOk = false;
      console.log(`Balance mismatch for wallet ${wallet.id}: ledger sum ${balanceSum}, balance ${balance}`);
    }
    if (Math.abs(heldSum - held) > 0.01) {
      allOk = false;
      console.log(`Held mismatch for wallet ${wallet.id}: ledger sum ${heldSum}, held ${held}`);
    }
  }

  console.log(allOk ? 'OK' : 'Ledger check failed');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
