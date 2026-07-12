

const ORDER_STATUS_ENUM = ['PENDING', 'APPROVED', 'DECLINED'] as const;

const APP_ERROR_CODES = [
  'VALIDATION_ERROR',
  'PRODUCT_NOT_FOUND',
  'OUT_OF_STOCK',
  'ORDER_NOT_FOUND',
  'CUSTOMER_NOT_FOUND',
  'DELIVERY_NOT_FOUND',
  'PAYMENT_PROVIDER_ERROR',
  'PERSISTENCE_ERROR',
  'POLLING_ERROR',
] as const;

/** Sobre de error producido por `http-error.mapper`. */
export const APP_ERROR_SCHEMA = {
  type: 'object',
  example: {
    errorCode: 'OUT_OF_STOCK',
    message: 'Product cedb6f47-d731-4ff9-8aa7-347948e123d8 does not have enough stock for quantity 3.',
  },
  required: ['errorCode', 'message'],
  properties: {
    errorCode: {
      type: 'string',
      enum: [...APP_ERROR_CODES],
      example: 'VALIDATION_ERROR',
    },
    message: {
      type: 'string',
      example: 'CARD payment requires paymentMethodData.cardToken.',
    },
    details: {
      description:
        'Contexto extra de la validación; solo presente en <span style="color:#E5484D;font-weight:bold">VALIDATION_ERROR</span>.',
      nullable: true,
    },
  },
};

/** Variante de APP_ERROR_SCHEMA con un ejemplo coherente por código. */
export const appErrorSchema = (
  errorCode: (typeof APP_ERROR_CODES)[number],
  message: string,
) => ({
  ...APP_ERROR_SCHEMA,
  example: { errorCode, message },
});

