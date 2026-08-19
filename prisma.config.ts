import { defineConfig } from 'prisma/config';
import path from 'path';

export default defineConfig({
  migrations: {
    seed: 'ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts',
  },
  datasource: {
    url: `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`,
  },
});
