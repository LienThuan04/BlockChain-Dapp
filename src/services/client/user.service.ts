import { prisma } from "config/client";
import { UserRole } from "src/types/index.dt";
import bcrypt from 'bcrypt';
import { hashPassword } from "services/admin/user.service";

const PostClientToUpdateAcc = async (userId: number, data: { fullName: string, address: string, phone: string, avatar: string | null }) => {
    const { fullName, address, phone, avatar } = data;
    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
            fullName,
            address,
            phone,
            ...(avatar ? { avatar } : {}),
        }
    });

    return updatedUser;
};

const AddProductToCart = async (user: UserRole, quantity: number, productId: number, productVariantId?: number) => {
    console.log('AddProductToCart called with', { userId: user.id, quantity, productId, productVariantId });
    const cart = await prisma.cart.findUnique({
        where: { userId: user.id }
    });
    const product = await prisma.product.findUnique({
        where: { id: productId }
    });
    const productVariant = (typeof productVariantId === 'number' && !isNaN(productVariantId)) ? await prisma.productVariant.findUnique({ where: { id: productVariantId } }) : null;
    if (cart) {
        // Tìm cartDetail theo productId, productVariantId và cartId
        const whereClause: any = { productId: productId, cartId: cart.id };
        if (typeof productVariantId === 'number' && !isNaN(productVariantId)) whereClause.productVariantId = productVariantId;

    console.log('Looking for existing cartDetail with where:', whereClause);
    const cartDetail = await prisma.cartdetail.findFirst({ where: whereClause });
    console.log('Found cartDetail:', cartDetail);
        const price = (product?.price || 0) + (productVariant?.priceMore || 0);
        if (cartDetail) {
            // Nếu đã có sản phẩm/variant này trong giỏ, cộng số lượng và cập nhật giá nếu cần
            const updatedCartDetail = await prisma.cartdetail.update({
                where: { id: cartDetail.id },
                data: {
                    quantityProduct: {
                        increment: quantity
                    },
                    price: price
                }
            });
            // Tăng tổng quantity của cart
            await prisma.cart.update({
                where: { id: cart.id },
                data: {
                    quantity: {
                        increment: quantity
                    }
                }
            });
            return updatedCartDetail;
        } else {
            // Nếu chưa có sản phẩm/variant này trong giỏ, tạo mới
            const updatedCart = await prisma.cart.update({
                where: { id: cart.id },
                data: {
                    quantity: {
                        increment: quantity
                    }
                }
            });
            // Determine productVariantId to store: prefer provided, fallback to default variant for product
            let pvToUse = productVariantId;
            if (!(typeof pvToUse === 'number' && !isNaN(pvToUse))) {
                const defaultVariant = await prisma.productVariant.findFirst({ where: { productId } });
                if (defaultVariant) pvToUse = defaultVariant.id;
                else throw new Error('No product variant available for this product');
            }

            const newCartDetail = await prisma.cartdetail.create({
                data: {
                    quantityProduct: quantity,
                    price: price,
                    productId: productId,
                    productVariantId: pvToUse,
                    cartId: cart.id
                }
            });
            return { newCartDetail, updatedCart };
        }
    } else {
        // Nếu chưa có cart, tạo mới cart và cartDetail
        if (!product) {
            throw new Error("Product not found");
        }
        const price = (product?.price || 0) + (productVariant?.priceMore || 0);
        // Determine productVariantId to store for new cart: prefer provided, fallback to default variant
        let pvToUse = productVariantId;
        if (!(typeof pvToUse === 'number' && !isNaN(pvToUse))) {
            const defaultVariant = await prisma.productVariant.findFirst({ where: { productId } });
            if (defaultVariant) pvToUse = defaultVariant.id;
            else throw new Error('No product variant available for this product');
        }

        const NewCart = await prisma.cart.create({
            data: {
                userId: user.id,
                quantity: quantity,
                cartDetails: {
                    create: [
                        {
                            price: price,
                            quantityProduct: quantity,
                            productId: productId,
                            productVariantId: pvToUse
                        }
                    ]
                }
            }
        });
        return NewCart;
    }
};

const GetProductByCartDetail = async (userId: number) => {
    const cartId = await prisma.cart.findUnique({
        where: {
            userId: userId
        }
    });
    if (cartId) {
        const cartDetails = await prisma.cartdetail.findMany({
            where: {
                cartId: cartId.id
            },
            include: {
                product: {
                    include: {
                        productVariants: true,
                        target: true,
                        factory: true,
                    }
                }, // join thêm dữ liệu từ bảng product
            }
        });

        
        return cartDetails;
    };
    return [];
};

