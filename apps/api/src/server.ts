import { createApp } from './app';
import { env } from './env';
import { prisma } from './prisma';
import { ensureSeeded } from './seed';

async function main() {
  // Auto-seed demo data on first boot so the environment is immediately usable.
  try {
    await ensureSeeded();
  } catch (err) {
    console.error('Seed check failed (continuing):', err);
  }

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`AetherWMS API listening on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  prisma.$disconnect().finally(() => process.exit(1));
});
