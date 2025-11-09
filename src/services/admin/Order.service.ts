import { prisma } from "config/client";
import { PAGE_SIZE_WITH_ADMIN } from "config/constant";

interface FilterOptions {
    status?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    searchUser?: string;
}

const GetAllOrder = async (Page: number, filters?: FilterOptions) => {
    const skip = Page * PAGE_SIZE_WITH_ADMIN;
    
    // Build where clause based on filters
    const where: any = {};
    
    if (filters?.status) {
        where.statusOrder = filters.status;
    }
    
    if (filters?.paymentMethod) {
        where.paymentMethod = filters.paymentMethod;
    }
    
    if (filters?.paymentStatus) {
        where.paymentStatus = filters.paymentStatus;
    }
    
    if (filters?.searchUser) {
        // Search by fullName or email (case-insensitive)
        where.OR = [
            {
                User: {
                    fullName: {
                        contains: filters.searchUser
                    }
                }
            },
            {
                User: {
                    email: {
                        contains: filters.searchUser
                    }
                }
            }
        ];
    }
    
    const orders = await prisma.order.findMany({
        where,
        include: {
            User: true,
        },
        skip,
        take: PAGE_SIZE_WITH_ADMIN,
        orderBy: { createdAt: 'desc' } // Mới nhất trước
    });
    return orders;
};

const CountTotalOrderPage = async (filters?: FilterOptions) => {
    const where: any = {};
    
    if (filters?.status) {
        where.statusOrder = filters.status;
    }
    
    if (filters?.paymentMethod) {
        where.paymentMethod = filters.paymentMethod;
    }
    
    if (filters?.paymentStatus) {
        where.paymentStatus = filters.paymentStatus;
    }
    
    if (filters?.searchUser) {
        where.OR = [
            {
                User: {
                    fullName: {
                        contains: filters.searchUser
                    }
                }
            },
            {
                User: {
                    email: {
                        contains: filters.searchUser
                    }
                }
            }
        ];
    }
    
    const totalOrders = await prisma.order.count({ where });
    return Math.ceil(totalOrders / PAGE_SIZE_WITH_ADMIN);
}

const GetDetailOrderForAdmin = async (id: number) => {
    const order = await prisma.order.findUnique({
        where: { id },
        include: {
            User: true,
        }
    });
    const detailOrder = await prisma.orderDetail.findMany({
        where: { orderId: id },
        include: {
            product: true,
            productVariant: true
        }
    });
    return { detailOrder, order };
};

const UpdateOrderById = async (id: number, data: any) => {
    const parseCurrencyToNumber = (value: string) => {
        return Number(value.replace(/[^\d]/g, ''));
    };
    const TotalPrice = parseCurrencyToNumber(data.totalPrice);
    const order = await prisma.order.update({
        where: { id },
        data:{
            statusOrder: data.statusOrder,
            receiverName: data.receiverName,
            receiverAddress: data.receiverAddress,
            receiverPhone: data.receiverPhone,
            ...(data.receiverEmail ? { receiverEmail: data.receiverEmail } : {}),
            ...(data.receiverNote ? { receiverNote: data.receiverNote } : {}),
            totalPrice: TotalPrice,
        },
    });
    const { detailOrder } = data;
    if(detailOrder){
        for (const item of detailOrder) {
            await prisma.orderDetail.update({
                where: { id: Number(item.id) },
                data: {
                    quantity: Number(item.quantity),
                },
            });
        };
    };
    return order;
};

export { 
    GetAllOrder, GetDetailOrderForAdmin, UpdateOrderById,
    CountTotalOrderPage
 };
