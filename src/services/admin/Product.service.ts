import { prisma } from "config/client";
import { PAGE_SIZE_WITH_ADMIN } from "config/constant";


// Lấy product kèm các variant
const getProductWithVariantsById = async (id: number) => {
    return prisma.product.findUnique({
        where: { id: Number(id) },
        include: { productVariants: true, productImages: true }
    });
};

// Update product và variants, nhận thêm variantsToDelete và status
const handleUpdateProductWithVariants = async (
    id: number,
    name: string,
    price: number,
    quantity: number,
    shortDesc: string,
    detailDesc: string,
    factoryId: number,
    targetId: number,    
    variants: Array<{id?: number, cpu: string, memory: string, color: string, priceMore: number, quantity: number}>,
    variantsToDelete?: number[],
    status?: string,
    imageFiles?: any,
    ListImagesDel?: number[]
) => {
    // Update product, truyền status nếu có
    const updatedProduct = await prisma.product.update({
        where: { id: Number(id) },
        data: {
            name,
            price,
            quantity,
            shortDesc,
            detailDesc,
            factoryId,
            targetId,
            ...(imageFiles.image && { image: imageFiles.image[0].filename }),
            ...(status && { status }),
        }
    });
    // Xóa các variant theo danh sách được truyền vào (nếu có)
    if (variantsToDelete && variantsToDelete.length > 0) {
        await prisma.productVariant.deleteMany(
            { where: { 
                id: { in: variantsToDelete } 
            } 
        });
    };
    // Xóa các ảnh sản phẩm theo danh sách được truyền vào (nếu có)
    if (ListImagesDel && ListImagesDel.length > 0) {
        await prisma.productImage.deleteMany(
            { where: { 
                id: { in: ListImagesDel } 
            } 
        });
    };
    //tạo ảnh sản phẩm mới nếu có truyền vào
    if (imageFiles && imageFiles.images && imageFiles.images.length > 0) {
        for (const image of imageFiles.images) {
            await prisma.productImage.create({
                data: {
                    productId: Number(id),
                    urlImage: image.filename
                }
            });
        }
    };
    // Update variants: update nếu có id, create nếu không có id
    if (variants && variants.length > 0) {
        for (const v of variants) {
            if (!v || typeof v !== 'object') continue;
            if (v.id) {
                // Update variant
                await prisma.productVariant.update({
                    where: { id: Number(v.id) },
                    data: {
                        cpu: v.cpu,
                        memory: v.memory,
                        color: v.color || '',
                        priceMore: v.priceMore ? Number(v.priceMore) : 0,
                        quantity: Number(v.quantity)
                    }
                });
            } else {
                // Create mới
                await prisma.productVariant.create({
                    data: {
                        productId: Number(id),
                        cpu: v.cpu,
                        memory: v.memory,
                        color: v.color || '',
                        priceMore: v.priceMore ? Number(v.priceMore) : 0,
                        quantity: Number(v.quantity)
                    }
                });
            }
        }
    }
    return updatedProduct;
};


const handleCreateProduct = async (
    name: string,
    price: number,
    quantity: number,
    shortDesc: string,
    detailDesc: string,
    factoryId: number,
    targetId: number,
    images: any,
    variants: Array<{cpu: string, memory: string, color: string, priceMore: number, quantity: number}>,
    status: string
) => {
    // Find Factory and Target by id
    const factory = await prisma.factory.findUnique({ where: { id: Number(factoryId) } });
    const target = await prisma.target.findUnique({ where: { id: Number(targetId) } });
    if (!factory || !target) return null;
    // Tạo product trước
    const CreateProduct = await prisma.product.create({
        data: {
            name,
            price,
            quantity,
            shortDesc,
            detailDesc,
            factoryId: factory.id,
            targetId: target.id,
            image: images && images.length > 0 ? images.image.filename : null, // Lấy file đầu tiên làm ảnh đại diện
            status
        }
    });
    // Tạo ít nhất 1 ProductVariant mặc định
    for (const v of variants) {
        await prisma.productVariant.create({
            data: {
                productId: CreateProduct.id,
                cpu: v.cpu,
                memory: v.memory,
                color: v.color || '',
                priceMore: v.priceMore ? Number(v.priceMore) : 0,
                quantity: v.quantity ? Number(v.quantity) : 0
            }
        });
    };
    if (images && images.images && images.images.length > 0) {
        for (const image of images.images){
            await prisma.productImage.create({
                data: {
                    productId: CreateProduct.id,
                    urlImage: image.filename
                }
            });
        }
    }
    
    return CreateProduct;
};

const GetAllProduct = async (CurrentPage: number) => {
    const PageSize = PAGE_SIZE_WITH_ADMIN;
    const Skip = CurrentPage * PageSize;
    const products = await prisma.product.findMany({
        include: {
            factory: true,
            target: true
        },
        skip: Skip,
        take: PageSize
    });
    return products;
};

const CountTotalProductPage = async () => {
    const count = await prisma.product.count();
    return Math.ceil(count / PAGE_SIZE_WITH_ADMIN);
};

const PostDelProduct = async (id: number) => {
    const DelProduct = await prisma.product.delete({
        where: {
            id: id
        },
    });
    return DelProduct;
}

// const handleUpdateProduct = async (
//     id: number,
//     name: string,
//     price: number,
//     quantity: number,
//     shortDesc: string,
//     detailDesc: string,
//     factoryId: number,
//     targetId: number,
//     image: string | null
// ) => {
//     // Find Factory and Target by id
//     const factory = await prisma.factory.findUnique({ where: { id: Number(factoryId) } });
//     const target = await prisma.target.findUnique({ where: { id: Number(targetId) } });
//     if (!factory || !target) return null;
//     const UpdateProduct = await prisma.product.update({
//         where: { id: Number(id) },
//         data: {
//             name,
//             price,
//             quantity,
//             shortDesc,
//             detailDesc,
//             factoryId: factory.id,
//             targetId: target.id,
//             ...(image && { image })
//         }
//     });
//     return UpdateProduct;
// };

const GetAllFactory = async (Page?: number) => {
    if (Page || Page === 0) {
        const skip = Page * PAGE_SIZE_WITH_ADMIN;
        const ALLFactory = await prisma.factory.findMany({
            skip,
            take: PAGE_SIZE_WITH_ADMIN
        });
        if (ALLFactory) {
            return ALLFactory;
        }
        return [];
    } else {
        const AllFactory = await prisma.factory.findMany();
        if (AllFactory) {
            return AllFactory;
        }
        return [];
    }
};
const CountTotalFactoryPage = async () => {
    const count = await prisma.factory.count();
    return Math.ceil(count / PAGE_SIZE_WITH_ADMIN);
}

const GetAllTarget = async (Page?: number) => {
    if (Page || Page === 0) {
        const skip = Page * PAGE_SIZE_WITH_ADMIN;
        const AllTarget = await prisma.target.findMany({
            skip,
            take: PAGE_SIZE_WITH_ADMIN
        });
        if (AllTarget) {
            return AllTarget;
        }
        return [];
    } else {
        const AllTarget = await prisma.target.findMany();
        if (AllTarget) {
            return AllTarget;
        }
        return [];
    }


};

const CountTotalTargetPage = async () => {
    const count = await prisma.target.count();
    return Math.ceil(count / PAGE_SIZE_WITH_ADMIN);
}

export {
    handleCreateProduct, GetAllProduct, PostDelProduct,
    GetAllFactory, GetAllTarget,
    getProductWithVariantsById, handleUpdateProductWithVariants, CountTotalProductPage,
    CountTotalFactoryPage, CountTotalTargetPage
}