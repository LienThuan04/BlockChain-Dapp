import { prisma } from "config/client";

const PostCreateNewFactory = async (Name: string, Description: string) => {
    const create = await prisma.factory.create({
        data:{
            name: Name,
            description: Description
        }
    });
    return create;
};

const PostCreateNewTarget = async (Name: string, Description: string) => {
    const create = await prisma.target.create({
        data:{
            name: Name,
            description: Description
        }
    });
    return create;
};


const GetViewFactoryById = async (id: number) => {
    const DetailFactory = await prisma.factory.findUnique({
        where: { id: id },
    });
    return DetailFactory;
};

const GetViewTargetById = async (id: number) => {
    const DetailTarget = await prisma.target.findUnique({
        where:{
            id: id
        },
    });
    return DetailTarget;
};


const PostUpdateFactoryById = async (id: number, Name: string, Description: string) => {
    const Update = await prisma.factory.update({
        where: { id: id },
        data: {
            name: Name,
            description: Description
        }
    });
    return Update;
};

const PostUpdateTargetById = async (id: number, Name: string, Description: string) => {
    const Update = await prisma.target.update({
        where: {
            id: id,
        },
        data:{
            name: Name,
            description: Description,
        }
    });
    return Update;
};


const PostDelFactoryById = async (id: number): Promise<{ success: boolean, productIds?: number[] }> => {
    // Kiểm tra có sản phẩm nào liên kết với factory này không
    const linkedProducts = await prisma.product.findMany({
        where: { factoryId: Number(id) },
        select: { id: true }
    });
    if (linkedProducts.length > 0) {
        // Lấy danh sách id sản phẩm liên kết
        const productIds = (linkedProducts as {id: number}[]).map((p) => p.id);
        return { success: false, productIds };
    }
    // Nếu không có sản phẩm liên kết thì xóa
    await prisma.factory.delete({ where: { id: Number(id) } });
    return { success: true };
};


const PostDelTargetById = async (id:number): Promise<{ success: boolean, productIds?: number[] }> => {
    const linkedProducts = await prisma.product.findMany({
        where: { targetId: Number(id) },
        select: { id: true }
    });
    if(linkedProducts.length > 0){
        const productIds = (linkedProducts as {id:number}[]).map((p) => p.id); // ép kiểu nó sang như này nè [ {id: number} ]
        return { success: false, productIds };
    };
    await prisma.target.delete({ where: { id: Number(id) } });
    return { success: true };
}


export { 
    PostCreateNewFactory, PostCreateNewTarget, GetViewFactoryById, 
    GetViewTargetById, PostUpdateFactoryById, PostUpdateTargetById, 
    PostDelFactoryById, PostDelTargetById 
};
