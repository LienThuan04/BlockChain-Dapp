import { prisma } from "config/client";
import { PAGE_SIZE_WITH_CLIENT } from "config/constant";
import { GetAllFactory } from 'services/admin/Product.service';

const GetAllProductforClient = async (page?: number, pageSize?: number) => {
    const skip = page && pageSize ? page * pageSize : 0;
    const products = await prisma.product.findMany({
        where: {
            status: { in: ["ACTIVE", "OUT_OF_STOCK", "DISCONTINUED"] },
        },
        include: {
            target: {
                select: { id: true, name: true },
            },
            factory: {
                select: { id: true, name: true }
            },
            productVariants: true
        },
        skip: skip ?? 0,
        take: pageSize ?? PAGE_SIZE_WITH_CLIENT
    });
    // Lọc lại productVariants chỉ lấy 1 object theo yêu cầu
    const productsWithOneVariant = products.map(product => {
        let chosenVariant = null;
        if (product.productVariants && product.productVariants.length > 0) {
            // Ưu tiên priceMore = 0
            chosenVariant = product.productVariants.find(v => v.priceMore === 0);
            if (!chosenVariant) {
                // Nếu không có, lấy variant có priceMore nhỏ nhất (an toàn với null)
                chosenVariant = product.productVariants.reduce((min, v) => {
                    const vPrice = v.priceMore ?? Infinity;
                    const minPrice = min.priceMore ?? Infinity;
                    return vPrice < minPrice ? v : min;
                }, product.productVariants[0]);
            }
        }
        return {
            ...product,
            productVariants: chosenVariant ? [chosenVariant] : []
        };
    });
    return productsWithOneVariant;
};

const CountTotalProductPage = async (pageSize: number): Promise<number>  => {
    const count = await prisma.product.count({
        where: {
            status: { in: ["ACTIVE", "OUT_OF_STOCK", "DISCONTINUED"] },
        }
    });
    return Math.ceil(count / pageSize);
};

const GetProductByIdForClient = async (id: number) => {
    const product = await prisma.product.findUnique({
        where: { id: Number(id) },
        include: {
            target: true,
            factory: true,
            productVariants: true,
            productImages: true
        },
    });
    return product;
};

const GetAllFactoryForClient = async (): Promise<Array<{ id: number, name: string }>> => {
    const factories = await prisma.factory.findMany();
    return factories;
};

const GetAllTargetForClient = async (): Promise<Array<{ id: number, name: string }>> => {
    const targets = await prisma.target.findMany();
    return targets;
};

const GetRecommendedProducts = async (IdProduct: number, page: number, pageSize: number) => { // Lay danh gia san pham
    const skip = page && pageSize ? page * pageSize : 0;
    const recommendedProducts = await prisma.review.findMany({
        where: { productId: IdProduct },
        include: {
            user: { 
                select: { id: true, avatar: true, fullName: true } 
            },
        },
        skip: skip ?? 0,
        take: pageSize ?? PAGE_SIZE_WITH_CLIENT,
        orderBy: { createdAt: 'desc' }
    });
    return recommendedProducts;
};


const GetNewProducts = async (Limit: number) => {
    const products = await prisma.product.findMany({
        where: {
            status: { in: ["ACTIVE", "OUT_OF_STOCK", "DISCONTINUED"] },
        },
        include: {
            target: {
                select: { id: true, name: true },
            },
            factory: {
                select: { id: true, name: true }
            },
            productVariants: true
        },
        orderBy: {
            id: 'desc' // Sắp xếp theo id giảm dần để lấy sản phẩm mới nhất
        },
        take: Limit // Giới hạn số lượng sản phẩm lấy về
    });
    return products;
}


export { GetAllProductforClient, GetProductByIdForClient, CountTotalProductPage, 
    GetAllFactoryForClient, GetAllTargetForClient, GetRecommendedProducts,
    GetNewProducts
};