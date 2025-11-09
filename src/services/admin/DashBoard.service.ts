import { prisma } from "config/client";

const DashBoardData = async () => {
    const users = await prisma.user.count();
    const products = await prisma.product.count();
    const orders = await prisma.order.count();
    const factory = await prisma.factory.count();
    const target = await prisma.target.count();
    const reviews = await prisma.review.count();
    const cryptocurrencies = await (prisma as any).cryptocurrency.count();
    const wallets = await (prisma as any).cryptoWallet.count();
    const cryptoTransactions = await (prisma as any).cryptoTransaction.count();
    return { users, products, orders, factory, target, reviews, cryptocurrencies, wallets, cryptoTransactions };
};

export { DashBoardData };