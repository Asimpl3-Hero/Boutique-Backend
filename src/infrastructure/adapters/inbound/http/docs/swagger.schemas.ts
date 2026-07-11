

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

/** Error envelope produced by `http-error.mapper`. */
export const APP_ERROR_SCHEMA = {
  type: 'object',
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
      description: 'Extra context, only present for VALIDATION_ERROR.',
      nullable: true,
    },
  },
};

/** Mirror of `ProductResponseDto`. */
export const PRODUCT_RESPONSE_SCHEMA = {
  type: 'object',
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
    name: { type: 'string', example: 'Camisa de Lino Blanca' },
    description: { type: 'string', example: 'Camisa de lino puro, fresca y transpirable.' },
    priceInCents: { type: 'integer', example: 12990000 },
    imageUrl: { type: 'string', example: 'https://picsum.photos/seed/linen-shirt/600/800' },
    stock: { type: 'integer', example: 15 },
    currency: { type: 'string', example: 'COP' },
    taxRatePercent: {
      type: 'integer',
      example: 18,
      description: 'VAT rate already included in priceInCents.',
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

/** Mirror of `CreateOrderRequestDto`. */
export const CREATE_ORDER_REQUEST_SCHEMA = {
  type: 'object',
  required: ['productId', 'customerEmail', 'shippingData'],
  properties: {
    productId: { type: 'string', format: 'uuid' },
    quantity: { type: 'integer', minimum: 1, default: 1, example: 1 },
    customerEmail: { type: 'string', format: 'email', example: 'buyer@example.com' },
    paymentMethodData: {
      type: 'object',
      description: 'Card tokenized on the client (fake but structurally valid).',
      properties: {
        cardToken: { type: 'string', example: 'tok_test_xxxxxxxxxxxx' },
      },
    },
    shippingData: SHIPPING_DATA_SCHEMA,
  },
};

/** Mirror of `OrderCreatedResponseDto`. */
export const ORDER_CREATED_RESPONSE_SCHEMA = {
  type: 'object',
  required: ['orderId', 'checkoutUrl', 'status'],
  properties: {
    orderId: { type: 'string', format: 'uuid' },
    checkoutUrl: { type: 'string', nullable: true, example: null },
    status: { type: 'string', enum: [...ORDER_STATUS_ENUM], example: 'PENDING' },
  },
};

/** Mirror of `OrderResponseDto`. */
export const ORDER_RESPONSE_SCHEMA = {
  type: 'object',
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
    baseFeeInCents: { type: 'integer', example: 0 },
    deliveryFeeInCents: { type: 'integer', example: 0 },
    taxRatePercent: {
      type: 'integer',
      example: 18,
      description: 'VAT rate frozen at order creation.',
    },
    taxInCents: {
      type: 'integer',
      example: 1981525,
      description: 'VAT portion included in amountInCents.',
    },
    amountInCents: { type: 'integer', example: 12990000 },
    currency: { type: 'string', example: 'COP' },
    status: { type: 'string', enum: [...ORDER_STATUS_ENUM], example: 'PENDING' },
    customerEmail: { type: 'string', format: 'email', nullable: true },
    providerTransactionId: { type: 'string', nullable: true, example: null },
    shippingData: { ...SHIPPING_DATA_SCHEMA, nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

/** Mirror of the health controller response. */
export const HEALTH_RESPONSE_SCHEMA = {
  type: 'object',
  required: ['status'],
  properties: {
    status: { type: 'string', example: 'ok' },
  },
};
