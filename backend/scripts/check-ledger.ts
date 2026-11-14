import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const wallets = await prisma.wallet.findMany({ include: { transactions: true } });

  let allOk = true;
  for (const wallet of wallets) {
    const sum = wallet.transactions.reduce((total, txn) => total + txn.amount.toNumber(), 0);
    const balance = wallet.balance.toNumber();
    if (Math.abs(sum - balance) > 0.01) {
      allOk = false;
      console.log(`Mismatch for wallet ${wallet.id}: ledger sum ${sum}, balance ${balance}`);
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
