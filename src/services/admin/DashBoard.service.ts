import { prisma } from "config/client";

const DashBoardData = async () => {
    const users = await prisma.user.count();
    const products = await prisma.product.count();
    const orders = await prisma.order.count();
    const factory = await prisma.factory.count();
    const target = await prisma.target.count();
    const reviews = await prisma.review.count();
    return { users, products, orders, factory, target, reviews };
};

export { DashBoardData };