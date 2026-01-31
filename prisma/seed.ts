import "dotenv/config";
import { PrismaClient, OAuthProvider, Prisma } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { generateSalt, hashPassword } from "../auth/password";

type TxClient = Prisma.TransactionClient;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function seedUser(
  tx: TxClient,
  {
    email,
    plainPassword,
    firstName,
    lastName,
    displayName,
  }: {
    email: string;
    plainPassword: string;
    firstName: string;
    lastName: string;
    displayName: string;
  }
) {
  const salt = generateSalt();
  const passwordHash = await hashPassword(plainPassword, salt);

  const user = await tx.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      passwordSalt: salt,
      firstName,
      lastName,
      displayName,
    },
    select: { id: true, email: true },
  });

  await tx.userAllowedProvider.upsert({
    where: {
      userId_provider: {
        userId: user.id,
        provider: OAuthProvider.MICROSOFT,
      },
    },
    update: {},
    create: {
      userId: user.id,
      provider: OAuthProvider.MICROSOFT,
    },
  });

  return user;
}

async function main() {
  const microsoftTenantId = process.env.SEED_MICROSOFT_TENANT_ID; // optional

  const result = await prisma.$transaction(async (tx) => {
    const superAdmin = await seedUser(tx, {
      email: "superadmin@belrefugees.be",
      plainPassword: "password123",
      firstName: "Super",
      lastName: "Admin",
      displayName: "Super Admin",
    });

    const kamari = await seedUser(tx, {
      email: "kamari.info@gmail.com",
      plainPassword: "password123",
      firstName: "Kamari",
      lastName: "User",
      displayName: "Kamari",
    });

    // Seed tenant allowlist entry only if provided
    if (microsoftTenantId) {
      await tx.identityProviderTenant.upsert({
        where: {
          provider_tenantId: {
            provider: OAuthProvider.MICROSOFT,
            tenantId: microsoftTenantId,
          },
        },
        update: {
          enabled: true,
          displayName: "Belrefugees",
        },
        create: {
          provider: OAuthProvider.MICROSOFT,
          tenantId: microsoftTenantId,
          displayName: "Belrefugees",
          enabled: true,
        },
      });
    }

    return { superAdmin, kamari, microsoftTenantId };
  });

  console.log("Seeded users:");
  console.log("- superadmin@belrefugees.be / password123");
  console.log("- kamari.info@gmail.com / password123");
  console.log("Allowed OAuth: MICROSOFT");

  if (result.microsoftTenantId) {
    console.log("Enabled Microsoft tenant:", result.microsoftTenantId);
  } else {
    console.log("No SEED_MICROSOFT_TENANT_ID provided; tenant not seeded.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
