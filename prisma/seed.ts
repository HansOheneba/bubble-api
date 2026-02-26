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
  image: string | null = null,
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
      image,
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
      image,
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
  image: string | null = null,
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
      image,
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
      image,
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
  const milkTeaItems: Array<{
    name: string;
    desc: string;
    price: number;
    image: string | null;
  }> = [
    {
      name: 'Brown Sugar Milk',
      desc: 'Rich brown sugar syrup swirled into creamy milk tea.',
      price: 40,
      image:
        'https://images.unsplash.com/photo-1558857563-b371033873b8?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    {
      name: 'Dalgona Coffee',
      desc: 'Whipped coffee foam layered over smooth milk tea.',
      price: 40,
      image:
        'https://images.unsplash.com/photo-1692783029695-1956cd253e10?q=80&w=1227&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    {
      name: 'Caramel Dream Milk',
      desc: 'Silky milk tea with a warm caramel finish.',
      price: 40,
      image:
        'https://images.unsplash.com/photo-1741244133076-afcdda4befae?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    {
      name: 'Coconut Milk',
      desc: 'Light and tropical milk tea with fresh coconut flavour.',
      price: 40,
      image:
        'https://images.unsplash.com/photo-1657759558246-bcb660a1a59b?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    {
      name: 'Vanilla Bliss',
      desc: 'Classic smooth milk tea with a hint of sweet vanilla.',
      price: 40,
      image:
        'https://images.unsplash.com/photo-1657759558246-bcb660a1a59b?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    {
      name: 'Blueberry-Bluey',
      desc: 'Vibrant blueberry milk tea with a naturally sweet taste.',
      price: 40,
      image:
        'https://img.freepik.com/free-photo/healthy-breakfast-meal-with-yogurt-composition_23-2148894703.jpg?t=st=1772108037~exp=1772111637~hmac=52a719ce1eaff3ffa2bde7c64cb3bb96a90b59b16af79dd9562ec460e22c0bb6&w=2000',
    },
    {
      name: 'Original',
      desc: 'The classic milk tea — clean, balanced, and timeless.',
      price: 40,
      image:
        'https://img.freepik.com/free-photo/composition-with-delicious-thai-tea-beverage_23-2148994339.jpg?t=st=1772108773~exp=1772112373~hmac=8089365878c84b8ec1f86a9a86dad296ccd144c902dd2c80e0557f0ac2488199&w=2000',
    },
    {
      name: 'Lilac',
      desc: 'Grape-infused milk tea with a floral purple colour.',
      price: 40,
      image:
        'https://img.freepik.com/free-photo/lavender-latte_23-2151961964.jpg?t=st=1772108799~exp=1772112399~hmac=005ee7439b83a004a1fcc77bd4d8b1b8a5c5b4d5261683de35e5cfe9f1ea42a9&w=2000',
    },
    {
      name: 'Dew Drop-Honeydew',
      desc: 'Refreshing honeydew milk tea with a light melon sweetness.',
      price: 40,
      image:
        'https://img.freepik.com/free-photo/minimalist-still-life-asian-tea_23-2149709028.jpg?t=st=1772109072~exp=1772112672~hmac=9c04d0199a22a9d9bd18cc684b0733e04f2099cfc87b5d71a54770e95587dc3f&w=2000',
    },
    {
      name: 'Blue Lava',
      desc: 'Bold blue-hued milk tea with a tropical punch.',
      price: 40,
      image:
        'https://img.freepik.com/free-photo/rainbow-bubble-tea-mason-jar_23-2151989987.jpg?t=st=1772109045~exp=1772112645~hmac=e40b6e478d8ee1277adf846e0c96ce73e063162edf1a41b53334b3aeac2f6cfe&w=2000',
    },
    {
      name: 'Terrific Taro',
      desc: 'Creamy taro milk tea with an earthy, subtly sweet flavour.',
      price: 40,
      image:
        'https://img.freepik.com/free-photo/healthy-breakfast-meal-with-yogurt_23-2148894699.jpg?t=st=1772109007~exp=1772112607~hmac=cfe3d564a55f896d15a26b366fe6101243f99969d501d3e082d0fdff7600eb14&w=2000',
    },
    {
      name: 'Strawberry-Rosey Rush',
      desc: 'Bright strawberry milk tea with a rosy finish.',
      price: 40,
      image:
        'https://images.unsplash.com/photo-1647201201594-dff923210b3a?q=80&w=1424&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    {
      name: 'Banana Breeze',
      desc: 'Smooth banana milk tea with a tropical sweetness.',
      price: 40,
      image:
        'https://img.freepik.com/free-photo/iced-coffee-glass_74190-634.jpg?t=st=1772108946~exp=1772112546~hmac=d24db29448793394b5c04d0fe73ad513a53ad258d3c30d11b730d69a228e1876&w=2000',
    },
    {
      name: 'Matcha-Emerald',
      desc: 'Earthy Japanese matcha blended into a creamy milk tea.',
      price: 40,
      image:
        'https://img.freepik.com/free-photo/matcha-bubble-tea-clear-cup-with-black-straw_23-2152002554.jpg?t=st=1772108134~exp=1772111734~hmac=9430c67f622e15cd38ac41d0f773904e004c300806ff2252f200ad0f3f6d25b3&w=2000',
    },
    {
      name: 'Chocolate Delight',
      desc: 'Indulgent chocolate milk tea, rich and satisfying.',
      price: 40,
      image:
        'https://img.freepik.com/free-photo/vertical-closeup-plastic-cup-cold-coffee-with-vanilla-cream_181624-59246.jpg?t=st=1772108710~exp=1772112310~hmac=df211fa06594bc358845d7536e3feb1f38973814dd434fba34119d4fe28851ee&w=2000',
    },
    {
      name: 'Mango Magic',
      desc: 'Tropical mango milk tea that is sweet and refreshing.',
      price: 40,
      image:
        'https://img.freepik.com/free-photo/minimalist-still-life-asian-tea_23-2149709036.jpg?t=st=1772108891~exp=1772112491~hmac=4c5f41b20d0a30bf162df93cd5f2fd6b4c072fa921ebc65519dfe22182c4d8c7&w=2000',
    },
    {
      name: 'Pinata-Pineapple',
      desc: 'Tangy pineapple milk tea with a festive tropical flavour.',
      price: 40,
      image:
        'https://img.freepik.com/free-photo/front-view-assortment-healthy-breakfast-meal-with-yogurt_23-2148894684.jpg?t=st=1772108362~exp=1772111962~hmac=e405d307f39ff562dcaff357a5cefe2541f8cb6dcf4f7a234ef9309e987d611a&w=2000',
    },
    {
      name: 'Chai Chiller',
      desc: 'Spiced chai flavours in a cool, creamy milk tea.',
      price: 40,
      image:
        'https://img.freepik.com/free-photo/blackcurrant-confiture-white-saucer-with-glass-juice-around_114579-23333.jpg?t=st=1772108818~exp=1772112418~hmac=21dce050b15c1b47e4df0687e93968ffbbf47cdca25c03841b6fbe2b4abf0c78&w=2000',
    },
    {
      name: 'Frosted Chocolate',
      desc: 'Deep chocolate milk tea with a frosty, chilled finish.',
      price: 40,
      image:
        'https://img.freepik.com/free-photo/vertical-closeup-plastic-cup-cold-coffee-with-vanilla-cream_181624-59246.jpg?t=st=1772108710~exp=1772112310~hmac=df211fa06594bc358845d7536e3feb1f38973814dd434fba34119d4fe28851ee&w=2000',
    },
    {
      name: 'Zesty-Pineapple Ginger',
      desc: 'Zingy pineapple and ginger milk tea with a spiced kick.',
      price: 40,
      image:
        'https://img.freepik.com/free-photo/still-life-with-bubble-tea_52683-100624.jpg?t=st=1772108676~exp=1772112276~hmac=ea5ed22c90bfa997ddb45e032ee6969827d45935232b0d1b4151da019f4ff0c7&w=2000',
    },
    {
      name: 'Purple Cloud - Ube',
      desc: 'Creamy ube milk tea with a vivid purple colour.',
      price: 40,
      image:
        'https://img.freepik.com/free-photo/front-view-composition-healthy-breakfast-meal-with-yogurt_23-2148894694.jpg?t=st=1772108620~exp=1772112220~hmac=06c9f9297726ed094e5b8bcd54f6983944719767afb77b14ce95644b649539b0&w=2000',
    },
    {
      name: 'Lotus',
      desc: 'Delicately floral lotus milk tea with a smooth, clean taste.',
      price: 50,
      image:
        'https://images.unsplash.com/photo-1639927663411-35f23bb792b7?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    {
      name: 'Oreo',
      desc: 'Cookies-and-cream milk tea loaded with Oreo flavour.',
      price: 50,
      image:
        'https://images.unsplash.com/photo-1600773407745-8eaa1937e802?q=80&w=1277&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    {
      name: 'Tiramisu',
      desc: 'Coffee-soaked tiramisu flavour in a rich creamy milk tea.',
      price: 50,
      image:
        'https://img.freepik.com/free-photo/iced-coffee-with-chocolate-syrup_1150-18528.jpg?t=st=1772108449~exp=1772112049~hmac=d0dc152b2cb6173f26e451720315456f830357a3e704d7b52879136515f8fb86&w=2000',
    },
    {
      name: 'Vanilla',
      desc: 'Sweet and smooth vanilla milk tea, a crowd favourite.',
      price: 50,
      image:
        'https://img.freepik.com/free-photo/composition-with-delicious-thai-tea_23-2148994320.jpg?t=st=1772108420~exp=1772112020~hmac=b81c0d8973b607326dfb514ef3766e56be74e1d21555f6e6c5817bfe73e8b31f&w=2000',
    },
    {
      name: 'Purple Cloud',
      desc: 'Dreamy ube and vanilla swirled into a purple milk tea.',
      price: 50,
      image:
        'https://img.freepik.com/free-photo/healthy-breakfast-meal-with-yogurt-composition_23-2148894703.jpg?t=st=1772108037~exp=1772111637~hmac=52a719ce1eaff3ffa2bde7c64cb3bb96a90b59b16af79dd9562ec460e22c0bb6&w=2000',
    },
    {
      name: 'Pina Colada',
      desc: 'Pineapple and coconut blended into a tropical milk tea.',
      price: 50,
      image:
        'https://img.freepik.com/free-photo/front-view-assortment-healthy-breakfast-meal-with-yogurt_23-2148894684.jpg?t=st=1772108362~exp=1772111962~hmac=e405d307f39ff562dcaff357a5cefe2541f8cb6dcf4f7a234ef9309e987d611a&w=2000',
    },
    {
      name: 'Cheesy Mango',
      desc: 'Juicy mango milk tea topped with a smooth cheese foam.',
      price: 50,
      image:
        'https://img.freepik.com/free-photo/minimalist-still-life-asian-tea_23-2149709040.jpg?t=st=1772108261~exp=1772111861~hmac=d792fcd1ad1bc62f8b276c47bebf9dc066cbaed7baf95b07e902e1d03eff4fef&w=2000',
    },
    {
      name: 'Matcha',
      desc: 'Pure ceremonial matcha in a well-balanced creamy milk tea.',
      price: 50,
      image:
        'https://img.freepik.com/free-photo/matcha-bubble-tea-clear-cup-with-black-straw_23-2152002554.jpg?t=st=1772108134~exp=1772111734~hmac=9430c67f622e15cd38ac41d0f773904e004c300806ff2252f200ad0f3f6d25b3&w=2000',
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
      item.image,
    );
  }

  // ── HQ Special ────────────────────────────────────────────────────────────────
  const hqItems: Array<{
    name: string;
    desc: string;
    price: number;
    image: string | null;
  }> = [
    {
      name: 'Corny Boba-Popcorn',
      desc: 'Buttery popcorn-inspired milk tea loaded with chewy boba.',
      price: 40,
      image:
        'https://img.freepik.com/free-psd/delicious-caramel-popcorn-milkshake-creamy-indulgence_632498-24631.jpg?t=st=1772110359~exp=1772113959~hmac=596a24550a0920c7cfb1b61c1c8042ee9fe10949ef5da731a0c30790d7348385&w=2000',
    },
    {
      name: 'Cheesy Mango',
      desc: 'Juicy mango base topped with a signature cheese foam.',
      price: 50,
      image:
        'https://images.unsplash.com/photo-1697642452436-9c40773cbcbb?q=80&w=1530&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    {
      name: 'C3 Blaze - Chocolate Chip Cookie',
      desc: 'Chocolate chip cookie milk tea with a bold, indulgent flavour.',
      price: 40,
      image:
        'https://plus.unsplash.com/premium_photo-1695750678153-e7148811673e?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    {
      name: 'Pina Colada',
      desc: 'Pineapple and coconut milk tea with a tropical resort feel.',
      price: 50,
      image:
        'https://images.unsplash.com/photo-1596392301391-e8622b210bd4?q=80&w=1288&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    {
      name: 'Cheesy Ube',
      desc: 'Purple ube milk tea finished with a smooth, salty cheese foam.',
      price: 40,
      image:
        'https://images.unsplash.com/photo-1745725247846-12a3e3109bbf?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
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
      item.image,
    );
  }

  // ── Iced Tea ──────────────────────────────────────────────────────────────────
  const icedTeaItems: Array<{
    name: string;
    desc: string;
    image: string | null;
  }> = [
    {
      name: 'Fizzy Lemonade',
      desc: 'Sparkling lemonade iced tea with a bright citrus zing.',
      image:
        'https://images.unsplash.com/photo-1575596510825-f748919a2bf7?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    {
      name: 'Peach Perfect',
      desc: 'Sweet peach iced tea that is smooth and refreshing.',
      image:
        'https://images.unsplash.com/photo-1745834311090-9e7055865fc0?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    {
      name: 'Spiced Chai',
      desc: 'Warming chai spices over a chilled iced tea base.',
      image:
        'https://images.unsplash.com/photo-1628702773947-1bcd12856811?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
  ];

  for (let i = 0; i < icedTeaItems.length; i++) {
    const item = icedTeaItems[i];
    await upsertProductWithPrice(
      item.name,
      item.desc,
      icedTea.id,
      40,
      i + 1,
      item.image,
    );
  }

  // ── Milkshakes ────────────────────────────────────────────────────────────────
  const milkshakeItems: Array<{
    name: string;
    desc: string;
    price: number;
    image: string | null;
  }> = [
    {
      name: 'Creamy Chai',
      desc: 'Thick and spiced chai milkshake with a warm, creamy finish.',
      price: 55,
      image:
        'https://images.unsplash.com/photo-1653122025865-5e75e63cf4ba?q=80&w=1288&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    {
      name: 'Bubble Gum',
      desc: 'Fun and sweet bubble gum milkshake with a pop of colour.',
      price: 55,
      image:
        'https://images.unsplash.com/photo-1635748501948-fd6ef8ca7812?q=80&w=1254&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    {
      name: 'Vanilla',
      desc: 'Classic thick vanilla milkshake, smooth and satisfying.',
      price: 55,
      image:
        'https://images.unsplash.com/photo-1755835070338-6049da75951e?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
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
      item.image,
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
    'https://img.freepik.com/free-photo/chicken-durum-shaurma-with-lavash-french-fries-wooden-board_114579-89.jpg?t=st=1772109982~exp=1772113582~hmac=42d84e7514718109e293d71e2a834e221dd902261788e3c7c28f5bb0cf048bd7&w=2000',
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
    'https://img.freepik.com/free-photo/side-view-shawarma-with-fried-potatoes-board-cookware_176474-3215.jpg?t=st=1772109182~exp=1772112782~hmac=6b28bdcb92a09d8ffa1e4d3768e31c89e3ed3b6167e4f68928b46b2085ff35d1&w=2000',
  );

  await upsertProductWithPrice(
    'Mixed Shawarma',
    'A generous mix of chicken and beef shawarma in one satisfying wrap.',
    shawarma.id,
    75,
    3,
    'https://img.freepik.com/free-photo/side-view-shawarma-with-fried-potatoes-board-cookware_176474-3215.jpg?t=st=1772109182~exp=1772112782~hmac=6b28bdcb92a09d8ffa1e4d3768e31c89e3ed3b6167e4f68928b46b2085ff35d1&w=2000',
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
    'https://img.freepik.com/free-photo/chicken-wrap-doner-with-french-fries-vegetables-inside_140725-10507.jpg?t=st=1772109929~exp=1772113529~hmac=aeba1f79d3d05189971ec21d2cdb7a5865de53100c319c4b3744c13a11bd45ea&w=2000',
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
    'https://img.freepik.com/free-photo/chicken-wrap-doner-with-french-fries-vegetables-inside_140725-10507.jpg?t=st=1772109929~exp=1772113529~hmac=aeba1f79d3d05189971ec21d2cdb7a5865de53100c319c4b3744c13a11bd45ea&w=2000',
  );

  await upsertProductWithPrice(
    'Cheese Mixed Shawarma',
    'Mixed chicken and beef shawarma loaded with melted cheese throughout.',
    shawarma.id,
    90,
    6,
    'https://img.freepik.com/free-photo/chicken-wrap-doner-with-french-fries-vegetables-inside_140725-10507.jpg?t=st=1772109929~exp=1772113529~hmac=aeba1f79d3d05189971ec21d2cdb7a5865de53100c319c4b3744c13a11bd45ea&w=2000',
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
