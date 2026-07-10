# Boutique — Backend

API de checkout y pagos de **Boutique**, construida con **NestJS + TypeScript** siguiendo **arquitectura hexagonal** (ports & adapters), manejo de errores con **Result** (railway), **Prisma 7** sobre **PostgreSQL** y una integración de **pasarela de pago** en modo sandbox resuelta por **polling**.

> 🚧 Documentación en construcción — este README se completa en la fase de entrega (instrucciones de ejecución, variables de entorno, endpoints, Swagger y tabla de cobertura de tests).

## Arquitectura

```text
src/
├── domain/            # entidades, value objects, puertos (outbound), servicios de dominio
├── application/       # casos de uso, DTOs, servicios de aplicación
├── infrastructure/    # adapters (inbound HTTP, outbound persistence/payments), config
└── shared/            # Result (railway), errores (AppError)
```

Detalle de convenciones en [`Claude.md`](./Claude.md).

## Requisitos

- Node.js 20+
- pnpm 11+
- Docker (para PostgreSQL local vía `docker-compose.yml`)

## Puesta en marcha (local)

```bash
pnpm install
cp .env.example .env            # completar credenciales de sandbox
docker compose up -d db         # PostgreSQL local
pnpm prisma migrate dev         # aplicar migraciones
pnpm start:dev                  # API en modo watch
```

## Tests

```bash
pnpm test        # unitarios
pnpm test:e2e    # end-to-end
pnpm test:cov    # cobertura
```
