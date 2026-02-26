// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ── Helpers ────────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function ghs(amount: number): number {
  return amount * 100; // store as pesewas
}

// ── Upsert a drink or single-price product (no variants) ──────────────────────
async function upsertProductWithPrice(
  name: string,
  description: string,
  categoryId: number,
  priceGhs: number,
  sortOrder: number,
) {
  const slug = toSlug(name);
  return prisma.product.upsert({
    where: { slug },
    update: {
      name,
      description,
      categoryId,
      priceInPesewas: ghs(priceGhs),
      sortOrder,
      isActive: true,
      inStock: true,
    },
    create: {
      slug,
      name,
      description,
      categoryId,
      priceInPesewas: ghs(priceGhs),
      sortOrder,
      isActive: true,
      inStock: true,
    },
  });
}

// ── Upsert a shawarma product with size variants ───────────────────────────────
async function upsertShawarmaWithVariants(
  name: string,
  description: string,
  categoryId: number,
  variants: Array<{ key: string; label: string; priceGhs: number }>,
  sortOrder: number,
) {
  const slug = toSlug(name);
  const product = await prisma.product.upsert({
    where: { slug },
    update: {
      name,
      description,
      categoryId,
      sortOrder,
      isActive: true,
      inStock: true,
    },
    create: {
      slug,
      name,
      description,
      categoryId,
      priceInPesewas: null,
      sortOrder,
      isActive: true,
      inStock: true,
    },
  });

  for (let j = 0; j < variants.length; j++) {
    const v = variants[j];
    await prisma.productVariant.upsert({
      where: { productId_key: { productId: product.id, key: v.key } },
      update: { label: v.label, priceInPesewas: ghs(v.priceGhs) },
      create: {
        productId: product.id,
        key: v.key,
        label: v.label,
        priceInPesewas: ghs(v.priceGhs),
        sortOrder: j + 1,
      },
    });
  }
  return product;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding Bubble Bliss database...');

  // ── Categories ───────────────────────────────────────────────────────────────
  const milkTea = await prisma.category.upsert({
    where: { slug: 'milk-tea' },
    update: {},
    create: { slug: 'milk-tea', name: 'Milk Tea', sortOrder: 1 },
  });
  const hqSpecial = await prisma.category.upsert({
    where: { slug: 'hq-special' },
    update: {},
    create: { slug: 'hq-special', name: 'HQ Special', sortOrder: 2 },
  });
  const icedTea = await prisma.category.upsert({
    where: { slug: 'iced-tea' },
    update: {},
    create: { slug: 'iced-tea', name: 'Iced Tea', sortOrder: 3 },
  });
  const milkshake = await prisma.category.upsert({
    where: { slug: 'milkshakes' },
    update: {},
    create: { slug: 'milkshakes', name: 'Milkshakes', sortOrder: 4 },
  });
  const shawarma = await prisma.category.upsert({
    where: { slug: 'shawarma' },
    update: {},
    create: { slug: 'shawarma', name: 'Shawarma', sortOrder: 5 },
  });

  // ── Milk Tea ──────────────────────────────────────────────────────────────────
  const milkTeaItems: Array<{ name: string; desc: string; price: number }> = [
    {
      name: 'Brown Sugar Milk',
      desc: 'Rich brown sugar syrup swirled into creamy milk tea.',
      price: 40,
    },
    {
      name: 'Dalgona Coffee',
      desc: 'Whipped coffee foam layered over smooth milk tea.',
      price: 40,
    },
    {
      name: 'Caramel Dream Milk',
      desc: 'Silky milk tea with a warm caramel finish.',
      price: 40,
    },
    {
      name: 'Coconut Milk',
      desc: 'Light and tropical milk tea with fresh coconut flavour.',
      price: 40,
    },
    {
      name: 'Vanilla Bliss',
      desc: 'Classic smooth milk tea with a hint of sweet vanilla.',
      price: 40,
    },
    {
      name: 'Blueberry-Bluey',
      desc: 'Vibrant blueberry milk tea with a naturally sweet taste.',
      price: 40,
    },
    {
      name: 'Original',
      desc: 'The classic milk tea — clean, balanced, and timeless.',
      price: 40,
    },
    {
      name: 'Lilac',
      desc: 'Grape-infused milk tea with a floral purple colour.',
      price: 40,
    },
    {
      name: 'Dew Drop-Honeydew',
      desc: 'Refreshing honeydew milk tea with a light melon sweetness.',
      price: 40,
    },
    {
      name: 'Blue Lava',
      desc: 'Bold blue-hued milk tea with a tropical punch.',
      price: 40,
    },
    {
      name: 'Terrific Taro',
      desc: 'Creamy taro milk tea with an earthy, subtly sweet flavour.',
      price: 40,
    },
    {
      name: 'Strawberry-Rosey Rush',
      desc: 'Bright strawberry milk tea with a rosy finish.',
      price: 40,
    },
    {
      name: 'Banana Breeze',
      desc: 'Smooth banana milk tea with a tropical sweetness.',
      price: 40,
    },
    {
      name: 'Matcha-Emerald',
      desc: 'Earthy Japanese matcha blended into a creamy milk tea.',
      price: 40,
    },
    {
      name: 'Chocolate Delight',
      desc: 'Indulgent chocolate milk tea, rich and satisfying.',
      price: 40,
    },
    {
      name: 'Mango Magic',
      desc: 'Tropical mango milk tea that is sweet and refreshing.',
      price: 40,
    },
    {
      name: 'Pinata-Pineapple',
      desc: 'Tangy pineapple milk tea with a festive tropical flavour.',
      price: 40,
    },
    {
      name: 'Chai Chiller',
      desc: 'Spiced chai flavours in a cool, creamy milk tea.',
      price: 40,
    },
    {
      name: 'Frosted Chocolate',
      desc: 'Deep chocolate milk tea with a frosty, chilled finish.',
      price: 40,
    },
    {
      name: 'Zesty-Pineapple Ginger',
      desc: 'Zingy pineapple and ginger milk tea with a spiced kick.',
      price: 40,
    },
    {
      name: 'Purple Cloud - Ube',
      desc: 'Creamy ube milk tea with a vivid purple colour.',
      price: 40,
    },
    {
      name: 'Lotus',
      desc: 'Delicately floral lotus milk tea with a smooth, clean taste.',
      price: 50,
    },
    {
      name: 'Oreo',
      desc: 'Cookies-and-cream milk tea loaded with Oreo flavour.',
      price: 50,
    },
    {
      name: 'Tiramisu',
      desc: 'Coffee-soaked tiramisu flavour in a rich creamy milk tea.',
      price: 50,
    },
    {
      name: 'Vanilla',
      desc: 'Sweet and smooth vanilla milk tea, a crowd favourite.',
      price: 50,
    },
    {
      name: 'Purple Cloud',
      desc: 'Dreamy ube and vanilla swirled into a purple milk tea.',
      price: 50,
    },
    {
      name: 'Pina Colada',
      desc: 'Pineapple and coconut blended into a tropical milk tea.',
      price: 50,
    },
    {
      name: 'Cheesy Mango',
      desc: 'Juicy mango milk tea topped with a smooth cheese foam.',
      price: 50,
    },
    {
      name: 'Matcha',
      desc: 'Pure ceremonial matcha in a well-balanced creamy milk tea.',
      price: 50,
    },
  ];

  for (let i = 0; i < milkTeaItems.length; i++) {
    const item = milkTeaItems[i];
    await upsertProductWithPrice(
      item.name,
      item.desc,
      milkTea.id,
      item.price,
      i + 1,
    );
  }

  // ── HQ Special ────────────────────────────────────────────────────────────────
  const hqItems: Array<{ name: string; desc: string; price: number }> = [
    {
      name: 'Corny Boba-Popcorn',
      desc: 'Buttery popcorn-inspired milk tea loaded with chewy boba.',
      price: 40,
    },
    {
      name: 'Cheesy Mango',
      desc: 'Juicy mango base topped with a signature cheese foam.',
      price: 50,
    },
    {
      name: 'C3 Blaze - Chocolate Chip Cookie',
      desc: 'Chocolate chip cookie milk tea with a bold, indulgent flavour.',
      price: 40,
    },
    {
      name: 'Pina Colada',
      desc: 'Pineapple and coconut milk tea with a tropical resort feel.',
      price: 50,
    },
    {
      name: 'Cheesy Ube',
      desc: 'Purple ube milk tea finished with a smooth, salty cheese foam.',
      price: 40,
    },
  ];

  for (let i = 0; i < hqItems.length; i++) {
    const item = hqItems[i];
    await upsertProductWithPrice(
      item.name,
      item.desc,
      hqSpecial.id,
      item.price,
      i + 1,
    );
  }

  // ── Iced Tea ──────────────────────────────────────────────────────────────────
  const icedTeaItems: Array<{ name: string; desc: string }> = [
    {
      name: 'Fizzy Lemonade',
      desc: 'Sparkling lemonade iced tea with a bright citrus zing.',
    },
    {
      name: 'Peach Perfect',
      desc: 'Sweet peach iced tea that is smooth and refreshing.',
    },
    {
      name: 'Spiced Chai',
      desc: 'Warming chai spices over a chilled iced tea base.',
    },
  ];

  for (let i = 0; i < icedTeaItems.length; i++) {
    const item = icedTeaItems[i];
    await upsertProductWithPrice(item.name, item.desc, icedTea.id, 40, i + 1);
  }

  // ── Milkshakes ────────────────────────────────────────────────────────────────
  const milkshakeItems: Array<{ name: string; desc: string; price: number }> = [
    {
      name: 'Creamy Chai',
      desc: 'Thick and spiced chai milkshake with a warm, creamy finish.',
      price: 55,
    },
    {
      name: 'Bubble Gum',
      desc: 'Fun and sweet bubble gum milkshake with a pop of colour.',
      price: 55,
    },
    {
      name: 'Vanilla',
      desc: 'Classic thick vanilla milkshake, smooth and satisfying.',
      price: 55,
    },
  ];

  for (let i = 0; i < milkshakeItems.length; i++) {
    const item = milkshakeItems[i];
    await upsertProductWithPrice(
      item.name,
      item.desc,
      milkshake.id,
      item.price,
      i + 1,
    );
  }

  // ── Shawarma — base ───────────────────────────────────────────────────────────
  await upsertShawarmaWithVariants(
    'Chicken Shawarma',
    'Tender grilled chicken wrapped in a soft flatbread with fresh toppings.',
    shawarma.id,
    [
      { key: 'medium', label: 'Medium', priceGhs: 50 },
      { key: 'large', label: 'Large', priceGhs: 60 },
    ],
    1,
  );

  await upsertShawarmaWithVariants(
    'Beef Shawarma',
    'Juicy seasoned beef in a soft wrap with crisp vegetables and sauce.',
    shawarma.id,
    [
      { key: 'medium', label: 'Medium', priceGhs: 55 },
      { key: 'large', label: 'Large', priceGhs: 65 },
    ],
    2,
  );

  await upsertProductWithPrice(
    'Mixed Shawarma',
    'A generous mix of chicken and beef shawarma in one satisfying wrap.',
    shawarma.id,
    75,
    3,
  );

  // ── Shawarma — cheese versions (+15) ─────────────────────────────────────────
  await upsertShawarmaWithVariants(
    'Cheese Chicken Shawarma',
    'Grilled chicken shawarma with melted cheese for an extra indulgent bite.',
    shawarma.id,
    [
      { key: 'medium', label: 'Medium', priceGhs: 65 },
      { key: 'large', label: 'Large', priceGhs: 75 },
    ],
    4,
  );

  await upsertShawarmaWithVariants(
    'Cheese Beef Shawarma',
    'Seasoned beef shawarma with a rich melted cheese layer inside.',
    shawarma.id,
    [
      { key: 'medium', label: 'Medium', priceGhs: 70 },
      { key: 'large', label: 'Large', priceGhs: 80 },
    ],
    5,
  );

  await upsertProductWithPrice(
    'Cheese Mixed Shawarma',
    'Mixed chicken and beef shawarma loaded with melted cheese throughout.',
    shawarma.id,
    90,
    6,
  );

  // ── Toppings ──────────────────────────────────────────────────────────────────
  const toppingsList: Array<{
    name: string;
    priceGhs: number;
    sortOrder: number;
  }> = [
    { name: 'Chocolate', priceGhs: 5, sortOrder: 1 },
    { name: 'Sweetened Choco', priceGhs: 5, sortOrder: 2 },
    { name: 'Vanilla', priceGhs: 5, sortOrder: 3 },
    { name: 'Cheese Foam', priceGhs: 7, sortOrder: 4 },
    { name: 'Strawberry Popping', priceGhs: 6, sortOrder: 5 },
    { name: 'Blueberry Popping', priceGhs: 6, sortOrder: 6 },
    { name: 'Mint Popping', priceGhs: 6, sortOrder: 7 },
    { name: 'Whipped Cream', priceGhs: 6, sortOrder: 8 },
    { name: 'Biscoff Spread', priceGhs: 8, sortOrder: 9 },
    { name: 'Caramel Syrup', priceGhs: 5, sortOrder: 10 },
    { name: 'Grape Popping', priceGhs: 6, sortOrder: 11 },
    { name: 'Strawberry Jam', priceGhs: 5, sortOrder: 12 },
    { name: 'Extra Boba', priceGhs: 10, sortOrder: 13 },
    { name: 'Extra Cheese Foam', priceGhs: 10, sortOrder: 14 },
  ];

  for (const t of toppingsList) {
    const existing = await prisma.topping.findFirst({
      where: { name: t.name },
    });
    if (!existing) {
      await prisma.topping.create({
        data: {
          name: t.name,
          priceInPesewas: ghs(t.priceGhs),
          isActive: true,
          inStock: true,
          sortOrder: t.sortOrder,
        },
      });
    } else {
      await prisma.topping.update({
        where: { id: existing.id },
        data: {
          priceInPesewas: ghs(t.priceGhs),
          isActive: true,
          inStock: true,
          sortOrder: t.sortOrder,
        },
      });
    }
  }

  // ── Admin user ────────────────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@bubblebliss.com';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';
  const hash = await bcrypt.hash(adminPassword, 12);

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash: hash },
  });

  console.log('✅ Seeding complete!');
  console.log(`   Admin login → ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
