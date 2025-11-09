import { prisma } from "config/client";
import { PAGE_SIZE_WITH_ADMIN } from "config/constant";

const GetAllReview = async (Page: number) => {
    const skip = Page * PAGE_SIZE_WITH_ADMIN;
    const reviews = await prisma.review.findMany({
        skip,
        take: PAGE_SIZE_WITH_ADMIN,
        orderBy: {
            createdAt: "desc"
        },
        include: {
            user: true,
            product: true,
        },
    });
    return reviews;
};
const CountTotalReviewPage = async () => {
    const totalReviews = await prisma.review.count();
    return Math.ceil(totalReviews / PAGE_SIZE_WITH_ADMIN);
};

const GetReviewById = async (Orderid: number) => {
    const review = await prisma.review.findFirst({
        where: {
            orderId: Orderid
        }
    });
    if (review) {
        return true;
    }
    return false;
};

export { GetAllReview, CountTotalReviewPage, GetReviewById };


