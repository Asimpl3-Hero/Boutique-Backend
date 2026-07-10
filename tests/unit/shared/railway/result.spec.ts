import { Result, Ok, Err, ok, err } from '../../../../src/shared/railway';

describe('Result (railway)', () => {
  describe('constructors', () => {
    it('ok() builds an Ok carrying the value', () => {
      const result = ok(42);

      expect(result).toBeInstanceOf(Ok);
      expect(result.isOk()).toBe(true);
      expect(result.isErr()).toBe(false);
      expect((result as Ok<number>).value).toBe(42);
    });

    it('err() builds an Err carrying the error', () => {
      const result = err('boom');

      expect(result).toBeInstanceOf(Err);
      expect(result.isErr()).toBe(true);
      expect(result.isOk()).toBe(false);
      expect((result as Err<string>).error).toBe('boom');
    });
  });

  describe('map', () => {
    it('transforms the value on Ok', () => {
      const result = ok(2).map((n) => n * 3);

      expect((result as Ok<number>).value).toBe(6);
    });

    it('is a no-op on Err', () => {
      const result: Result<number, string> = err('nope');
      const mapped = result.map((n) => n * 3);

      expect(mapped.isErr()).toBe(true);
      expect((mapped as Err<string>).error).toBe('nope');
    });
  });

  describe('flatMap', () => {
    it('chains into another Result on Ok', () => {
      const result = ok(5).flatMap((n) => ok(n + 1));

      expect((result as Ok<number>).value).toBe(6);
    });

    it('short-circuits on Err', () => {
      const result: Result<number, string> = err('stop');
      const chained = result.flatMap((n) => ok(n + 1));

      expect(chained.isErr()).toBe(true);
      expect((chained as Err<string>).error).toBe('stop');
    });
  });

  describe('asyncMap / asyncFlatMap', () => {
    it('asyncMap resolves the mapped value on Ok', async () => {
      const result = await ok(4).asyncMap((n) => Promise.resolve(n * 2));

      expect((result as Ok<number>).value).toBe(8);
    });

    it('asyncFlatMap chains an async Result on Ok', async () => {
      const result = await ok(4).asyncFlatMap((n) => Promise.resolve(ok(n - 1)));

      expect((result as Ok<number>).value).toBe(3);
    });

    it('asyncFlatMap short-circuits on Err', async () => {
      const result: Result<number, string> = err('async-stop');
      const chained = await result.asyncFlatMap((n) =>
        Promise.resolve(ok(n - 1)),
      );

      expect(chained.isErr()).toBe(true);
      expect((chained as Err<string>).error).toBe('async-stop');
    });
  });

  describe('match', () => {
    it('runs onOk for Ok', () => {
      const value = ok(10).match(
        (n) => `ok:${n}`,
        (e) => `err:${e}`,
      );

      expect(value).toBe('ok:10');
    });

    it('runs onErr for Err', () => {
      const value = err('bad').match(
        (n) => `ok:${n}`,
        (e) => `err:${e}`,
      );

      expect(value).toBe('err:bad');
    });
  });
});
