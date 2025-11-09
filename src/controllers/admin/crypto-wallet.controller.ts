import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get admin crypto wallet info
export const getCryptoWalletPage = async (req: Request, res: Response): Promise<void> => {
    try {
        // Prefer active wallet from DB so switching wallets immediately reflects in the UI
        const activeWalletRecord = await prisma.cryptoWallet.findFirst({ where: { isActive: true } });
        const adminWallet = activeWalletRecord?.walletAddress || process.env.ADMIN_WALLET_ADDRESS;

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

        // Get active cryptocurrency to get current exchange rate
        const activeCrypto = await prisma.cryptocurrency.findFirst({ where: { isActive: true } });
        const exchangeRate = activeCrypto?.priceVND || 8750; // Default: 1 SGB = 8,750 VND
        console.log('Using exchange rate:', exchangeRate, 'VND per SGB');

        // Query CryptoTransaction records that were sent TO this admin wallet address
        // This ties transaction history to the selected wallet (toAddress)
        const txs = await prisma.cryptoTransaction.findMany({
            where: {
                toAddress: adminWallet
            },
            include: {
                order: {
                    include: {
                        User: true
                    }
                },
                cryptocurrency: true
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        // Format transactions for display. Prefer amountInFiat if recorded, otherwise compute from amount
        const formattedTransactions = txs.map((tx: any) => ({
            orderId: tx.orderId,
            userEmail: tx.order?.User?.email || 'N/A',
            userName: tx.order?.User?.fullName || 'N/A',
            amount: tx.amount, // crypto amount (string)
            vndAmount: tx.amountInFiat ?? (Number(tx.amount || 0) * exchangeRate),
            transactionHash: tx.transactionHash,
            status: tx.status,
            createdAt: new Date(tx.createdAt).toLocaleString('vi-VN'),
            currency: tx.cryptocurrency?.code || activeCrypto?.code || 'SGB'
        }));

        // Calculate total received for this wallet
        const totalReceived = txs.reduce((sum: number, tx: any) => sum + (tx.amountInFiat ?? Number(tx.amount || 0) * exchangeRate), 0);
        const totalReceivedSGB = (totalReceived / exchangeRate).toFixed(4);

        // For demo purposes, show balance from latest transactions or 0
        const balanceInSGB = totalReceivedSGB;

        res.render('admin/crypto-wallet/index.ejs', {
            walletAddress: adminWallet,
            balance: '0',
            balanceInSGB: balanceInSGB,
            nativeCurrency: activeCrypto?.code || 'SGB',
            transactions: formattedTransactions,
            totalTransactions: txs.length,
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
        // Prefer active wallet from DB (if any)
        const activeWalletRecord = await prisma.cryptoWallet.findFirst({ where: { isActive: true } });
        const adminWallet = activeWalletRecord?.walletAddress || process.env.ADMIN_WALLET_ADDRESS;

        const txs = await prisma.cryptoTransaction.findMany({
            where: adminWallet ? { toAddress: adminWallet } : {},
            include: {
                order: {
                    include: {
                        User: true
                    }
                },
                cryptocurrency: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Create CSV content
        let csv = 'Mã Giao Dịch, Mã Đơn,Người Dùng,Email,Số Tiền (Crypto),Số Tiền (VND),Mã Token/Currency,Hash Giao Dịch,Ngày Tạo\n';
        
        txs.forEach((tx: any) => {
            const sgbAmount = tx.amount || '';
            const vnd = tx.amountInFiat ?? '';
            const createdAt = new Date(tx.createdAt).toLocaleString('vi-VN');
            csv += `${tx.id},${tx.orderId},"${tx.order?.User?.fullName || 'N/A'}","${tx.order?.User?.email || 'N/A'}",${sgbAmount},${vnd},"${tx.cryptocurrency?.code || ''}","${tx.transactionHash}","${createdAt}"\n`;
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

        // Get crypto transaction for this order to get actual SGB amount
        const cryptoTx = await prisma.cryptoTransaction.findFirst({
            where: { orderId: order.id },
            include: { cryptocurrency: true }
        });

        // Get exchange rate from active cryptocurrency
        const activeCrypto = await prisma.cryptocurrency.findFirst({ where: { isActive: true } });
        const exchangeRate = activeCrypto?.priceVND || 8750;

        // Use actual amount from crypto transaction, or calculate from total price
        const sgbAmount = cryptoTx?.amount || (order.totalPrice / exchangeRate).toFixed(4);

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
                sgbAmount: sgbAmount,
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
