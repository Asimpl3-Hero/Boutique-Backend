# Boutique — Backend

API de **checkout y pagos** para la boutique de ropa **Boutique**, construida con **NestJS + TypeScript** siguiendo **arquitectura hexagonal** (ports & adapters), manejo de errores con **Result** (railway-oriented programming), **Prisma 7** sobre **PostgreSQL**, y una integración con una **pasarela de pago** en modo *sandbox* resuelta por **polling**.

![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![Jest](https://img.shields.io/badge/Tests-Jest-C21325?logo=jest&logoColor=white)

## Arquitectura

Hexagonal *layer-first*: las capas viven en la raíz de `src/` y un único `app.module.ts` cablea los puertos.

```text
src/
├── domain/            # entidades (interfaces), value objects (Money), puertos (outbound), servicios de dominio
├── application/       # casos de uso, DTOs (class-validator), servicios de aplicación
├── infrastructure/    # adapters (inbound/http, outbound/persistence, outbound/payments) + config
└── shared/            # Result (railway) + AppError
```

Reglas clave:

- El **dominio** no importa framework (`@nestjs/*` / `@prisma/client`).
- Manejo de errores con **`Result<T, AppError>`** (sin `throw` en el núcleo); la traducción a HTTP se hace en el borde (`http-error.mapper`).
- Acceso a datos por **puerto**; Prisma solo en `adapters/outbound/persistence`.
- La pasarela de pago se resuelve por **polling** (no webhooks).

## Modelo de datos

`Product`, `Customer`, `Order`, `Transaction`, `Delivery` + enum `OrderStatus` (`PENDING`/`APPROVED`/`DECLINED`). Schema en [`prisma/schema.prisma`](prisma/schema.prisma); seed de 10 prendas en [`prisma/seed.ts`](prisma/seed.ts).

## Flujo de pago

`POST /orders` → crea la orden e inicia el pago:

1. **Fase 1 (PENDING):** valida cantidad/stock, calcula `Money` (precio×cantidad + fees), hace *upsert* del cliente y persiste **orden + transacción + delivery** en `PENDING`.
2. **Fase 2 (pasarela):** obtiene el *acceptance token*, firma la integridad (SHA-256), crea la transacción en la pasarela y **enlaza** su id.
3. **Polling en segundo plano:** sondea el estado cada 5s (backoff + timeout 60s). Al **APPROVED**, aprueba la orden y **descuenta stock atómicamente**; al **DECLINED**, marca la orden. Rehidrata órdenes `PENDING` al arrancar.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Liveness probe |
| `GET` | `/products` | Catálogo |
| `GET` | `/products/:id` | Detalle de producto |
| `POST` | `/orders` | Crear orden + iniciar pago |
| `GET` | `/orders/:id` | Estado de la orden |

**Swagger UI:** `http://localhost:3000/docs` · **OpenAPI JSON:** `/docs-json`.

## Requisitos

- Node.js 20+ · pnpm 11+ · Docker (para PostgreSQL)

## Variables de entorno

Copia la plantilla y complétala con las llaves de **sandbox** (nunca dinero real):

```bash
cp .env.example .env
```

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL |
| `PORT` | Puerto HTTP (default 3000) |
| `PAYMENTS_BASE_URL` | URL sandbox de la pasarela |
| `PAYMENTS_PUBLIC_KEY` / `PAYMENTS_PRIVATE_KEY` | API keys (sandbox) |
| `PAYMENTS_INTEGRITY_SECRET` | Secreto para la firma de integridad |
| `PAYMENTS_ACCEPTANCE_TOKEN` | Opcional (si no, se obtiene del endpoint de merchants) |
| `BASE_FEE_IN_CENTS` / `DELIVERY_FEE_IN_CENTS` | Tarifas |
| `CORS_ORIGINS`, `RATE_LIMIT_*`, `SWAGGER_*` | Hardening y docs |

> El `.env` está en `.gitignore` — los secretos nunca se commitean.

## Puesta en marcha (local)

```bash
pnpm install
cp .env.example .env             # completar credenciales sandbox
docker compose up -d db          # PostgreSQL local
pnpm prisma migrate deploy       # aplicar migraciones
pnpm db:seed                     # sembrar el catálogo
pnpm start:dev                   # API en watch (http://localhost:3000)
```

## Puesta en marcha (Docker, todo incluido)

```bash
cp .env.example .env             # completar credenciales sandbox
docker compose up --build -d     # db + api (migraciones al arrancar)
docker compose --profile seed run --rm seed   # sembrar el catálogo (una vez)

curl http://localhost:3000/health
```

## Tests

```bash
pnpm test        # unitarios + integración
pnpm test:e2e    # end-to-end (requiere Postgres)
pnpm test:cov    # cobertura (umbral 80% en las 4 métricas)
```

### Cobertura (`pnpm test:cov`)

| Métrica | % |
|---|---|
| Statements | **94.9%** |
| Branches | **82.79%** |
| Functions | **94.44%** |
| Lines | **94.71%** |

148 tests · 26 suites (unit + integración) · umbral mínimo forzado: **80%**.

## Scripts

```bash
pnpm start:dev      # desarrollo (watch)
pnpm build          # compila a dist/
pnpm start:prod     # node dist/src/main.js
pnpm prisma migrate dev --name <slug>   # nueva migración (dev)
pnpm db:seed        # sembrar datos
pnpm lint           # eslint --fix
```
