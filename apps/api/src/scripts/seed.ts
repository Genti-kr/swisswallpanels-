import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';

const multilingual = (de: string, fr: string, en: string, sq: string) => ({ de, fr, en, sq });

const shippingRates = [
  { country: 'CH', carrier: 'PostCH', name: 'Post CH Priority', description: '1-2 business days', price: 8.9, currency: 'CHF', minDays: 1, maxDays: 2, freeAbove: 150 },
  { country: 'CH', carrier: 'PostCH', name: 'Post CH Economy', description: '3-5 business days', price: 6.9, currency: 'CHF', minDays: 3, maxDays: 5, freeAbove: 150 },
  { country: 'CH', carrier: 'DPD', name: 'DPD Switzerland', description: '2-3 business days', price: 9.9, currency: 'CHF', minDays: 2, maxDays: 3, freeAbove: 150 },
  { country: 'DE', carrier: 'DHL', name: 'DHL Standard', description: '3-5 business days', price: 6.9, currency: 'EUR', minDays: 3, maxDays: 5, freeAbove: 100 },
  { country: 'DE', carrier: 'DHL', name: 'DHL Express', description: '1-2 business days', price: 14.9, currency: 'EUR', minDays: 1, maxDays: 2, freeAbove: null },
  { country: 'FR', carrier: 'Colissimo', name: 'Colissimo', description: '3-5 business days', price: 8.9, currency: 'EUR', minDays: 3, maxDays: 5, freeAbove: 120 },
  { country: 'FR', carrier: 'Chronopost', name: 'Chronopost', description: '1-2 business days', price: 16.9, currency: 'EUR', minDays: 1, maxDays: 2, freeAbove: null },
  { country: 'IT', carrier: 'SDA', name: 'SDA', description: '4-6 business days', price: 9.9, currency: 'EUR', minDays: 4, maxDays: 6, freeAbove: 120 },
  { country: 'IT', carrier: 'BRT', name: 'BRT Express', description: '2-3 business days', price: 17.9, currency: 'EUR', minDays: 2, maxDays: 3, freeAbove: null },
];

