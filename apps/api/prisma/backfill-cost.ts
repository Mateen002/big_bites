import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany();
  let n = 0;
  for (const x of products) {
    if (x.costPkr == null) {
      await prisma.product.update({
        where: { id: x.id },
        data: { costPkr: Math.round(x.pricePkr * 0.58) },
      });
      n++;
    }
  }
  console.log(`Backfilled cost on ${n}/${products.length} products`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
