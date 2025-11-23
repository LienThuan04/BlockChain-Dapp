import { prisma } from "config/client";

// lấy các giao dịch crypto liên quan đến ví quản trị hiện active
export const GetCryptoTransactionsForAdminWallet = async (adminWallet: string, exchangeRate?: number, activeCrypto?: any) => {
    try {
        if (!adminWallet) {
            throw new Error('Địa chỉ ví quản trị là bắt buộc');
        }
        // Truy vấn các bản ghi CryptoTransaction đã được gửi ĐẾN địa chỉ ví quản trị này
        // Điều này liên kết lịch sử giao dịch với ví đã chọn (toAddress)
        const txs = await prisma.cryptoTransaction.findMany({
            where: { toAddress: adminWallet },
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
        return txs;
    } catch (error) {
        console.error('Error in GetCryptoTransactionsForAdminWallet:', error);
        throw error;
    }
};
// lấy giao dịch crypto theo ID đơn hàng
export const GetCryptoTransactionByOrderId = async (orderId: number) => { // lấy giao dịch crypto theo ID đơn hàng
    try {
        if (!orderId) {
            throw new Error('Mã giao dịch là bắt buộc');
        }
        const transaction = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                User: true,
                orderDetails: {
                    include: {
                        product: true
                    }
                }
            }
        });
        return transaction;
    } catch (error) {
        console.error('Error in GetCryptoTransactionById:', error);
        throw error;
    }
};
// lấy chi tiết giao dịch crypto cho đơn hàng
export const getTransactionDetailsForOrder = async (orderId: number) => {  // lấy chi tiết giao dịch crypto cho đơn hàng
    try {
        if (!orderId) {
            throw new Error('Mã đơn hàng là bắt buộc');
        }
        const cryptoTx = await prisma.cryptoTransaction.findFirst({
            where: { orderId: orderId },
            include: { cryptocurrency: true }
        });
        return cryptoTx;
    } catch (error) {
        console.error('Error in getTransactionDetailsForOrder:', error);
        throw error;
    }
};

// đếm số giao dich nao co lien quan den crypto id đó không
export const CountCryptoTransactionsForAdminWallet = async (cryptoId: number) => {
    try {
        if (!cryptoId) {
            throw new Error('ID loại tiền ảo là bắt buộc');
        }
        const count = await prisma.cryptoTransaction.count({
            where: { cryptoId: cryptoId }
        });
        return count;
    } catch (error) {
        console.error('Error in CountCryptoTransactionsForAdminWallet:', error);
        throw error;
    }
};