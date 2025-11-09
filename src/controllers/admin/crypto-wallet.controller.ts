import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get admin crypto wallet info
export const getCryptoWalletPage = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminWallet = process.env.ADMIN_WALLET_ADDRESS;
        
        if (!adminWallet) {
            res.status(400).render('admin/crypto-wallet/index.ejs', {
                error: 'Admin wallet chưa được cấu hình',
                balance: '0',
                transactions: [],
                nativeCurrency: 'SGB',
                walletAddress: 'N/A',
                balanceInSGB: '0',
                totalTransactions: 0,
                totalReceived: 0,
                totalReceivedSGB: '0'
            });
            return;
        }

        // Get crypto payment transactions from database
        const transactions = await prisma.order.findMany({
            where: {
                paymentMethod: 'CRYPTO',
                paymentStatus: 'PAID'
            },
            include: {
                User: {
                    select: {
                        email: true,
                        fullName: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 50
        });

        // Format transactions for display
        const formattedTransactions = transactions.map((tx: any) => ({
            orderId: tx.id,
            userEmail: tx.User?.email || 'N/A',
            userName: tx.User?.fullName || 'N/A',
            amount: (tx.totalPrice / 300000).toFixed(4), // Convert VND to SGB
            vndAmount: tx.totalPrice,
            transactionHash: tx.paymentRef,
            status: tx.statusOrder,
            createdAt: new Date(tx.createdAt).toLocaleString('vi-VN')
        }));

        // Calculate total received
        const totalReceived = transactions.reduce((sum, tx) => sum + tx.totalPrice, 0);
        const totalReceivedSGB = (totalReceived / 300000).toFixed(4);
        
        // For demo purposes, show balance from latest transactions or 0
        // In real implementation, you would fetch from blockchain
        const balanceInSGB = totalReceivedSGB;

        res.render('admin/crypto-wallet/index.ejs', {
            walletAddress: adminWallet,
            balance: '0',
            balanceInSGB: balanceInSGB,
            nativeCurrency: 'SGB',
            transactions: formattedTransactions,
            totalTransactions: transactions.length,
            totalReceived: totalReceived,
            totalReceivedSGB: totalReceivedSGB,
            error: null
        });
    } catch (error: any) {
        console.error('Error in getCryptoWalletPage:', error);
        res.status(500).render('admin/crypto-wallet/index.ejs', {
            error: 'Có lỗi xảy ra: ' + error.message,
            balance: '0',
            transactions: [],
            nativeCurrency: 'SGB',
            walletAddress: 'N/A',
            balanceInSGB: '0',
            totalTransactions: 0,
            totalReceived: 0,
            totalReceivedSGB: '0'
        });
    }
};

// Export wallet data as CSV
export const exportCryptoTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
        const transactions = await prisma.order.findMany({
            where: {
                paymentMethod: 'CRYPTO',
                paymentStatus: 'PAID'
            },
            include: {
                User: {
                    select: {
                        email: true,
                        fullName: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Create CSV content
        let csv = 'Mã Đơn,Người Dùng,Email,Số Tiền (VND),Số Tiền (SGB),Hash Giao Dịch,Ngày Tạo\n';
        
        transactions.forEach((tx: any) => {
            const sgbAmount = (tx.totalPrice / 300000).toFixed(4);
            const createdAt = new Date(tx.createdAt).toLocaleString('vi-VN');
            csv += `${tx.id},"${tx.User?.fullName || 'N/A'}","${tx.User?.email || 'N/A'}",${tx.totalPrice},${sgbAmount},"${tx.paymentRef}","${createdAt}"\n`;
        });

        // Send CSV file
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="crypto-transactions.csv"');
        res.send(csv);
    } catch (error: any) {
        console.error('Error exporting transactions:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get transaction details
export const getTransactionDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const { orderId } = req.params;

        const order = await prisma.order.findUnique({
            where: { id: parseInt(orderId) },
            include: {
                User: true,
                orderDetails: {
                    include: {
                        product: true
                    }
                }
            }
        });

        if (!order) {
            res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
            return;
        }

        res.json({
            orderId: order.id,
            user: {
                id: order.userId,
                email: (order as any).User?.email,
                fullName: (order as any).User?.fullName
            },
            receiver: {
                name: order.receiverName,
                phone: order.receiverPhone,
                address: order.receiverAddress,
                email: order.receiverEmail,
                note: order.receiverNote
            },
            payment: {
                method: order.paymentMethod,
                status: order.paymentStatus,
                totalPrice: order.totalPrice,
                sgbAmount: (order.totalPrice / 300000).toFixed(4),
                transactionHash: order.paymentRef
            },
            orderDetails: ((order as any).orderDetails || []).map((item: any) => ({
                id: item.id,
                quantity: item.quantity,
                price: item.price,
                productName: item.product?.name || 'N/A'
            })),
            createdAt: order.createdAt,
            updatedAt: order.updatedAt
        });
    } catch (error: any) {
        console.error('Error getting transaction details:', error);
        res.status(500).json({ error: error.message });
    }
};
