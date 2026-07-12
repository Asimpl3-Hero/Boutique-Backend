import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL as string),
});

/** Photos live in public/products, served by the API under /static. */
const ASSETS_BASE_URL = process.env.ASSETS_BASE_URL ?? 'http://localhost:3000';
const photo = (file: string): string =>
  `${ASSETS_BASE_URL}/static/products/${file}`;

const products = [
  {
    name: 'Conjunto Offline Noir',
    description:
      'Camiseta oversize negra con print minimal en el pecho y jean carpenter gris deslavado. Uniforme de ciudad, cero esfuerzo.',
    priceInCents: 12990000,
    imageUrl: photo('1.jpg'),
    stock: 15,
    currency: 'COP',
  },
  {
    name: 'Conjunto Seoul Court',
    description:
      'Muscle tee verde bosque con tipografía coreana y short beige de corte holgado. Energía de cancha con acabado premium.',
    priceInCents: 5990000,
    imageUrl: photo('2.jpg'),
    stock: 40,
    currency: 'COP',
  },
  {
    name: 'Conjunto Riviera Drift',
    description:
      'Camisa estampada de rosas y palmeras en capas sobre manga larga blanca, con pantalón baggy beige y gorra trucker.',
    priceInCents: 18990000,
    imageUrl: photo('3.jpg'),
    stock: 25,
    currency: 'COP',
  },
  {
    name: 'Conjunto Pure Magic',
    description:
      'Camiseta blanco hueso con gráfica de corazón y rosas en la espalda, más bermuda carpenter crema a juego.',
    priceInCents: 21990000,
    imageUrl: photo('4.jpg'),
    stock: 12,
    currency: 'COP',
  },
  {
    name: 'Conjunto Shadow Line',
    description:
      'Bodysuit negro de manga larga con media cremallera y bermuda denim negra lavada. Silueta afilada, actitud completa.',
    priceInCents: 34990000,
    imageUrl: photo('5.jpg'),
    stock: 8,
    currency: 'COP',
  },
  {
    name: 'Conjunto Crème Studio',
    description:
      'Crop tee blanca oversize con logo tonal y minifalda denim crema de costuras a contraste. Minimalismo de estudio.',
    priceInCents: 28990000,
    imageUrl: photo('6.jpg'),
    stock: 10,
    currency: 'COP',
  },
  {
    name: 'Conjunto Scarlet Club',
    description:
      'Crop tee roja estilo jersey vintage con script bordado y jean baggy claro destroyed. Espíritu de club, corte de calle.',
    priceInCents: 14990000,
    imageUrl: photo('7.jpg'),
    stock: 18,
    currency: 'COP',
  },
  {
    name: 'Conjunto Night Eagle',
    description:
      'Camiseta lavado ácido con águila gótica estampada en la espalda y pantalón cargo verde oliva. Oscuro sin uniformarse.',
    priceInCents: 17990000,
    imageUrl: photo('8.jpg'),
    stock: 20,
    currency: 'COP',
  },
  {
    name: 'Conjunto Static Camo',
    description:
      'Camiseta camo oversize en capas sobre manga larga blanca y jean baggy gris deslavado. Camuflaje para sobresalir.',
    priceInCents: 7990000,
    imageUrl: photo('9.jpg'),
    stock: 30,
    currency: 'COP',
  },
  {
    name: 'Conjunto Royal Progress',
    description:
      'Camiseta azul royal con tipografía gótica en capas sobre hoodie blanco y jean baggy celeste. El azul que se toma la cuadra.',
    priceInCents: 6990000,
    imageUrl: photo('10.jpg'),
    stock: 35,
    currency: 'COP',
  },
];

async function main(): Promise<void> {
  // Orders reference products with Restrict: clear them first (their
  // transactions and deliveries cascade). Demo reset, not a prod script.
  await prisma.order.deleteMany();
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
