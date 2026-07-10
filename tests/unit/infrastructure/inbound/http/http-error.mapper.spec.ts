import { HttpException, HttpStatus } from '@nestjs/common';
import { toHttpException } from '../../../../../src/infrastructure/adapters/inbound/http/http-error.mapper';
import { AppErrorCode } from '../../../../../src/shared/errors';

describe('toHttpException', () => {
  const cases: Array<[AppErrorCode, HttpStatus]> = [
    ['VALIDATION_ERROR', HttpStatus.BAD_REQUEST],
    ['PRODUCT_NOT_FOUND', HttpStatus.NOT_FOUND],
    ['OUT_OF_STOCK', HttpStatus.CONFLICT],
    ['ORDER_NOT_FOUND', HttpStatus.NOT_FOUND],
    ['CUSTOMER_NOT_FOUND', HttpStatus.NOT_FOUND],
    ['DELIVERY_NOT_FOUND', HttpStatus.NOT_FOUND],
    ['PAYMENT_PROVIDER_ERROR', HttpStatus.BAD_GATEWAY],
    ['PERSISTENCE_ERROR', HttpStatus.INTERNAL_SERVER_ERROR],
    ['POLLING_ERROR', HttpStatus.INTERNAL_SERVER_ERROR],
  ];

  it.each(cases)('maps %s to HTTP %d', (code, status) => {
    const exception = toHttpException({ code, message: 'x' });

    expect(exception).toBeInstanceOf(HttpException);
    expect(exception.getStatus()).toBe(status);
    expect(exception.getResponse()).toMatchObject({ errorCode: code });
  });

  it('includes details only for VALIDATION_ERROR', () => {
    const withDetails = toHttpException({
      code: 'VALIDATION_ERROR',
      message: 'bad',
      details: { field: 'email' },
    });
    expect(withDetails.getResponse()).toMatchObject({
      details: { field: 'email' },
    });

    const withoutDetails = toHttpException({
      code: 'PERSISTENCE_ERROR',
      message: 'boom',
      details: { hidden: true },
    });
    expect(withoutDetails.getResponse()).not.toHaveProperty('details');
  });
});
