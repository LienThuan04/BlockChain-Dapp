import { prisma } from "config/client";


// Get wallet management page
export const GetActiveWallet = async () => { // lấy ví đang hoạt động
    try {
        // lấy ví đang hoạt động
        const activeWallet = await prisma.cryptoWallet.findFirst({
            where: { isActive: true }
        });
        return activeWallet;
    } catch (error) {
        console.error('Error in GetActiveWallet:', error);
        throw error;
    }
};

export const GetAllHistoryWallets = async () => { // lấy lịch sử tất cả các ví
    try {
        // Lấy lịch sử tất cả các ví
        const walletsHistory = await prisma.cryptoWallet.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        return walletsHistory;
    } catch (error) {
        console.error('Error in GetAllHistoryWallets:', error);
        throw error;
    }
};


export const GetExistingWallet = async (walletAddress: string) => { // kiểm tra ví đã tồn tại chưa  
    try {
        if (!walletAddress) {
            throw new Error('Địa chỉ ví là bắt buộc');
        }
        const existingWallet = await prisma.cryptoWallet.findUnique({
            where: { walletAddress }
        });
        return existingWallet;
    } catch (error) {
        console.error('Error in GetExistingWallet:', error);
        throw error;
    }
};

export const DeactivateCurrentActiveWallet = async () => { // hủy kích hoạt ví hiện tại
    try {
        const result = await prisma.cryptoWallet.updateMany({
            where: { isActive: true },
            data: { isActive: false }
        });
        return result;
    } catch (error) {
        console.error('Error in DeactivateCurrentActiveWallet:', error);
        throw error;
    }
};

export const ActivateWalletById = async (walletId: number) => { // kích hoạt ví theo id
    try {
        if (!walletId) {
            throw new Error('Mã ví là bắt buộc');
        }
        const activatedWallet = await prisma.cryptoWallet.update({
            where: { id: walletId },
            data: { isActive: true }
        });
        return activatedWallet;
    } catch (error) {
        console.error('Error in ActivateWalletById:', error);
        throw error;
    }
};

export const addNewWalletAndActivate = async (walletAddress: string, privateKey: string) => { // thêm ví mới và đặt làm hoạt động
    try {
        if (!walletAddress || !privateKey) {
            throw new Error('Địa chỉ ví và private key là bắt buộc');
        }
        const newWallet = await prisma.cryptoWallet.create({
            data: {
                walletAddress,
                privateKey,
                isActive: true
            }
        });
        return newWallet;
    } catch (error) {
        console.error('Error in addNewWalletAndActivate:', error);
        throw error;
    }
};

export const FindWalletById = async (walletId: number) => { // tìm ví theo id
    try {
        if (!walletId) {
            throw new Error('Mã ví là bắt buộc');
        }
        const wallet = await prisma.cryptoWallet.findUnique({
            where: { id: walletId }
        });
        return wallet;
    } catch (error) {
        console.error('Error in FindWalletById:', error);
        throw error;
    }
};

export const DelWalletById = async (walletId: number) => { // xóa ví theo id
    try {
        if (!walletId) {
            throw new Error('Mã ví là bắt buộc');
        }
        const deletedWallet = await prisma.cryptoWallet.delete({
            where: { id: walletId }
        });
        return deletedWallet;
    } catch (error) {
        console.error('Error in DelWalletById:', error);
        throw error;
    }
};