import { Prisma } from './prisma';

describe('Prisma', () => {
  it('should be defined', () => {
    expect(new Prisma()).toBeDefined();
  });
});
