import { prisma } from "config/client";



const FilterFactory = async (nameFactory: string[]) => {
    const products = await prisma.product.findMany({
        include: {
            factory: true,
            target: true,
            productVariants: true
        },
        where: {
            status: { in: ["ACTIVE", "OUT_OF_STOCK", "DISCONTINUED"] },
            factory: { name: { in: nameFactory } }
        }
    });

    return products;
};

const FilterTarget = async (nameTarget: string) => {
    const products = await prisma.product.findMany({
        include: {
            factory: true,
            target: true,
            productVariants: true
        },
        where: {
            status: { in: ["ACTIVE", "OUT_OF_STOCK", "DISCONTINUED"] },
            target: { name: { contains: nameTarget } }
        }
    });

    return products;
};

const SortPriceGreaterThan = async (price: number) => {
    const products = await prisma.product.findMany({
        include: {
            factory: true,
            target: true,
            productVariants: true
        },
        where: {
            status: { in: ["ACTIVE", "OUT_OF_STOCK", "DISCONTINUED"] },
            price: {
                gte: price
            }
        }
    });

    return products;
};

const SortPriceLessThan = async (price: number) => {
    const products = await prisma.product.findMany({
        include: {
            factory: true,
            target: true,
            productVariants: true
        },
        where: {
            status: { in: ["ACTIVE", "OUT_OF_STOCK", "DISCONTINUED"] },
            price: {
                lte: price
            }
        }
    });

    return products;
};

const SortPriceBetween = async (minPrice: number, maxPrice: number) => {
    const products = await prisma.product.findMany({
        include: {
            factory: true,
            target: true,
            productVariants: true
        },
        where: {
            status: { in: ["ACTIVE", "OUT_OF_STOCK", "DISCONTINUED"] },
            price: {
                gte: minPrice,
                lte: maxPrice
            }
        }
    });

    return products;
};

const SortPriceAscAndDesc = async (sortOrder: 'asc' | 'desc') => {
    const products = await prisma.product.findMany({
        include: {
            factory: true,
            target: true,
            productVariants: true
        },
        where: {
            status: { in: ["ACTIVE", "OUT_OF_STOCK", "DISCONTINUED"] }
        },
        orderBy: {
            price: sortOrder
        }
    });
    return products;
};

const GetProductWithFilter = async (CurrentPage: number, PageSize: number, fatory: string, target: string, priceRange: string, sort: string) => {
    let WhereClause: any = { status: { in: ["ACTIVE", "OUT_OF_STOCK", "DISCONTINUED"] } };
    let OrderByClause: any = {};
    // Xử lý lọc theo factory
    if (fatory) {
        const factories = fatory.split(',');
        WhereClause.factory = {
            name: { in: factories }
        };
    };
    // ket qua WhereClause = { factory: {...} } nhu tren
    // Xử lý lọc theo target
    if (target) {
        const targets = target.split(',');
        WhereClause.target = {
            name: { in: targets }
        };
    };
    //  ket qua 
    //  WhereClause = { 
    //     factory: {...}, 
    //     target: {...} 
    // } 
    // nhu tren
    // Xử lý lọc theo priceRange
    if (priceRange) {
        const priceRanges = priceRange.split(',');
        // ['duoi-10-trieu', '10-15-trieu', '15-20-trieu', '20-40-trieu', '40-60-trieu','tren-60-trieu'];
        const priceConditions = priceRanges.map(range => {
            if (range === 'duoi-10-trieu') {
                return { price: { lt: 10000000 } };
            } else if (range === '10-15-trieu') {
                return { price: { gte: 10000000, lte: 15000000 } };
            } else if (range === '15-20-trieu') {
                return { price: { gte: 15000000, lte: 20000000 } };
            } else if (range === '20-40-trieu') {
                return { price: { gte: 20000000, lte: 40000000 } };
            } else if (range === '40-60-trieu') {
                return { price: { gte: 40000000, lte: 60000000 } };
            } else if (range === 'tren-60-trieu') {
                return { price: { gte: 60000000 } };
            } else {
                return {};
            };
        });
        WhereClause.OR = priceConditions;
    };

    let orderByClause: any = {};
    // ['gia-tang-dan', 'gia-giam-dan', 'gia-khong-sap-xep']
    if (sort) {
        if (sort === 'gia-tang-dan') {
            orderByClause.orderBy = { price: 'asc' };
        } else if (sort === 'gia-giam-dan') {
            orderByClause.orderBy = { price: 'desc' };
        } else {
            orderByClause = {};
        }
    };
    // lấy số trang hiện tại và kích thước trang
    // Truy vấn với WhereClause và OrderByClause đã xây dựng
    const [product, totalcount] = await prisma.$transaction([
            prisma.product.findMany({
            skip: CurrentPage * PageSize,
            take: PageSize,
            include: {
                factory: true,
                target: true,
                productVariants: true
            },
            where: WhereClause,
            ...( orderByClause.orderBy && { orderBy: orderByClause.orderBy } )
        }),
        prisma.product.count({ where: WhereClause })
    ]);
    // Tính tổng số trang
    const totalPages = Math.ceil(totalcount / PageSize);
    return { product, totalPages };
};

const GetCountFactoryProduct = async (FactoryId: number) => {
    const count = await prisma.product.count({
        where: { factoryId: FactoryId }
    });
    return count;

};

export { 
    FilterFactory, FilterTarget, SortPriceGreaterThan, 
    SortPriceLessThan, SortPriceBetween, SortPriceAscAndDesc,
    GetProductWithFilter, GetCountFactoryProduct
};