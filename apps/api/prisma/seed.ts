import {
  PrismaClient,
  FulfillmentType,
  OptionSelectType,
  DiscountType,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

type MenuRow = {
  Category?: string;
  'Item Name'?: string;
  'Variant/Quantity'?: string | null;
  'Price (PKR)'?: string | number | null;
  Contact?: string | null;
};

type ParsedVariant = { label: string; pricePkr: number };
type ParsedItem = {
  categoryKey: string;
  name: string;
  variants: ParsedVariant[];
};

const CATEGORY_META: Record<
  string,
  {
    name: string;
    slug: string;
    description: string;
    image: string;
    fulfillmentType: FulfillmentType;
    displayOrder: number;
  }
> = {
  'Desi Food Items': {
    name: 'Desi Food',
    slug: 'desi-food',
    description: 'Karahi, haleem, kabab & home-style desi — hot, made to order.',
    image: '/images/desi.jpg',
    fulfillmentType: FulfillmentType.HOT_NOW,
    displayOrder: 1,
  },
  'Fast Food': {
    name: 'Fast Food',
    slug: 'fast-food',
    description: 'Burgers, wraps & paratha rolls — hot and ready.',
    image: '/images/fast.jpg',
    fulfillmentType: FulfillmentType.HOT_NOW,
    displayOrder: 2,
  },
  'Fried Items': {
    name: 'Fried Items',
    slug: 'fried-items',
    description: 'Fresh-fried samosas, rolls, nuggets & kababs.',
    image: '/images/fried.jpg',
    fulfillmentType: FulfillmentType.HOT_NOW,
    displayOrder: 3,
  },
  'Frozen Items': {
    name: 'Frozen Items',
    slug: 'frozen-items',
    description: 'Stock your freezer — packs for home frying, scheduled delivery.',
    image: '/images/frozen.jpg',
    fulfillmentType: FulfillmentType.SCHEDULED,
    displayOrder: 1,
  },
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function parsePrice(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number') return Math.round(raw);
  const digits = String(raw).replace(/[^\d]/g, '');
  if (!digits) return null;
  return Number(digits);
}

function resolveMenuPath() {
  const candidates = [
    path.join(__dirname, 'big_bites_menu.xlsx'),
    path.join(process.cwd(), 'prisma', 'big_bites_menu.xlsx'),
    path.join(process.cwd(), '..', '..', 'big_bites_menu.xlsx'),
    path.join(process.cwd(), 'big_bites_menu.xlsx'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    `Menu file not found. Place big_bites_menu.xlsx in apps/api/prisma/ (looked: ${candidates.join(', ')})`,
  );
}

function loadMenu(): ParsedItem[] {
  const file = resolveMenuPath();
  const wb = XLSX.readFile(file);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<MenuRow>(sheet, { defval: null });

  const byKey = new Map<string, ParsedItem>();

  for (const row of rows) {
    const categoryKey = String(row.Category || '').trim();
    const name = String(row['Item Name'] || '').trim();
    if (!categoryKey || !name || !CATEGORY_META[categoryKey]) continue;

    const pricePkr = parsePrice(row['Price (PKR)']);
    if (pricePkr == null) continue;

    const variantLabel = String(row['Variant/Quantity'] || '').trim() || 'Standard';
    const key = `${categoryKey}::${name}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.variants.push({ label: variantLabel, pricePkr });
    } else {
      byKey.set(key, {
        categoryKey,
        name,
        variants: [{ label: variantLabel, pricePkr }],
      });
    }
  }

  return [...byKey.values()];
}

async function clearCatalog() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.promo.deleteMany();
  await prisma.productOptionGroup.deleteMany();
  await prisma.categoryOptionGroup.deleteMany();
  await prisma.optionValue.deleteMany();
  await prisma.optionGroup.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
}

async function main() {
  const passwordHash = await bcrypt.hash(
    process.env.ADMIN_PASSWORD || 'BigBites@Admin1',
    10,
  );

  await prisma.adminUser.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@bigbites.pk' },
    update: { passwordHash },
    create: {
      email: process.env.ADMIN_EMAIL || 'admin@bigbites.pk',
      name: 'BigBites Admin',
      passwordHash,
    },
  });

  const menu = loadMenu();
  console.log(`Loaded ${menu.length} menu items from Excel`);

  await clearCatalog();

  const spice = await prisma.optionGroup.create({
    data: {
      name: 'Spice Level',
      slug: 'spice-level',
      selectType: OptionSelectType.SINGLE,
      required: false,
      minSelect: 0,
      maxSelect: 1,
      displayOrder: 10,
      values: {
        create: [
          { label: 'Mild', priceDeltaPkr: 0, displayOrder: 1 },
          { label: 'Medium', priceDeltaPkr: 0, displayOrder: 2 },
          { label: 'Hot', priceDeltaPkr: 0, displayOrder: 3 },
          { label: 'Extra Hot', priceDeltaPkr: 0, displayOrder: 4 },
        ],
      },
    },
  });

  const categoryIds = new Map<string, string>();

  for (const [key, meta] of Object.entries(CATEGORY_META)) {
    const cat = await prisma.category.create({
      data: {
        name: meta.name,
        slug: meta.slug,
        description: meta.description,
        image: meta.image,
        fulfillmentType: meta.fulfillmentType,
        displayOrder: meta.displayOrder,
        isActive: true,
        ...(meta.fulfillmentType === FulfillmentType.HOT_NOW &&
        meta.slug === 'desi-food'
          ? {
              optionGroups: {
                create: [{ optionGroupId: spice.id }],
              },
            }
          : {}),
      },
    });
    categoryIds.set(key, cat.id);
  }

  const usedSlugs = new Set<string>();
  let productCount = 0;
  let optionGroupCount = 0;

  for (const [index, item] of menu.entries()) {
    const meta = CATEGORY_META[item.categoryKey];
    const categoryId = categoryIds.get(item.categoryKey)!;
    const variants = [...item.variants].sort((a, b) => a.pricePkr - b.pricePkr);
    const base = variants[0];
    const hasMeaningfulVariants =
      variants.length > 1 || (variants.length === 1 && variants[0].label !== 'Standard');

    let slugBase = slugify(`${meta.slug}-${item.name}`);
    let slug = slugBase;
    let n = 2;
    while (usedSlugs.has(slug)) {
      slug = `${slugBase}-${n++}`;
    }
    usedSlugs.add(slug);

    const packSize =
      hasMeaningfulVariants && variants.length === 1 ? variants[0].label : null;

    const product = await prisma.product.create({
      data: {
        name: item.name,
        slug,
        description:
          meta.fulfillmentType === FulfillmentType.SCHEDULED
            ? `${item.name} — freezer pack for home cooking.`
            : `${item.name} — ${meta.name.toLowerCase()} from BigBites Lahore.`,
        image: meta.image,
        pricePkr: base.pricePkr,
        costPkr: Math.round(base.pricePkr * 0.58),
        categoryId,
        displayOrder: index + 1,
        isActive: true,
        packSize,
        piecesPerPack: (() => {
          const m = (packSize || '').match(/(\d+)\s*(pcs|pc|pieces|sticks)/i);
          return m ? Number(m[1]) : null;
        })(),
      },
    });
    productCount++;

    // Multiple serving / pack sizes → required size option with price deltas
    if (variants.length > 1) {
      const ogSlug = slugify(`size-${slug}`);
      const optionGroup = await prisma.optionGroup.create({
        data: {
          name: 'Size / Quantity',
          slug: ogSlug,
          selectType: OptionSelectType.SINGLE,
          required: true,
          minSelect: 1,
          maxSelect: 1,
          displayOrder: 0,
          values: {
            create: variants.map((v, i) => ({
              label: v.label,
              priceDeltaPkr: v.pricePkr - base.pricePkr,
              displayOrder: i,
            })),
          },
          products: {
            create: [{ productId: product.id }],
          },
        },
      });
      optionGroupCount++;
      void optionGroup;
    }
  }

  const zones = [
    { name: 'DHA', slug: 'dha', feePkr: 150, etaMinutesMin: 25, etaMinutesMax: 45, displayOrder: 1 },
    { name: 'Gulberg', slug: 'gulberg', feePkr: 120, etaMinutesMin: 30, etaMinutesMax: 50, displayOrder: 2 },
    { name: 'Johar Town', slug: 'johar-town', feePkr: 140, etaMinutesMin: 35, etaMinutesMax: 55, displayOrder: 3 },
    { name: 'Model Town', slug: 'model-town', feePkr: 130, etaMinutesMin: 30, etaMinutesMax: 50, displayOrder: 4 },
    { name: 'Bahria Town', slug: 'bahria-town', feePkr: 200, etaMinutesMin: 45, etaMinutesMax: 75, displayOrder: 5 },
    { name: 'Cantt', slug: 'cantt', feePkr: 160, etaMinutesMin: 30, etaMinutesMax: 55, displayOrder: 6 },
  ];

  for (const z of zones) {
    await prisma.deliveryZone.upsert({
      where: { slug: z.slug },
      update: {
        feePkr: z.feePkr,
        etaMinutesMin: z.etaMinutesMin,
        etaMinutesMax: z.etaMinutesMax,
        displayOrder: z.displayOrder,
        isActive: true,
      },
      create: z,
    });
  }

  const frozenId = categoryIds.get('Frozen Items')!;

  await prisma.promo.create({
    data: {
      code: 'BIGBITES10',
      name: 'Welcome 10% off',
      discountType: DiscountType.PERCENT,
      discountValue: 10,
      minOrderPkr: 1000,
      isActive: true,
    },
  });

  await prisma.promo.create({
    data: {
      code: 'FREEZER200',
      name: 'Rs 200 off frozen stock-up',
      discountType: DiscountType.FIXED,
      discountValue: 200,
      minOrderPkr: 1500,
      categoryId: frozenId,
      isActive: true,
    },
  });

  console.log(
    `BigBites seed complete — ${productCount} products, ${optionGroupCount} size option groups, 4 categories from Excel.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
