import { prisma } from "config/client";
import { PAGE_SIZE_WITH_ADMIN } from "config/constant";

interface FilterOptions {
    status?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    searchUser?: string;
}

const GetAllOrder = async (Page: number, filters?: FilterOptions) => {
    // Build where clause based on filters
    const where: any = {};
    
    if (filters?.status) {
        where.statusOrder = filters.status;
    }
    
    if (filters?.paymentMethod) {
        where.paymentMethod = filters.paymentMethod;
    }
    
    if (filters?.paymentStatus) {
        // Normalize "Paid" semantics: sometimes orders use 'PAID' and sometimes 'PAYMENT_PAID'.
        // If the filter asks for PAYMENT_PAID (the UI's "Paid" option), include both values.
        const ps = String(filters.paymentStatus).toUpperCase();
        if (ps === 'PAYMENT_PAID' || ps === 'PAID') {
            where.paymentStatus = { in: ['PAID', 'PAYMENT_PAID'] };
        } else {
            where.paymentStatus = filters.paymentStatus;
        }
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
    
    const queryOptions: any = {
        where,
        include: { User: true },
        orderBy: { createdAt: 'desc' } // Mới nhất trước
    };

    // Debug: log constructed where/queryOptions when filters used (helps diagnose unexpected results)
    try {
        if (filters && Object.keys(filters).length > 0) {
            console.log('DEBUG [GetAllOrder] where=', JSON.stringify(where), 'queryOptions=', JSON.stringify(Object.keys(queryOptions)));
        }
    } catch (e) {
        console.log('DEBUG [GetAllOrder] failed to stringify where/queryOptions', e);
    }

    // If Page is negative, caller requests all matching rows in one go (no pagination)
    if (typeof Page === 'number' && Page >= 0) {
        const skip = Page * PAGE_SIZE_WITH_ADMIN;
        queryOptions.skip = skip;
        queryOptions.take = PAGE_SIZE_WITH_ADMIN;
    }

    const orders = await prisma.order.findMany(queryOptions);
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
        const ps = String(filters.paymentStatus).toUpperCase();
        if (ps === 'PAYMENT_PAID' || ps === 'PAID') {
            where.paymentStatus = { in: ['PAID', 'PAYMENT_PAID'] };
        } else {
            where.paymentStatus = filters.paymentStatus;
        }
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
    // If there is a crypto transaction associated with this order, include it so the admin UI can show crypto amounts
    const cryptoTx = await prisma.cryptoTransaction.findFirst({
        where: { orderId: id },
        include: { cryptocurrency: true }
    });
    return { detailOrder, order, cryptoTx };
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