const DelProductFromCart = async (user: UserRole, productId: number) => {
    const cart = await prisma.cart.findUnique({
        where: { userId: user.id }
    });

    if (cart) {
        const cartDetail = await prisma.cartdetail.findFirst({
            where: {
                productId: productId,
                cartId: cart.id
            }
        });

        if (cartDetail) {
            const result = await prisma.cartdetail.delete({
                where: { id: cartDetail.id }
            });
            // Sau khi xóa, tính lại tổng quantityProduct của tất cả cartdetail còn lại
            const remainingCartDetails = await prisma.cartdetail.findMany({
                where: { cartId: cart.id }
            });
            const newQuantity = remainingCartDetails.reduce((acc, item) => acc + (item.quantityProduct || 0), 0);
            const setQuantityCart = await prisma.cart.update({
                where: { id: cart.id },
                data: {
                    quantity: newQuantity
                }
            });
            return { result, setQuantityCart };
        }
    } else {
        return [];
    }
};

const UpdateQuantityBeforeCheckout = async (user: UserRole, QuantityUpdate: Array<{ id: number, quantity: number, selectedItems?: boolean, variantId: number }>) => {
    const cart = await prisma.cart.findUnique({
        where: { userId: user.id }
    });
    const checkUpdate: Array<{ id: number, result: boolean }> = []
    if (cart) {
        // Cập nhật từng cartdetail
        for (const item of QuantityUpdate) {
            // Lấy cartDetail hiện tại để lấy productId
            const cartDetail = await prisma.cartdetail.findUnique({ where: { id: Number(item.id) } });
            let basePrice = 0;
            let priceMore = 0;
            if (cartDetail) {
                // Lấy giá gốc sản phẩm
                const product = await prisma.product.findUnique({ where: { id: cartDetail.productId } });
                basePrice = product?.price || 0;
                // Nếu có variantId thì lấy priceMore
                if (item.variantId !== undefined) {
                    const variant = await prisma.productVariant.findUnique({ where: { id: Number(item.variantId) } });
                    priceMore = variant?.priceMore || 0;
                }
            }
            const updateData: any = {
                quantityProduct: Number(item.quantity),
                price: basePrice + priceMore
            };
            if (item.variantId !== undefined) {
                updateData.productVariantId = Number(item.variantId);
            }
            const result = await prisma.cartdetail.update({
                where: {
                    id: Number(item.id)
                },
                data: updateData
            });
            checkUpdate.push({ id: item.id, result: !!result });
        }
        // Sau khi cập nhật xong, tính lại tổng quantity của cart
        const allCartDetails = await prisma.cartdetail.findMany({
            where: { cartId: cart.id }
        });
        const totalQuantity = allCartDetails.reduce((acc, item) => acc + (item.quantityProduct || 0), 0);
        const UpdateQuantityCart = await prisma.cart.update({
            where: { id: cart.id },
            data: {
                quantity: totalQuantity
            }
        });
        return { checkUpdate, UpdateQuantityCart };
    }
    return checkUpdate;
};

const PlaceOrder = async (user: UserRole,
    orderData: {
        receiverName: string,
        receiverPhone: string,
        receiverAddress: string,
        receiverEmail: string | null,
        receiverNote: string | null,
        paymentMethod: string,
        paymentRef?: string | null,
        paymentStatus?: string,
        ListIdCartDetail: { id: number, productVariantId: number }[],

    }) => {
    // Logic to place the order
    try {
        const check = await prisma.$transaction(async (tx) => {
            const cart = await tx.cart.findUnique({
                where: {
                    userId: user.id
                },
                include: {
                    cartDetails: true
                }
            });
            if (cart) {
                // Logic to create the order
                const ListIdCartDetail = orderData?.ListIdCartDetail;
                const DataOrderCartDetail = cart?.cartDetails?.filter((item) => {
                    return ListIdCartDetail.some(obj => obj.id === item.id)
                }).map(item => {
                    return {
                        id: item.id,
                        price: item.price,
                        quantity: item.quantityProduct,
                        // cartId: item.cartId,
                        productId: item.productId,
                        productVariantId: item.productVariantId
                    };
                }) ?? [];

                const CreateOrder = await tx.order.create({
                    data: {
                        userId: user.id,
                        receiverName: orderData.receiverName,
                        receiverPhone: orderData.receiverPhone,
                        receiverAddress: orderData.receiverAddress,
                        receiverEmail: orderData.receiverEmail,
                        receiverNote: orderData.receiverNote,
                        paymentMethod: orderData.paymentMethod,
                        paymentStatus: (orderData.paymentStatus ? orderData.paymentStatus : 'PAYMENT_UNPAID'),
                        totalPrice: DataOrderCartDetail.reduce((acc, item) => acc + (item.price * (item.quantity ? item.quantity : 0)), 0) + 30000,
                        ...(orderData.paymentRef ? { paymentRef: orderData.paymentRef } : null),
                        orderDetails: {
                            create: DataOrderCartDetail as any,
                        },

                    }
                });

                const removeCartDetail = await tx.cartdetail.deleteMany({
                    where: {
                        id: {
                            in: ListIdCartDetail.map(item => item.id)
                        }
                    }
                });

                // Sau khi xóa cartdetail, cập nhật lại quantity của cart đúng với tổng quantityProduct còn lại
                const remainingCartDetails = await tx.cartdetail.findMany({
                    where: { cartId: cart.id }
                });
                // Tính toán lại quantity của cart
                const newQuantity = remainingCartDetails.reduce((acc, item) => acc + (item.quantityProduct || 0), 0);
                // Cập nhật lại quantity của cart
                const UpdateQuantityCart = await tx.cart.update({
                    where: { id: cart.id },
                    data: { quantity: newQuantity }
                });
                // Cập nhật lại quantity của từng sản phẩm trong bảng product
                for (let item of DataOrderCartDetail) {
                    const productId = item.productId;
                    const product = await tx.product.findUnique({
                        where: { id: productId }
                    });
                    if (!product || product.quantity < Number(item.quantity)) {
                        throw new Error(`Product with ID ${product?.name} is out of stock or does not have enough quantity.`);
                    };
                    const updateQuantityforTableProduct = await tx.product.update({
                        where: { id: productId },
                        data: {
                            quantity: {
                                decrement: Number(item.quantity)
                            },
                            sold: {
                                increment: Number(item.quantity)
                            },
                            productVariants: {
                                update: {
                                    where: { id: item.productVariantId },
                                    data: {
                                        quantity: {
                                            decrement: Number(item.quantity)
                                        },
                                        sold:{
                                            increment: Number(item.quantity)
                                        }
                                    }
                                }
                            }
                        },
                        
                    });
                };
                return [CreateOrder, removeCartDetail, UpdateQuantityCart];

            };
            return false;
        });
        return check;
    } catch (error) {
        return false;
    }

};

