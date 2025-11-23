import { Request, Response } from 'express';
import { ActivateWalletById, addNewWalletAndActivate, DeactivateCurrentActiveWallet, DelWalletById, FindWalletById, GetActiveWallet, GetAllHistoryWallets, GetExistingWallet } from 'services/admin/WalletCrypto.service';

// Get wallet management page
export const getWalletManagementPage = async (req: Request, res: Response): Promise<void> => { // trang quản lý ví
    try {
        // lấy ví đang hoạt động
        const activeWallet = await GetActiveWallet();

        // Lấy lịch sử tất cả các ví
        const walletsHistory = await GetAllHistoryWallets();

        res.render('admin/crypto-wallet/management.ejs', {
            activeWallet: activeWallet,
            walletsHistory: walletsHistory,
            error: null
        });
    } catch (error: any) {
        console.error('Error in getWalletManagementPage:', error);
        res.status(500).render('admin/crypto-wallet/management.ejs', {
            activeWallet: null,
            walletsHistory: [],
            error: 'Có lỗi xảy ra: ' + error.message
        });
    }
};

// Add new wallet
export const addNewWallet = async (req: Request, res: Response): Promise<void> => { // thêm ví mới
    try {
        const { walletAddress, privateKey } = req.body;

        if (!walletAddress || !privateKey) {
            res.status(400).json({ error: 'Địa chỉ ví và private key là bắt buộc' });
            return;
        }

        // Validate wallet address format (Ethereum-like)
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            res.status(400).json({ error: 'Địa chỉ ví không hợp lệ (phải là 0x + 40 ký tự hex)' });
            return;
        }

        // kiem tra ví đã tồn tại chưa
        const existingWallet = await GetExistingWallet(walletAddress);

        if (existingWallet) {
            res.status(400).json({ error: 'Ví này đã được thêm rồi' });
            return;
        }

        // huy kích hoạt tất cả các ví hiện tại
        await DeactivateCurrentActiveWallet();

        // them ví mới và đặt làm hoạt động
        const newWallet = await addNewWalletAndActivate(walletAddress, privateKey);

        // Update environment variable (for runtime)
        process.env.ADMIN_WALLET_ADDRESS = walletAddress;

        res.json({
            success: true,
            message: 'Thêm ví mới thành công',
            wallet: {
                id: newWallet.id,
                walletAddress: newWallet.walletAddress,
                createdAt: newWallet.createdAt
            }
        });
    } catch (error: any) {
        console.error('Error in addNewWallet:', error);
        res.status(500).json({ error: error.message });
    }
};

// đổi ví hoạt động
export const switchActiveWallet = async (req: Request, res: Response): Promise<void> => { // chuyển ví hoạt động
    try {
        const { walletId } = req.body;

        if (!walletId) {
            res.status(400).json({ error: 'Mã ví là bắt buộc' });
            return;
        }

        // Tìm ví theo ID
        const wallet = await FindWalletById(parseInt(walletId));

        if (!wallet) {
            res.status(404).json({ error: 'Không tìm thấy ví' });
            return;
        }

        // huy kích hoạt tất cả các ví hiện tại
        await DeactivateCurrentActiveWallet();

        // kich hoạt ví đã chọn
        await ActivateWalletById(parseInt(walletId));

        // Update environment variable
        process.env.ADMIN_WALLET_ADDRESS = wallet.walletAddress;

        res.json({
            success: true,
            message: 'Chuyển ví thành công',
            wallet: {
                walletAddress: wallet.walletAddress,
                createdAt: wallet.createdAt
            }
        });
    } catch (error: any) {
        console.error('Error in switchActiveWallet:', error);
        res.status(500).json({ error: error.message });
    }
};

// Delete wallet
export const deleteWallet = async (req: Request, res: Response): Promise<void> => { // xóa ví
    try {
        const { walletId } = req.body;

        if (!walletId) {
            res.status(400).json({ error: 'Mã ví là bắt buộc' });
            return;
        }

        const wallet = await FindWalletById(parseInt(walletId));

        if (!wallet) {
            res.status(404).json({ error: 'Không tìm thấy ví' });
            return;
        }

        // Don't allow deleting active wallet
        if (wallet.isActive) {
            res.status(400).json({ error: 'Không thể xóa ví đang hoạt động' });
            return;
        }

        // Delete wallet
        await DelWalletById(parseInt(walletId));

        res.json({
            success: true,
            message: 'Xóa ví thành công'
        });
    } catch (error: any) {
        console.error('Error in deleteWallet:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get wallet details (show private key - be careful!)
export const getWalletDetails = async (req: Request, res: Response): Promise<void> => { // lấy chi tiết ví (hiện private key - cẩn thận!)
    try {
        const { walletId } = req.params;

        const wallet = await FindWalletById(parseInt(walletId));

        if (!wallet) {
            res.status(404).json({ error: 'Không tìm thấy ví' });
            return;
        }

        // Mask private key for security
        const maskedPrivateKey = wallet.privateKey.substring(0, 10) + '...' + wallet.privateKey.substring(wallet.privateKey.length - 10);

        res.json({
            id: wallet.id,
            walletAddress: wallet.walletAddress,
            privateKey: maskedPrivateKey,
            isActive: wallet.isActive,
            createdAt: wallet.createdAt,
            updatedAt: wallet.updatedAt
        });
    } catch (error: any) {
        console.error('Error in getWalletDetails:', error);
        res.status(500).json({ error: error.message });
    }
};
