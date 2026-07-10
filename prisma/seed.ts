import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL as string),
});

const products = [
  {
    name: 'Camisa de Lino Blanca',
    description:
      'Camisa de lino puro, fresca y transpirable, con corte regular y botones de nácar.',
    priceInCents: 12990000,
    imageUrl: 'https://picsum.photos/seed/linen-shirt/600/800',
    stock: 15,
    currency: 'COP',
  },
  {
    name: 'Camiseta Básica de Algodón',
    description:
      'Camiseta de algodón peinado 100%, cuello redondo y caída suave para el día a día.',
    priceInCents: 5990000,
    imageUrl: 'https://picsum.photos/seed/cotton-tee/600/800',
    stock: 40,
    currency: 'COP',
  },
  {
    name: 'Jean Slim Fit Índigo',
    description:
      'Pantalón denim slim fit en tono índigo profundo, con elastano para mayor comodidad.',
    priceInCents: 18990000,
    imageUrl: 'https://picsum.photos/seed/indigo-jean/600/800',
    stock: 25,
    currency: 'COP',
  },
  {
    name: 'Vestido Midi Floral',
    description:
      'Vestido midi de viscosa con estampado floral, mangas abullonadas y cintura entallada.',
    priceInCents: 21990000,
    imageUrl: 'https://picsum.photos/seed/floral-dress/600/800',
    stock: 12,
    currency: 'COP',
  },
  {
    name: 'Chaqueta de Cuero Sintético',
    description:
      'Chaqueta biker de cuero sintético premium con cierres metálicos y forro interior.',
    priceInCents: 34990000,
    imageUrl: 'https://picsum.photos/seed/leather-jacket/600/800',
    stock: 8,
    currency: 'COP',
  },
  {
    name: 'Blazer Entallado Negro',
    description:
      'Blazer negro de corte entallado, ideal para looks formales o de oficina.',
    priceInCents: 28990000,
    imageUrl: 'https://picsum.photos/seed/black-blazer/600/800',
    stock: 10,
    currency: 'COP',
  },
  {
    name: 'Falda Plisada Beige',
    description:
      'Falda midi plisada en tono beige, tejido fluido con caída elegante.',
    priceInCents: 14990000,
    imageUrl: 'https://picsum.photos/seed/pleated-skirt/600/800',
    stock: 18,
    currency: 'COP',
  },
  {
    name: 'Suéter de Punto Oversize',
    description:
      'Suéter oversize de punto grueso, cálido y suave, con cuello alto.',
    priceInCents: 17990000,
    imageUrl: 'https://picsum.photos/seed/knit-sweater/600/800',
    stock: 20,
    currency: 'COP',
  },
  {
    name: 'Bufanda de Lana',
    description:
      'Bufanda tejida en mezcla de lana, suave al tacto y con flecos en los extremos.',
    priceInCents: 7990000,
    imageUrl: 'https://picsum.photos/seed/wool-scarf/600/800',
    stock: 30,
    currency: 'COP',
  },
  {
    name: 'Gorra Clásica de Algodón',
    description:
      'Gorra de algodón con visera curva y cierre ajustable en la parte trasera.',
    priceInCents: 6990000,
    imageUrl: 'https://picsum.photos/seed/classic-cap/600/800',
    stock: 35,
    currency: 'COP',
  },
];

async function main(): Promise<void> {
  await prisma.product.deleteMany();
  await prisma.product.createMany({ data: products });
  console.log(`Seeded ${products.length} products.`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
