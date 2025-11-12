import { prisma } from 'config/client';
import { UserRole } from "types/index.dt";
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

                // When creating nested orderDetails, do NOT include the cart-detail IDs
                // (those are primary keys for cartdetail records). Prisma will attempt to
                // set the primary key if `id` is present and that causes UNIQUE PRIMARY errors.
                const orderDetailsCreateData = DataOrderCartDetail.map(({ id, ...rest }) => ({
                    price: rest.price,
                    quantity: rest.quantity,
                    productId: rest.productId,
                    productVariantId: rest.productVariantId
                }));

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
                            create: orderDetailsCreateData as any,
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

import { client as paypalClient } from 'config/paypal';

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
        return { success: false, message: 'Order not found' };
    }
    // Prepare refund result details to return to caller
    const refundResult: any = { attempted: false, method: null, success: false, txHash: null, message: '' };
    // If paid via PayPal, attempt refund
    try {
    if (String(order.paymentMethod || '').toUpperCase() === 'PAYPAL' && (order.paymentStatus === 'PAYMENT_PAID' || order.paymentStatus === 'PAID') && order.paymentRef) {
            // paymentRef may contain 'PayPalCapture:<captureId>' or 'PayPalOrder:<orderId>'
            const ref = order.paymentRef as string;
            const captureMatch = ref.match(/PayPalCapture:?(.*)/i);
            const captureId = captureMatch ? captureMatch[1] : null;
            if (captureId) {
                try {
                    const refundReq = new (require('@paypal/checkout-server-sdk').payments.CapturesRefundRequest)(captureId);
                    // PayPal SDK typings require a request body; an empty body is acceptable for full refund in many cases
                    (refundReq as any).requestBody({});
                    const refundResp = await paypalClient.execute(refundReq);
                    console.log('PayPal refund response for order', orderId, JSON.stringify(refundResp?.result));
                    // update paymentStatus
                    await prisma.order.update({ where: { id: orderId }, data: { paymentStatus: 'REFUNDED' } });
                    refundResult.attempted = true;
                    refundResult.method = 'PAYPAL';
                    refundResult.success = true;
                    refundResult.message = 'PayPal refund successful';
                } catch (refundErr) {
                    console.error('Error refunding PayPal capture for order', orderId, refundErr);
                    // proceed to cancel but keep paymentStatus as-is or mark as REFUND_FAILED
                    await prisma.order.update({ where: { id: orderId }, data: { paymentStatus: 'REFUND_FAILED' } });
                    refundResult.attempted = true;
                    refundResult.method = 'PAYPAL';
                    refundResult.success = false;
                    (refundResult as any).message = String((refundErr as any)?.message || refundErr);
                }
            }
        }
    } catch (e) {
        console.error('Unexpected error during refund process for order', orderId, e);
    }

    // If paid via CRYPTO, attempt on-chain refund from active admin wallet to buyer
    try {
    // Only attempt an on-chain crypto refund when the original payment method
    // was explicitly CRYPTO and the order shows a paid status. This avoids
    // attempting or announcing crypto refunds for non-crypto orders that
    // happen to have a generic 'PAID' flag.
    if (String(order.paymentMethod || '').toUpperCase() === 'CRYPTO' && (order.paymentStatus === 'PAID' || order.paymentStatus === 'PAYMENT_PAID')) {
            console.log('🔄 [REFUND] Starting crypto refund for order', orderId);
            const origTx = await prisma.cryptoTransaction.findFirst({ where: { orderId: order.id }, include: { cryptocurrency: true } });
            if (origTx && origTx.fromAddress) {
                const buyerAddress = origTx.fromAddress;
                const amountStr = origTx.amount || '0';
                console.log('💰 [REFUND] Buyer address:', buyerAddress, 'Amount:', amountStr);
                const cryptoMeta = origTx.cryptocurrency;
                const rpc = cryptoMeta?.rpcUrl || process.env.ETH_NODE_URL || 'http://localhost:8545';
                console.log('🌐 [REFUND] RPC:', rpc);
                const decimals = cryptoMeta?.decimals ?? 18;

                // Get admin active wallet with privateKey
                const activeWalletRecord = await prisma.cryptoWallet.findFirst({ where: { isActive: true } });
                console.log('🔑 [REFUND] Admin wallet found:', !!activeWalletRecord);
                if (!activeWalletRecord || !activeWalletRecord.privateKey) {
                    console.error('❌ [REFUND] No active admin wallet or privateKey available');
                } else {
                    const adminPrivateKey = activeWalletRecord.privateKey;
                    const adminAddress = activeWalletRecord.walletAddress;
                    console.log('👛 [REFUND] Admin address:', adminAddress);

                    try {
                        const Web3 = require('web3');
                        const web3 = new Web3(rpc);
                        console.log('✅ [REFUND] Web3 instance created');

                        // helper: convert decimal string amount to integer base units (BigInt)
                        function amountToBase(amountDecimalStr: string, dec: number) {
                            const parts = amountDecimalStr.split('.');
                            const intPart = parts[0] || '0';
                            const fracPart = parts[1] || '';
                            const fracPadded = (fracPart + '0'.repeat(dec)).slice(0, dec);
                            const baseStr = intPart + fracPadded;
                            // remove leading zeros
                            return BigInt(baseStr.replace(/^0+/, '') || '0');
                        }

                        const baseAmount = amountToBase(amountStr, decimals);
                        console.log('📊 [REFUND] Amount conversion:', amountStr, '->', baseAmount.toString(), 'with', decimals, 'decimals');

                        console.log('🔄 Crypto refund: Getting nonce and gas price...');
                        const nonce = await web3.eth.getTransactionCount(adminAddress, 'pending');
                        const gasPrice = await web3.eth.getGasPrice();
                        console.log('⛽ Nonce:', nonce, 'GasPrice:', gasPrice);
                        
                        const txParams: any = {
                            from: adminAddress,
                            to: buyerAddress,
                            value: web3.utils.toHex(baseAmount.toString()),
                            nonce: web3.utils.toHex(nonce),
                            gasPrice: web3.utils.toHex(gasPrice),
                            gas: web3.utils.toHex(21000)
                        };
                        console.log('📝 TX Params:', { from: txParams.from, to: txParams.to, value: txParams.value, gas: txParams.gas });

                        // Ensure privateKey has 0x prefix
                        const pkForSigning = adminPrivateKey.startsWith('0x') ? adminPrivateKey : '0x' + adminPrivateKey;
                        console.log('🔐 Signing transaction...');
                        const signed = await web3.eth.accounts.signTransaction(txParams, pkForSigning);
                        if (!signed.rawTransaction) throw new Error('Failed to sign refund transaction');
                        console.log('✅ Signed successfully');

                        const dataObj: any = {
                            transactionHash: `refund_${Date.now()}_${order.id}`,
                            fromAddress: adminAddress,
                            toAddress: buyerAddress,
                            amount: String(amountStr),
                            amountInFiat: Number(order.totalPrice) || 0,
                            status: 'PENDING',
                            description: `Refund for order ${order.id}`,
                            orderId: order.id
                        };
                        if (cryptoMeta && cryptoMeta.id) dataObj.cryptoId = cryptoMeta.id;
                        console.log('💾 Creating refund record...');
                        const refundRecord = await prisma.cryptoTransaction.create({ data: dataObj });
                        console.log('✅ Refund record created, ID:', refundRecord.id);

                        console.log('📤 Sending signed transaction...');
                        const sendReceipt = await web3.eth.sendSignedTransaction(signed.rawTransaction as string);
                        console.log('✅ Transaction receipt:', sendReceipt.transactionHash);

                        await prisma.cryptoTransaction.update({ where: { id: refundRecord.id }, data: { transactionHash: sendReceipt.transactionHash || '', status: 'SUCCESS' } });
                        refundResult.attempted = true;
                        refundResult.method = 'CRYPTO';
                        refundResult.success = true;
                        (refundResult as any).txHash = sendReceipt.transactionHash || null;
                        (refundResult as any).message = 'Crypto refund successful';
                        // Mark original transaction as REFUNDED
                        if (origTx) {
                            await prisma.cryptoTransaction.update({ where: { id: origTx.id }, data: { status: 'REFUNDED' } });
                            console.log('📝 [REFUND] Original transaction marked as REFUNDED');
                        }
                        await prisma.order.update({ where: { id: orderId }, data: { paymentStatus: 'REFUNDED' } });
                        console.log('✅ Refund complete! Order', orderId, 'refunded to', buyerAddress, 'TxHash:', sendReceipt.transactionHash);
                    } catch (txErr) {
                        console.error('❌ Error sending refund transaction for order', orderId, ':', txErr instanceof Error ? txErr.message : txErr);
                        if (txErr instanceof Error) console.error('Stack:', txErr.stack);
                        await prisma.order.update({ where: { id: orderId }, data: { paymentStatus: 'REFUND_FAILED' } });
                        refundResult.attempted = true;
                        refundResult.method = 'CRYPTO';
                        refundResult.success = false;
                        (refundResult as any).message = String((txErr as any)?.message || txErr);
                    }
                }
            } else {
                console.warn('⚠️ [REFUND] No original crypto transaction or buyer address found for order', orderId);
            }
        }
    } catch (cryptoErr) {
        console.error('❌ [REFUND] Unexpected error during crypto refund for order', orderId, ':', cryptoErr instanceof Error ? cryptoErr.message : cryptoErr);
        if (cryptoErr instanceof Error && cryptoErr.message.includes('Cannot find module')) {
            console.error('⚠️ Make sure web3 npm package is installed: npm install web3 --legacy-peer-deps');
        }
        // record crypto error
    refundResult.attempted = refundResult.attempted || false;
    refundResult.method = refundResult.method || 'CRYPTO';
    refundResult.success = refundResult.success || false;
    (refundResult as any).message = (refundResult as any).message || String((cryptoErr as any)?.message || cryptoErr);
    }

    // Restore product quantities and mark order cancelled
    try {
        // For each order detail, increment product/variant stock and decrement sold
        for (const od of order.orderDetails) {
            const qty = od.quantity || 0;
            // update product
            await prisma.product.update({ where: { id: od.productId }, data: { quantity: { increment: qty }, sold: { decrement: qty } } });
            // update variant if exists
            if (od.productVariantId) {
                await prisma.productVariant.update({ where: { id: od.productVariantId }, data: { quantity: { increment: qty }, sold: { decrement: qty } } });
            }
        }
    } catch (stockErr) {
        console.error('Error restoring product quantities for cancelled order', orderId, stockErr);
    }

    // Mark order as cancelled
    await prisma.order.update({ where: { id: orderId }, data: { statusOrder: 'CANCELLED' } });
    return { success: true, refund: refundResult };
};

export {
    PostClientToUpdateAcc, AddProductToCart, GetProductByCartDetail,
    DelProductFromCart, UpdateQuantityBeforeCheckout, PlaceOrder,
    GetOrderHistoryForUser, GetDetailHistoryById, ChangeUserPassword,
    FindCartForUserId, PostReviewProductToHistory, GetReviewedFormUser,
    CancelOrderById, 

};