const GetOrderHistoryForUser = async (user: UserRole) => {
    const orders = await prisma.order.findMany({
        where: {
            userId: user.id
        },
        include: {
            orderDetails: {
                include: { product: true,
                    productVariant: true
                }
            }
        },

    });
    return orders;
};

const GetDetailHistoryById = async (orderId: number, user: UserRole) => {
    const order = await prisma.order.findUnique({
        where: {
            id: orderId,
            userId: user.id
        },
        include: {
            orderDetails: {
                include: {
                    product: true,
                    productVariant: true
                }
            }
        }
    });
    return order;
};

const ChangeUserPassword = async (userId: number, currentPassword: string, newPassword: string) => {
    // Logic to change the user's password
    const user = await prisma.user.findUnique({
        where: {
            id: userId
        }
    });
    if (!user) {
        return false;
    };

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
        return false;
    };

    const hashedNewPassword = await hashPassword(newPassword);
    await prisma.user.update({
        where: {
            id: userId
        },
        data: {
            password: hashedNewPassword
        }
    });
    return true;
};

const FindCartForUserId = async (userId: number) => {
    const cart = await prisma.cart.findUnique({
        where: {
            userId: userId
        }
    });
    return cart;
};

const PostReviewProductToHistory = async (orderId: number, user: UserRole , rating: number, comment: string, productIds: Array<{ productId: number, variantId: number }>) => {
    // Kiểm tra đơn hàng có thuộc về user không
    const order = await prisma.order.findUnique({
        where: {
            id: orderId,
            userId: user.id
        }
    });
    if (!order) {
        return false;
    };
    // Kiểm tra xem user đã đánh giá sản phẩm trong đơn hàng này chưa
    const existingReviews = await prisma.review.findMany({
        where: {
            orderId: orderId,
            userId: user.id
        }
    });
    if (existingReviews && existingReviews.length > 0) {
        return false; // Đã đánh giá rồi, không cho đánh giá lại
    };
    // Thêm đánh giá vào lịch sử
    for (const item of productIds) {
        await prisma.review.create({
            data: {
                userId: user.id,
                productId: item.productId,
                rating: rating,
                content: comment,
                orderId: orderId
            }
        });
    };
    return true;
};

const GetReviewedFormUser = async (orderId: number, user: UserRole) => {
    if (orderId === 0) { // Lấy tất cả đánh giá của user
        const reviews = await prisma.review.findMany({
            where: {
                userId: user.id
            },
            select: {
                id: true,
                orderId: true,
            },
        });
        return reviews;
    };
    const reviews = await prisma.review.findMany({
        where: {
            orderId: orderId,
            userId: user.id
        },
        select: {
            id: true,
            rating: true,
            content: true,
            orderId: true,
        },
    });
    if (reviews && reviews.length > 0) {
        return reviews;
    }
    return false;
};

const CancelOrderById = async (orderId: number, user: UserRole) => {
    // Kiểm tra đơn hàng có thuộc về user không
    const order = await prisma.order.findUnique({
        where: {
            id: orderId,
            userId: user.id
        },
        include: {
            orderDetails: true
        }
    });
    if (!order) {
        return false;
    }
    // Xóa đơn hàng
    await prisma.order.update({
        where: {
            id: orderId
        },
        data: {
            statusOrder: 'CANCELLED'
        }
    });
    return true;
};

export {
    PostClientToUpdateAcc, AddProductToCart, GetProductByCartDetail,
    DelProductFromCart, UpdateQuantityBeforeCheckout, PlaceOrder,
    GetOrderHistoryForUser, GetDetailHistoryById, ChangeUserPassword,
    FindCartForUserId, PostReviewProductToHistory, GetReviewedFormUser,
    CancelOrderById, 

};
