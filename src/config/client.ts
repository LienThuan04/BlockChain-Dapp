import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const GlobalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = GlobalForPrisma.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? [] : ['query', 'info', 'warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') GlobalForPrisma.prisma = prisma;