import { Request, Response } from 'express';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

// Trả về địa chỉ ví admin từ biến môi trường - công khai không cần đăng nhập
export const getAdminWallet = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminWallet = process.env.ADMIN_WALLET_ADDRESS;
        if (!adminWallet) {
            res.status(500).json({ 
                error: 'Chưa cấu hình địa chỉ ví admin' 
            });
            return;
        }

        console.log('Admin wallet requested');
        console.log('Admin wallet address:', adminWallet);

        res.json({ adminWallet });
    } catch (error) {
        console.error('Error in getAdminWallet:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Xác nhận thanh toán cryptocurrency
export const confirmCryptoPayment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { 
            productId,
            transactionHash,
            amount,
            currency,
            receiverName,
            receiverPhone,
            receiverAddress,
            receiverEmail,
            receiverNote,
            cartItems,
            vndAmount
        } = req.body;

        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ 
                error: 'Unauthorized' 
            });
            return;
        }

        // If from checkout (cartItems provided), handle multiple items
        if (cartItems && Array.isArray(cartItems) && cartItems.length > 0) {
            const order = await prisma.$transaction(async (prisma) => {
                // Tạo đơn hàng
                const newOrder = await prisma.order.create({
                    data: {
                        userId: userId,
                        totalPrice: vndAmount || 0,
                        receiverName: receiverName || '',
                        receiverPhone: receiverPhone || '',
                        receiverAddress: receiverAddress || '',
                        receiverEmail: receiverEmail || '',
                        receiverNote: receiverNote || '',
                        statusOrder: 'PENDING',
                        paymentMethod: 'CRYPTO',
                        paymentStatus: 'PAID',
                        paymentRef: transactionHash,
                    }
                });

                // Tạo chi tiết đơn hàng cho từng item
                for (const item of cartItems) {
                    const cartItem = await prisma.cartdetail.findUnique({
                        where: { id: parseInt(item.id) }
                    });

                    if (cartItem) {
                        const productVariant = await prisma.productVariant.findUnique({
                            where: { id: parseInt(item.productVariantId) }
                        });

                        if (productVariant) {
                            const product = await prisma.product.findUnique({
                                where: { id: productVariant.productId }
                            });

                            if (product) {
                                const finalPrice = product.price + (productVariant.priceMore || 0);

                                // Tạo chi tiết đơn hàng
                                await prisma.orderDetail.create({
                                    data: {
                                        orderId: newOrder.id,
                                        productId: product.id,
                                        productVariantId: productVariant.id,
                                        quantity: cartItem.quantityProduct || 1,
                                        price: finalPrice
                                    }
                                });

                                // Cập nhật số lượng sản phẩm
                                await prisma.product.update({
                                    where: { id: product.id },
                                    data: {
                                        quantity: {
                                            decrement: cartItem.quantityProduct || 1
                                        },
                                        sold: {
                                            increment: cartItem.quantityProduct || 1
                                        }
                                    }
                                });

                                // Xóa item khỏi giỏ hàng
                                await prisma.cartdetail.delete({
                                    where: { id: cartItem.id }
                                });
                            }
                        }
                    }
                }

                return newOrder;
            });

            res.json({
                success: true,
                orderId: order.id
            });
            return;
        }

        // If from product detail (productId provided), handle single product
        if (productId) {
            // Kiểm tra sản phẩm có tồn tại không
            const product = await prisma.product.findUnique({
                where: { id: parseInt(productId) }
            });

            if (!product) {
                res.status(404).json({
                    error: 'Không tìm thấy sản phẩm'
                });
                return;
            }

            // Tạo đơn hàng mới với thông tin thanh toán crypto
            const order = await prisma.$transaction(async (prisma) => {
                // Lấy biến thể mặc định của sản phẩm
                const defaultVariant = await prisma.productVariant.findFirst({
                    where: { productId: parseInt(productId) }
                });

                if (!defaultVariant) {
                    throw new Error('Không tìm thấy biến thể sản phẩm');
                }

                // Lấy thông tin người dùng
                const user = await prisma.user.findUnique({
                    where: { id: userId }
                });

                if (!user) {
                    throw new Error('Không tìm thấy thông tin người dùng');
                }

                const finalPrice = product.price + (defaultVariant.priceMore || 0);

                // Tạo đơn hàng
                const newOrder = await prisma.order.create({
                    data: {
                        userId: userId,
                        totalPrice: finalPrice,
                        receiverName: receiverName || user.fullName || '',
                        receiverPhone: receiverPhone || user.phone || '',
                        receiverAddress: receiverAddress || user.address || '',
                        receiverEmail: receiverEmail || user.email,
                        receiverNote: receiverNote || '',
                        statusOrder: 'COMPLETED',
                        paymentMethod: 'CRYPTO',
                        paymentStatus: 'PAID',
                        paymentRef: transactionHash,
                    }
                });

                // Tạo chi tiết đơn hàng
                await prisma.orderDetail.create({
                    data: {
                        orderId: newOrder.id,
                        productId: parseInt(productId),
                        productVariantId: defaultVariant.id,
                        quantity: 1,
                        price: finalPrice
                    }
                });

                // Cập nhật số lượng sản phẩm
                await prisma.product.update({
                    where: { id: parseInt(productId) },
                    data: {
                        quantity: {
                            decrement: 1
                        },
                        sold: {
                            increment: 1
                        }
                    }
                });

                return newOrder;
            });

            res.json({
                success: true,
                orderId: order.id
            });
            return;
        }

        res.status(400).json({
            error: 'Không có dữ liệu sản phẩm'
        });
    } catch (error) {
        console.error('Error processing crypto payment:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};