/** Espejo de `ProductResponseDto`. */
export const PRODUCT_RESPONSE_SCHEMA = {
  type: 'object',
  example: {
    id: 'cedb6f47-d731-4ff9-8aa7-347948e123d8',
    name: 'Conjunto Offline Noir',
    description: 'Camiseta oversize negra con print minimal y jean carpenter gris.',
    priceInCents: 12990000,
    imageUrl: 'http://localhost:3000/static/products/1.jpg',
    stock: 15,
    currency: 'COP',
    taxRatePercent: 18,
    createdAt: '2026-07-10T04:22:07.642Z',
  },
  required: [
    'id',
    'name',
    'description',
    'priceInCents',
    'imageUrl',
    'stock',
    'currency',
    'taxRatePercent',
    'createdAt',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Conjunto Offline Noir' },
    description: {
      type: 'string',
      example: 'Camiseta oversize negra con print minimal y jean carpenter gris.',
    },
    priceInCents: {
      type: 'integer',
      example: 12990000,
      description:
        'Precio <span style="font-weight:bold">base</span> en centavos, sin IVA (12990000 = $ 129.900).',
    },
    imageUrl: {
      type: 'string',
      example: 'http://localhost:3000/static/products/1.jpg',
      description: 'Foto servida por esta misma API bajo /static.',
    },
    stock: {
      type: 'integer',
      example: 15,
      description: 'Unidades disponibles; con 0 la app marca el producto agotado.',
    },
    currency: { type: 'string', example: 'COP' },
    taxRatePercent: {
      type: 'integer',
      example: 18,
      description:
        'Tasa de <span style="color:#4F6BD8;font-weight:bold">IVA</span> (entera, %) que se suma sobre priceInCents al pagar.',
    },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

export const PRODUCTS_RESPONSE_SCHEMA = {
  type: 'array',
  items: PRODUCT_RESPONSE_SCHEMA,
};

const SHIPPING_DATA_SCHEMA = {
  type: 'object',
  required: ['fullName', 'email', 'address1', 'city', 'state', 'zip'],
  properties: {
    fullName: { type: 'string', example: 'Ada Lovelace' },
    email: { type: 'string', format: 'email', example: 'buyer@example.com' },
    phone: { type: 'string', nullable: true, example: '+573001112233' },
    address1: { type: 'string', example: 'Calle 123 #45-67' },
    address2: { type: 'string', nullable: true },
    city: { type: 'string', example: 'Bogotá' },
    state: { type: 'string', example: 'Cundinamarca' },
    zip: { type: 'string', example: '110111' },
    country: { type: 'string', nullable: true, example: 'CO' },
  },
};

/** Espejo de `CreateOrderRequestDto`. */
export const CREATE_ORDER_REQUEST_SCHEMA = {
  type: 'object',
  required: ['productId', 'customerEmail', 'shippingData'],
  properties: {
    productId: { type: 'string', format: 'uuid' },
    quantity: {
      type: 'integer',
      minimum: 1,
      default: 1,
      example: 1,
      description: 'Unidades del producto (una orden cubre un solo producto).',
    },
    customerEmail: { type: 'string', format: 'email', example: 'buyer@example.com' },
    paymentMethodData: {
      type: 'object',
      description:
        'Tarjeta <span style="color:#4F6BD8;font-weight:bold">tokenizada</span> en el cliente contra el proveedor — el número de tarjeta jamás viaja a esta API.',
      properties: {
        cardToken: { type: 'string', example: 'tok_test_xxxxxxxxxxxx' },
      },
    },
    shippingData: SHIPPING_DATA_SCHEMA,
  },
};

/** Espejo de `OrderCreatedResponseDto`. */
export const ORDER_CREATED_RESPONSE_SCHEMA = {
  type: 'object',
  example: {
    orderId: '5b3f2c1a-9d84-4a1e-b7c6-0f2d9a8e6c41',
    checkoutUrl: null,
    status: 'PENDING',
  },
  required: ['orderId', 'checkoutUrl', 'status'],
  properties: {
    orderId: {
      type: 'string',
      format: 'uuid',
      description: 'Id para consultar el estado con GET /orders/:id.',
    },
    checkoutUrl: {
      type: 'string',
      nullable: true,
      example: null,
      description: 'Solo para métodos redirect; con tarjeta tokenizada es null.',
    },
    status: {
      type: 'string',
      enum: [...ORDER_STATUS_ENUM],
      example: 'PENDING',
      description:
        'Estado inicial; el terminal lo resuelve el <span style="color:#4F6BD8;font-weight:bold">polling</span>.',
    },
  },
};

/** Espejo de `OrderResponseDto`. */
export const ORDER_RESPONSE_SCHEMA = {
  type: 'object',
  example: {
    id: '5b3f2c1a-9d84-4a1e-b7c6-0f2d9a8e6c41',
    productId: 'cedb6f47-d731-4ff9-8aa7-347948e123d8',
    quantity: 1,
    baseFeeInCents: 0,
    deliveryFeeInCents: 0,
    taxRatePercent: 18,
    taxInCents: 2338200,
    amountInCents: 15328200,
    currency: 'COP',
    status: 'APPROVED',
    customerEmail: 'cliente@correo.com',
    providerTransactionId: '1220000-1752300000-12345',
    shippingData: {
      fullName: 'Ana Pérez',
      email: 'ana.perez@correo.com',
      phone: '3001234567',
      address1: 'Calle 12 # 34-56',
      address2: 'Apto 501',
      city: 'Bogotá',
      state: 'Cundinamarca',
      zip: '110111',
      country: 'CO',
    },
    createdAt: '2026-07-12T16:19:40.784Z',
  },
  required: [
    'id',
    'productId',
    'quantity',
    'baseFeeInCents',
    'deliveryFeeInCents',
    'taxRatePercent',
    'taxInCents',
    'amountInCents',
    'currency',
    'status',
    'customerEmail',
    'providerTransactionId',
    'shippingData',
    'createdAt',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    productId: { type: 'string', format: 'uuid' },
    quantity: { type: 'integer', example: 1 },
    baseFeeInCents: {
      type: 'integer',
      example: 0,
      description: 'Tarifa fija en centavos (configurable por entorno).',
    },
    deliveryFeeInCents: {
      type: 'integer',
      example: 0,
      description: 'Tarifa de envío en centavos (configurable por entorno).',
    },
    taxRatePercent: {
      type: 'integer',
      example: 18,
      description:
        'Tasa de <span style="color:#4F6BD8;font-weight:bold">IVA</span> congelada al crear la orden — inmune a cambios futuros.',
    },
    taxInCents: {
      type: 'integer',
      example: 2338200,
      description:
        '<span style="color:#4F6BD8;font-weight:bold">IVA</span> sumado sobre la base: amountInCents = base + taxInCents.',
    },
    amountInCents: {
      type: 'integer',
      example: 15328200,
      description:
        'Total <span style="font-weight:bold">cobrado</span> al proveedor (base + IVA), en centavos.',
    },
    currency: { type: 'string', example: 'COP' },
    status: {
      type: 'string',
      enum: [...ORDER_STATUS_ENUM],
      example: 'PENDING',
      description:
        '<span style="color:#F6C445;font-weight:bold">PENDING</span> mientras el polling corre; termina en <span style="color:#2E9E6B;font-weight:bold">APPROVED</span> o <span style="color:#E5484D;font-weight:bold">DECLINED</span>.',
    },
    customerEmail: { type: 'string', format: 'email', nullable: true },
    providerTransactionId: {
      type: 'string',
      nullable: true,
      example: null,
      description: 'Id de la transacción en el proveedor de pagos.',
    },
    shippingData: { ...SHIPPING_DATA_SCHEMA, nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

/** Espejo de la respuesta del health controller. */
export const HEALTH_RESPONSE_SCHEMA = {
  type: 'object',
  required: ['status'],
  properties: {
    status: { type: 'string', example: 'ok' },
  },
};