async function main() {
  console.log('Seeding database...');

  if (process.env.NODE_ENV === 'production' && process.env.SEED_DEMO_USERS === 'true') {
    console.error('[FATAL] Refusing to seed demo users in production. Set SEED_DEMO_USERS=false');
    process.exit(1);
  }

  const seedDemoUsers = process.env.SEED_DEMO_USERS === 'true';

  if (seedDemoUsers) {
    const adminPasswordRaw = process.env.ADMIN_SEED_PASSWORD;
    const testPasswordRaw = process.env.E2E_USER_PASSWORD;

    if (!adminPasswordRaw || adminPasswordRaw.includes('change-me')) {
      throw new Error('Set ADMIN_SEED_PASSWORD before seeding demo users');
    }
    if (!testPasswordRaw || testPasswordRaw.includes('change-me')) {
      throw new Error('Set E2E_USER_PASSWORD before seeding demo users');
    }

    const adminPassword = await bcrypt.hash(adminPasswordRaw, 12);

    const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@swisswallpanels.ch' },
    update: {
      emailVerified: true,
      role: 'SUPERADMIN',
    },
    create: {
      email: 'admin@swisswallpanels.ch',
      passwordHash: adminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPERADMIN',
      emailVerified: true,
      preferredLanguage: 'DE',
      country: 'CH',
    },
  });

  await prisma.cart.upsert({
    where: { userId: superAdmin.id },
    update: {},
    create: { userId: superAdmin.id },
  });

  await prisma.wishlist.upsert({
    where: { userId: superAdmin.id },
    update: {},
    create: { userId: superAdmin.id },
  });

  const testUserPassword = await bcrypt.hash(testPasswordRaw, 12);
  const testUser = await prisma.user.upsert({
    where: { email: 'user@swisswallpanels.ch' },
    update: {
      emailVerified: true,
      role: 'USER',
    },
    create: {
      email: 'user@swisswallpanels.ch',
      passwordHash: testUserPassword,
      firstName: 'Test',
      lastName: 'Buyer',
      role: 'USER',
      emailVerified: true,
      preferredLanguage: 'DE',
      country: 'CH',
    },
  });

  await prisma.cart.upsert({
    where: { userId: testUser.id },
    update: {},
    create: { userId: testUser.id },
  });

  await prisma.wishlist.upsert({
    where: { userId: testUser.id },
    update: {},
    create: { userId: testUser.id },
  });
  } else {
    console.log('Skipping demo users (SEED_DEMO_USERS=false).');
  }

  await prisma.appSetting.upsert({
    where: { id: 'global' },
    update: {},
    create: { id: 'global', maintenanceMode: false },
  });

  for (const rate of shippingRates) {
    const existing = await prisma.shippingRate.findFirst({
      where: { country: rate.country, name: rate.name },
    });
    if (!existing) {
      await prisma.shippingRate.create({ data: rate });
    }
  }

  await prisma.discountCode.upsert({
    where: { code: 'SUMMER10' },
    update: {},
    create: {
      code: 'SUMMER10',
      type: 'PERCENT',
      value: 10,
      minOrderChf: 50,
      maxUsesTotal: 1000,
      isActive: true,
    },
  });

  const acoustic = await prisma.category.upsert({
    where: { slug: 'akustikpaneele' },
    update: {},
    create: {
      slug: 'akustikpaneele',
      nameJson: multilingual('Akustikpaneele', 'Panneaux acoustiques', 'Acoustic Panels', 'Panele akustike'),
      descJson: multilingual(
        'Hochwertige akustische Wandpaneele',
        'Panneaux acoustiques de haute qualité',
        'High-quality acoustic wall panels',
        'Panele akustike me cilësi të lartë'
      ),
      sortOrder: 1,
    },
  });

  const decorative = await prisma.category.upsert({
    where: { slug: 'dekorationspaneele' },
    update: {},
    create: {
      slug: 'dekorationspaneele',
      nameJson: multilingual('Dekorationspaneele', 'Panneaux décoratifs', 'Decorative Panels', 'Panele dekorative'),
      descJson: multilingual(
        'Elegante dekorative Wandverkleidungen',
        'Revêtements muraux décoratifs élégants',
        'Elegant decorative wall coverings',
        'Veshje dekorative elegante për mure'
      ),
      sortOrder: 2,
    },
  });

  const wood = await prisma.category.upsert({
    where: { slug: 'holzpaneele' },
    update: {},
    create: {
      slug: 'holzpaneele',
      nameJson: multilingual('Holzpaneele', 'Panneaux en bois', 'Wood Panels', 'Panele druri'),
      descJson: multilingual(
        'Natürliche Holzpaneele aus Schweizer Handwerk',
        'Panneaux en bois naturel artisanat suisse',
        'Natural wood panels Swiss craftsmanship',
        'Panele druri natyral zejtari zviceran'
      ),
      sortOrder: 3,
    },
  });

  const products = [
    {
      slug: 'amf-premium-panel',
      sku: 'SWP-AMF-000',
      categoryId: decorative.id,
      nameJson: multilingual('AMF Premium Panel', 'Panneau AMF Premium', 'AMF Premium Panel', 'Panel AMF Premium'),
      descJson: multilingual(
        'Premium Wandpaneel mit AMF Farbkatalog — wählen Sie Ihre Oberfläche',
        'Panneau mural premium avec catalogue couleurs AMF',
        'Premium wall panel with AMF color catalog — choose your finish',
        'Panel muri premium me katalog ngjyrash AMF — zgjidhni përfundimin'
      ),
      specsJson: { thickness_mm: 12, width_mm: 600, height_mm: 2400, weight_kg: 4.0, catalogSeries: 'amf' },
      acousticRating: 0.6,
      fireRatingClass: 'B-s1,d0',
      material: 'AMF Composite',
      priceChf: 68.0,
      priceBtwChf: 55.0,
      stockQuantity: 100,
      isFeatured: true,
      sortOrder: 0,
      imageUrl: '/catalogs/amf/AMF-326.jpg',
    },
    {
      slug: 'eiche-akustik-pro',
      sku: 'SWP-EAP-001',
      categoryId: acoustic.id,
      nameJson: multilingual('Eiche Akustik Pro', 'Chêne Acoustique Pro', 'Oak Acoustic Pro', 'Lisi Akustik Pro'),
      descJson: multilingual(
        'Premium Eichen-Akustikpaneel mit NRC 0.85',
        'Panneau acoustique en chêne premium NRC 0.85',
        'Premium oak acoustic panel NRC 0.85',
        'Panel akustik lisi premium NRC 0.85'
      ),
      specsJson: { thickness_mm: 12, width_mm: 600, height_mm: 2400, weight_kg: 4.2 },
      acousticRating: 0.85,
      fireRatingClass: 'B-s1,d0',
      material: 'Oak',
      priceChf: 89.0,
      priceBtwChf: 72.0,
      stockQuantity: 120,
      isFeatured: true,
      sortOrder: 1,
      imageUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&q=80',
    },
    {
      slug: 'nussbaum-dekor',
      sku: 'SWP-ND-002',
      categoryId: decorative.id,
      nameJson: multilingual('Nussbaum Dekor', 'Noyer Décor', 'Walnut Decor', 'Arra Dekor'),
      descJson: multilingual(
        'Warmes Nussbaum-Dekorpaneel für Wohnräume',
        'Panneau décoratif en noyer pour intérieurs',
        'Warm walnut decor panel for living spaces',
        'Panel dekorativ arra për hapësira banimi'
      ),
      specsJson: { thickness_mm: 10, width_mm: 600, height_mm: 2400, weight_kg: 3.8 },
      acousticRating: 0.45,
      fireRatingClass: 'B-s2,d0',
      material: 'Walnut',
      priceChf: 72.0,
      priceBtwChf: 58.0,
      stockQuantity: 85,
      isFeatured: true,
      sortOrder: 2,
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
    },
    {
      slug: 'kiefer-natur',
      sku: 'SWP-KN-003',
      categoryId: wood.id,
      nameJson: multilingual('Kiefer Natur', 'Pin Naturel', 'Natural Pine', 'Pishë Natyrale'),
      descJson: multilingual(
        'Natürliches Kiefernholz mit sichtbarer Maserung',
        'Pin naturel avec grain visible',
        'Natural pine with visible grain',
        'Pishë natyrale me fije të dukshme'
      ),
      specsJson: { thickness_mm: 8, width_mm: 600, height_mm: 2400, weight_kg: 3.2 },
      acousticRating: 0.35,
      fireRatingClass: 'C-s2,d0',
      material: 'Pine',
      priceChf: 58.0,
      priceBtwChf: 47.0,
      stockQuantity: 200,
      isFeatured: true,
      sortOrder: 3,
      imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
    },
    {
      slug: 'slate-grey-modern',
      sku: 'SWP-SGM-004',
      categoryId: decorative.id,
      nameJson: multilingual('Slate Grey Modern', 'Gris Ardoise Moderne', 'Slate Grey Modern', 'Gri Ardezi Modern'),
      descJson: multilingual(
        'Modernes Schiefergrau-Panel für minimalistische Räume',
        'Panneau gris ardoise moderne pour espaces minimalistes',
        'Modern slate grey panel for minimalist spaces',
        'Panel gri ardezi modern për hapësira minimaliste'
      ),
      specsJson: { thickness_mm: 12, width_mm: 600, height_mm: 2400, weight_kg: 4.0 },
      acousticRating: 0.55,
      fireRatingClass: 'B-s1,d0',
      material: 'Composite',
      priceChf: 65.0,
      priceBtwChf: 52.0,
      stockQuantity: 150,
      isFeatured: false,
      sortOrder: 4,
      imageUrl: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80',
    },
    {
      slug: 'walnuss-akustik-plus',
      sku: 'SWP-WAP-005',
      categoryId: acoustic.id,
      nameJson: multilingual('Walnuss Akustik Plus', 'Noyer Acoustique Plus', 'Walnut Acoustic Plus', 'Arra Akustik Plus'),
      descJson: multilingual(
        'Akustikpaneel in Walnussoptik mit hoher Schalldämmung',
        'Panneau acoustique effet noyer haute isolation',
        'Walnut-look acoustic panel high sound insulation',
        'Panel akustik pamje arra me izolim të lartë'
      ),
      specsJson: { thickness_mm: 15, width_mm: 600, height_mm: 2400, weight_kg: 4.8 },
      acousticRating: 0.92,
      fireRatingClass: 'B-s1,d0',
      material: 'Walnut composite',
      priceChf: 98.0,
      priceBtwChf: 79.0,
      stockQuantity: 60,
      isFeatured: false,
      sortOrder: 5,
      imageUrl: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80',
    }
  ];

  const amfColorVariants = [
    { code: 'AMF-326', names: multilingual('Anthrazit', 'Anthracite', 'Anthracite', 'Antracit') },
    { code: 'AMF-328', names: multilingual('Espresso', 'Espresso', 'Espresso', 'Espresso') },
    { code: 'AMF-338', names: multilingual('Schiefergrau', 'Gris ardoise', 'Slate Gray', 'Gri ardëz') },
    { code: 'AMF-340', names: multilingual('Dunkelbraun', 'Brun foncé', 'Dark Brown', 'Kafe e errët') },
  ];

  for (const p of products) {
    const { imageUrl, ...productData } = p;
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: productData,
      create: productData,
    });

    const existingImage = await prisma.productImage.findFirst({
      where: { productId: product.id, isPrimary: true },
    });

    if (!existingImage) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: imageUrl,
          isPrimary: true,
          sortOrder: 0,
          altJson: p.nameJson,
        },
      });
    }

    if (p.slug === 'amf-premium-panel') {
      for (const variant of amfColorVariants) {
        await prisma.productVariant.upsert({
          where: { sku: `SWP-${variant.code}` },
          update: {
            nameJson: variant.names,
            priceChf: p.priceChf,
            stockQuantity: 40,
            attributes: { color: variant.code, series: 'amf' },
            isActive: true,
          },
          create: {
            productId: product.id,
            sku: `SWP-${variant.code}`,
            nameJson: variant.names,
            priceChf: p.priceChf,
            stockQuantity: 40,
            attributes: { color: variant.code, series: 'amf' },
            isActive: true,
          },
        });
      }
    }
  }

  const amfCatalogRecord = await prisma.colorCatalog.upsert({
    where: { slug: 'amf' },
    update: {},
    create: {
      slug: 'amf',
      nameJson: multilingual('AMF Serie', 'Série AMF', 'AMF Series', 'Seria AMF'),
      descJson: multilingual(
        'Premium Oberflächen und Farbtöne der AMF Kollektion für Wandpaneele.',
        'Finitions et teintes premium de la collection AMF pour panneaux muraux.',
        'Premium AMF collection finishes and tones for wall panels.',
        'Përfundime dhe nuanca premium të koleksionit AMF për panele muri.'
      ),
      sortOrder: 0,
    },
  });

  const amfSwatchSeed = [
    {
      code: 'AMF-326',
      names: multilingual('Anthrazit', 'Anthracite', 'Anthracite', 'Antracit'),
      imageUrl: '/catalogs/amf/AMF-326.jpg',
      thumbnailUrl: '/catalogs/amf/AMF-326-thumb.jpg',
    },
    {
      code: 'AMF-328',
      names: multilingual('Espresso', 'Espresso', 'Espresso', 'Espresso'),
      imageUrl: '/catalogs/amf/AMF-328.jpg',
      thumbnailUrl: '/catalogs/amf/AMF-328-thumb.jpg',
    },
    {
      code: 'AMF-338',
      names: multilingual('Schiefergrau', 'Gris ardoise', 'Slate Gray', 'Gri ardëz'),
      imageUrl: '/catalogs/amf/AMF-338.jpg',
      thumbnailUrl: '/catalogs/amf/AMF-338-thumb.jpg',
    },
    {
      code: 'AMF-340',
      names: multilingual('Dunkelbraun', 'Brun foncé', 'Dark Brown', 'Kafe e errët'),
      imageUrl: '/catalogs/amf/AMF-340.jpg',
      thumbnailUrl: '/catalogs/amf/AMF-340-thumb.jpg',
    },
  ];

  for (let i = 0; i < amfSwatchSeed.length; i++) {
    const swatch = amfSwatchSeed[i];
    const existing = await prisma.colorSwatch.findFirst({
      where: { catalogId: amfCatalogRecord.id, code: swatch.code },
    });
    if (!existing) {
      await prisma.colorSwatch.create({
        data: {
          catalogId: amfCatalogRecord.id,
          code: swatch.code,
          nameJson: swatch.names,
          imageUrl: swatch.imageUrl,
          thumbnailUrl: swatch.thumbnailUrl,
          sortOrder: i,
        },
      });
    }
  }

  console.log('Seed complete.');
  if (seedDemoUsers && process.env.NODE_ENV !== 'production') {
    console.log('Demo admin: admin@swisswallpanels.ch (password from ADMIN_SEED_PASSWORD or default)');
    console.log('Demo user: user@swisswallpanels.ch (password from E2E_USER_PASSWORD or default)');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
