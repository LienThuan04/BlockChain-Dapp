import { Request, Response } from 'express';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

// Trả về địa chỉ ví admin từ biến môi trường - công khai không cần đăng nhập
export const getAdminWallet = async (req: Request, res: Response): Promise<void> => {
    try {
        // Prefer active wallet from DB so frontend always gets the currently selected address
        const activeWalletRecord = await prisma.cryptoWallet.findFirst({ where: { isActive: true } });
        const adminWallet = activeWalletRecord?.walletAddress || process.env.ADMIN_WALLET_ADDRESS;

        if (!adminWallet) {
            res.status(500).json({ error: 'Chưa cấu hình địa chỉ ví admin' });
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

        console.log('Crypto payment request body:', req.body);
        console.log('CartItems received:', cartItems, 'Type:', Array.isArray(cartItems), 'Length:', cartItems?.length);

        // If from checkout (cartItems provided), handle multiple items
        if (cartItems && Array.isArray(cartItems) && cartItems.length > 0) {
            const order = await prisma.$transaction(async (prisma) => {
                // Tạo đơn hàng
                const newOrder = await prisma.order.create({
                    data: {
                        userId: userId,
                        // ensure totalPrice is an integer (Prisma expects Int)
                        totalPrice: parseInt(vndAmount) || 0,
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

                // Record crypto transaction tied to the (active) admin wallet and this order
                try {
                    const activeWalletRecord = await prisma.cryptoWallet.findFirst({ where: { isActive: true } });
                    const toAddress = activeWalletRecord?.walletAddress || process.env.ADMIN_WALLET_ADDRESS || '';
                    // Find cryptocurrency by provided code (currency) or fallback to active
                    const cryptoRecord = (currency ? await prisma.cryptocurrency.findFirst({ where: { code: currency } }) : null) || await prisma.cryptocurrency.findFirst({ where: { isActive: true } }) || await prisma.cryptocurrency.findFirst();
                    if (cryptoRecord) {
                            await prisma.cryptoTransaction.create({
                                data: {
                                    transactionHash: transactionHash,
                                    fromAddress: req.body.fromAddress || '',
                                    toAddress: toAddress,
                                    amount: String(amount || ''),
                                    amountInFiat: Number(vndAmount) || 0,
                                    status: 'SUCCESS',
                                    description: `Payment for order ${newOrder.id}`,
                                    orderId: newOrder.id,
                                    cryptoId: cryptoRecord.id
                                }
                            });
                    } else {
                        console.warn('No cryptocurrency record found; skipping cryptoTransaction creation');
                    }
                } catch (txErr) {
                    console.warn('Failed to record cryptoTransaction:', txErr);
                }

                // Tạo chi tiết đơn hàng cho từng item
                for (const item of cartItems) {
                    const parsedId = parseInt(item.id, 10);
                    const cartItem = await prisma.cartdetail.findUnique({
                        where: { id: parsedId }
                    });

                    if (!cartItem) {
                        console.warn(`Cart detail not found for id=${item.id}`);
                        continue;
                    }

                    // Determine variant id: prefer sent value, fallback to cart record
                    let variantId = parseInt(item.productVariantId, 10);
                    if (isNaN(variantId) || variantId <= 0) {
                        variantId = cartItem.productVariantId;
                    }

                    // If still falsy (shouldn't happen because cartItem.productVariantId is non-null in schema), try to get a default variant for the product
                    if (!variantId) {
                        const defaultVariant = await prisma.productVariant.findFirst({ where: { productId: cartItem.productId } });
                        if (defaultVariant) variantId = defaultVariant.id;
                    }

                    let productVariant = null;
                    if (variantId) {
                        productVariant = await prisma.productVariant.findUnique({ where: { id: variantId } });
                    }

                    // Determine product id
                    const productId = productVariant ? productVariant.productId : cartItem.productId;
                    const product = await prisma.product.findUnique({ where: { id: productId } });

                    if (!product) {
                        console.warn(`Product not found for productId=${productId}`);
                        // still delete cart item to avoid blocking user next time
                        await prisma.cartdetail.delete({ where: { id: cartItem.id } });
                        continue;
                    }

                    const finalPrice = product.price + (productVariant && productVariant.priceMore ? productVariant.priceMore : 0);

                    // Create order detail
                    await prisma.orderDetail.create({
                        data: {
                            orderId: newOrder.id,
                            productId: product.id,
                            productVariantId: productVariant ? productVariant.id : cartItem.productVariantId,
                            quantity: cartItem.quantityProduct || 1,
                            price: finalPrice
                        }
                    });

                    // Update variant stock if variant exists
                    if (productVariant) {
                        await prisma.productVariant.update({
                            where: { id: productVariant.id },
                            data: {
                                quantity: { decrement: cartItem.quantityProduct || 1 },
                                sold: { increment: cartItem.quantityProduct || 1 }
                            }
                        });
                    }

                    // Update product stock as well (keeps aggregate in sync)
                    await prisma.product.update({
                        where: { id: product.id },
                        data: {
                            quantity: { decrement: cartItem.quantityProduct || 1 },
                            sold: { increment: cartItem.quantityProduct || 1 }
                        }
                    });

                    // Update cart total quantity
                    try {
                        await prisma.cart.update({
                            where: { id: cartItem.cartId },
                            data: {
                                quantity: { decrement: cartItem.quantityProduct || 1 }
                            }
                        });
                    } catch (e) {
                        // If cart update fails, log but continue - we still want to remove cartdetail
                        console.warn(`Failed to update cart quantity for cartId=${cartItem.cartId}:`, e);
                    }

                    // Delete item from cart
                    await prisma.cartdetail.delete({ where: { id: cartItem.id } });
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

                // Record crypto transaction for this single-product order
                try {
                    const activeWalletRecord = await prisma.cryptoWallet.findFirst({ where: { isActive: true } });
                    const toAddress = activeWalletRecord?.walletAddress || process.env.ADMIN_WALLET_ADDRESS || '';
                    const cryptoRecord = (currency ? await prisma.cryptocurrency.findFirst({ where: { code: currency } }) : null) || await prisma.cryptocurrency.findFirst({ where: { isActive: true } }) || await prisma.cryptocurrency.findFirst();
                    if (cryptoRecord) {
                        await prisma.cryptoTransaction.create({
                            data: {
                                transactionHash: transactionHash,
                                fromAddress: req.body.fromAddress || '',
                                toAddress: toAddress,
                                amount: String(amount || ''),
                                amountInFiat: Number(vndAmount) || 0,
                                status: 'SUCCESS',
                                description: `Payment for order ${newOrder.id}`,
                                orderId: newOrder.id,
                                cryptoId: cryptoRecord.id
                            }
                        });
                    } else {
                        console.warn('No cryptocurrency record found; skipping cryptoTransaction creation for product order');
                    }
                } catch (txErr) {
                    console.warn('Failed to record cryptoTransaction for product order:', txErr);
                }

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