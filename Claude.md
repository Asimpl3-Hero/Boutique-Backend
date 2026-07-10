# Boutique-Backend — Guía del repo

API / servicios de Boutique. **NestJS (TypeScript)** con **Arquitectura Hexagonal (Ports & Adapters) layer-first**, ORM **Prisma**, tests con **Jest**, package manager **pnpm**.

> Las tasks se rigen por `agents/tasks/rules/rules.md` (en el repo raíz `Boutique`). Este archivo define la **arquitectura y estructura de carpetas** concretas de este repo, a las que esas reglas hacen referencia. La referencia de estilo es el repo `Comfort-Api`.

---

## Arquitectura — Hexagonal layer-first

Las capas hexagonales viven **en la raíz de `src/`** (no una por feature). Es **un solo hexágono** para toda la app, cableado desde un único `app.module.ts`.

Regla de oro: **las dependencias apuntan siempre hacia adentro (al dominio).** El dominio no conoce NestJS, HTTP ni Prisma.

- **`domain/`** — núcleo. **Cero imports de framework** (nada de `@nestjs/*` ni `@prisma/client`).
  - `entities/` → tipos/interfaces del dominio (los `Order`, `Product`… son **interfaces planas**, no clases) + `index.ts`.
  - `value-objects/` → **clases** con constructor privado y `static create(): Result<VO, AppError>` que valida (ej. `Money`) + `index.ts`.
  - `ports/` → **interfaces (puertos)** + su **token `Symbol`** co-localizado (ej. `export const ORDER_REPOSITORY_PORT = Symbol('ORDER_REPOSITORY_PORT')`), separados en:
    - `outbound/` → puertos de salida (**driven**): repos, gateways, polling. Lo que el dominio necesita del exterior.
    - `inbound/` → puertos de entrada (**driving**): interfaces de casos de uso (opcional; si no se usa, la capa `application/` es el punto de entrada).
    - cada subcarpeta con su `index.ts`.
  - `services/` → servicios de dominio puros (lógica que no es de una sola entidad) + `index.ts`.
- **`application/`** — orquestación. Depende **solo de `domain/`**, consume puertos por su token.
  - `use-cases/` → **un caso de uso por archivo** (`*.use-case.ts`, `@Injectable`).
  - `services/` → servicios/resolvers de aplicación (`*.resolver.ts`, `*.service.ts`).
  - `dto/` → DTOs de request/response (`*.dto.ts`, validados con `class-validator`).
- **`infrastructure/`** — adaptadores + config. Los adaptadores viven bajo `adapters/`, separados por dirección:
  - `adapters/inbound/` → adaptadores de entrada (**driving**): lo que maneja la app.
    - `http/` → controllers REST (`*.controller.ts`), `http-error.mapper.ts`, y `docs/` (schemas de Swagger).
  - `adapters/outbound/` → adaptadores de salida (**driven**): lo que la app maneja. Cada uno implementa un puerto de `ports/outbound/`.
    - `persistence/` → `prisma.service.ts` + adaptadores de repo (`prisma-<x>.repository.adapter.ts`).
    - `<integración>/` → cada integración de tercero en su carpeta (ej. `payments/`: adapter + http client + mappers + services).
  - `config/` → `app-config.service.ts` (lectura tipada de env), fuera de `adapters/`.
- **`shared/`** — kernel transversal.
  - `errors/` → `AppError` (`{ code: AppErrorCode; message; details? }`) + `index.ts`.
  - `railway/` → `Result<T, E>` (mónada `Ok`/`Err`) + helpers `ok`/`err` + `index.ts`.

## Estructura de carpetas

```
src/
  application/
    dto/                          # *.dto.ts (class-validator)
    services/                     # *.resolver.ts, *.service.ts (aplicación)
    use-cases/                    # *.use-case.ts (1 por archivo)
  domain/
    entities/                     # *.entity.ts (interfaces) + index.ts
    ports/
      outbound/                   # *.port.ts (repos, gateways) + index.ts
      inbound/                    # *.port.ts (casos de uso) + index.ts (opcional)
    services/                     # *.service.ts (dominio) + index.ts
    value-objects/                # *.vo.ts (clases con static create) + index.ts
  infrastructure/
    adapters/
      inbound/
        http/                     # *.controller.ts + http-error.mapper.ts + docs/
      outbound/
        persistence/              # prisma.service.ts + prisma-*.repository.adapter.ts
        <integración>/            # p.ej. payments/ (adapter, http client, mappers)
    config/                       # app-config.service.ts
  shared/
    errors/                       # app-error.ts + index.ts
    railway/                      # result.ts + index.ts
  app.module.ts                   # ÚNICO módulo raíz: bindea PORT tokens → adapters
  main.ts
prisma/
  schema.prisma                   # modelos + datasource
  migrations/                     # migraciones versionadas (Prisma Migrate)
  seed.ts                         # datos semilla (opcional)
tests/
  unit/{domain,application,infrastructure,shared}/   # espejo de src/ (infrastructure/ refleja adapters/{inbound,outbound})
  integration/<feature>/          # *.integration.spec.ts
  e2e/                            # *.e2e-spec.ts + jest-e2e.json
  helpers/{mocks,factories}/      # ports.mock.ts, *.factory.ts
```

## Convenciones (obligatorias)

- **Manejo de errores = Railway (Result<T, E>), NO excepciones.** Puertos, casos de uso, adaptadores y VOs devuelven `Promise<Result<T, AppError>>` (o `Result<...>`). No se hace `throw` en `domain/`/`application/`. El error es un `AppError` con `code` tipado.
- **La traducción a HTTP se hace en el borde**: `infrastructure/adapters/inbound/http/http-error.mapper.ts` mapea `AppError.code` → `HttpStatus` (`toHttpException`). Los controllers hacen `result.match(ok → response, err → throw toHttpException(err))`.
- **Puertos con token `Symbol`**: la interfaz y su `Symbol` viven en el mismo `*.port.ts` (en `ports/outbound/` o `ports/inbound/`), re-exportados por el `index.ts` de su subcarpeta. La inyección se cablea en `app.module.ts` con `{ provide: XXX_PORT, useClass: XxxAdapter }` y se consume con `@Inject(XXX_PORT)`. **Cada adaptador `outbound` implementa exactamente un puerto `outbound`.**
- **Naming por sufijo**: `*.use-case.ts`, `*.port.ts`, `*.entity.ts`, `*.vo.ts`, `*.dto.ts`, `*.controller.ts`, `*.repository.adapter.ts`, `*.mapper.ts`, `*.service.ts`, `*.resolver.ts`, `*.client.ts`.
- **Barrels `index.ts`** en las subcarpetas de `domain/` y en `shared/*`. Se importa el barrel (`../../domain/ports`), no el archivo suelto.
- **Imports relativos** (`../../domain/...`). Este repo **no usa path aliases** (a diferencia de Mobile).
- **Entidades = interfaces planas** (sin lógica ni decoradores); la validación/invariantes van en **value-objects** (`static create()` → `Result`).
- **Adaptadores de persistencia mapean Prisma ⇄ dominio** (la fila de Prisma no es la entidad de dominio) y envuelven errores de BD en `AppError` (`PERSISTENCE_ERROR`).
- **Swagger**: los schemas viven en `infrastructure/adapters/inbound/http/docs/` y se referencian desde los controllers.
- **Nombre de bloque backend**: `## Bloque N — Backend/<Capa>: <acción>` con `<Capa>` ∈ {Domain, Application, Inbound-HTTP, Outbound-Persistence, Outbound-Integration, Config, Shared, Prisma, Module, **Testing**, **Delivery**}.
  - **`Testing`** y **`Delivery`** son capas **transversales** (no mapean a una carpeta hexagonal): `Testing` = tests de integración/e2e y gate de cobertura; `Delivery` = empaquetado (Dockerfile, entrypoint) y docs (README). Los **unit tests por capa** se escriben dentro del bloque de su feature (cada bloque cierra con `pnpm test`), no en un bloque `Testing` aparte.
  - **Capas combinadas permitidas** cuando un único commit *shippable* toca dos capas de forma natural: se escriben con `+` (ej. `Backend/Inbound-HTTP + Module`: exponer el controller y cablear su puerto en `app.module.ts` van en el mismo commit, porque un controller sin su provider rompe el arranque). No abusar: solo cuando separarlas dejaría un commit que no arranca/valida.

## Tests

- Viven en `tests/` (no co-localizados), **espejando las capas** de `src/` bajo `tests/unit/`, más `tests/integration/<feature>/` y `tests/e2e/`.
- Mocks de puertos en `tests/helpers/mocks/ports.mock.ts`; factories de datos en `tests/helpers/factories/`.
- Cada bloque cierra con la verificación que corresponda (`pnpm test`, typecheck, "la API arranca").

## Migraciones (Prisma Migrate) — SÍ se hacen, controladas

- Cambio de esquema = editar `prisma/schema.prisma` **y** generar la migración con `pnpm prisma migrate dev --name <slug>`. Nunca se toca la BD a mano.
- **El archivo de migración generado (`prisma/migrations/**`) se versiona y se commitea** junto con el cambio de schema.
- Va en un bloque `Backend/Prisma` (o dentro de `Outbound-Persistence` si es el mismo commit lógico). Se cierra con `prisma migrate` aplicada y `prisma generate` sin errores.
- Nombre de migración descriptivo y en inglés (ej. `add_orders_table`). Preferir migraciones **aditivas**; un cambio destructivo se documenta como riesgo en las Notas de la task.
- En entornos desplegados se usa `prisma migrate deploy` (no `dev`); quién/cuándo corre el deploy lo decide el usuario.

## Comandos

```bash
pnpm install
pnpm start:dev                      # API en watch
pnpm build                          # compila a dist/
pnpm test                           # Jest
pnpm prisma migrate dev --name <x>  # nueva migración (dev)
pnpm prisma generate                # regenerar cliente
pnpm prisma db seed                 # sembrar datos (si hay seed.ts)
```

## Notas de entorno

- **pnpm v11**: los build scripts de dependencias nativas se aprueban en `pnpm-workspace.yaml` bajo `allowBuilds` (no en `.npmrc`). `unrs-resolver` (resolver de ESLint) está aprobado ahí; sin eso, `pnpm install` sale con código 1 por *ignored build scripts*.
- El **CLI de Nest** se usa vía npm global (`@nestjs/cli`), no vía pnpm global: el global de pnpm no resuelve `@nestjs/schematics` en `nest new`.
