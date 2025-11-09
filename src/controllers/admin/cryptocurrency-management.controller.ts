import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get cryptocurrency management page
export const getCryptocurrencyManagementPage = async (req: Request, res: Response): Promise<void> => {
    try {
        const cryptocurrencies = await (prisma as any).cryptocurrency.findMany({
            orderBy: { createdAt: 'desc' }
        });

        res.render('admin/cryptocurrency/management', {
            title: 'Cryptocurrency Management',
            cryptocurrencies
        });
    } catch (error) {
        console.error('Error getting cryptocurrency management page:', error);
        res.status(500).send('Internal Server Error');
    }
};

// Add new cryptocurrency
export const addCryptocurrency = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, code, symbol, priceVND, chainName, rpcUrl, chainId, contractAddress, decimals, description } = req.body;

        // Validate input
        if (!name || !code || !symbol || !chainName || !rpcUrl || !chainId) {
            res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin bắt buộc' });
            return;
        }

        // Check if code already exists
        const existingCrypto = await (prisma as any).cryptocurrency.findUnique({
            where: { code: code.toUpperCase() }
        });

        if (existingCrypto) {
            res.status(400).json({ error: 'Mã loại tiền ảo này đã tồn tại' });
            return;
        }

        // Create new cryptocurrency
        const newCrypto = await (prisma as any).cryptocurrency.create({
            data: {
                name,
                code: code.toUpperCase(),
                symbol,
                priceVND: parseFloat(priceVND) || 8750,
                chainName,
                rpcUrl,
                chainId,
                contractAddress: contractAddress || null,
                decimals: parseInt(decimals) || 18,
                description: description || null,
                isActive: false
            }
        });

        res.json({ success: true, message: 'Thêm loại tiền ảo thành công', crypto: newCrypto });
    } catch (error) {
        console.error('Error adding cryptocurrency:', error);
        res.status(500).json({ error: 'Có lỗi xảy ra' });
    }
};

// Set active cryptocurrency
export const setActiveCryptocurrency = async (req: Request, res: Response): Promise<void> => {
    try {
        const { cryptoId } = req.body;

        if (!cryptoId) {
            res.status(400).json({ error: 'ID loại tiền ảo không hợp lệ' });
            return;
        }

        // Deactivate all other cryptos
        await (prisma as any).cryptocurrency.updateMany({
            where: { id: { not: parseInt(cryptoId) } },
            data: { isActive: false }
        });

        // Activate selected crypto
        const activeCrypto = await (prisma as any).cryptocurrency.update({
            where: { id: parseInt(cryptoId) },
            data: { isActive: true }
        });

        res.json({ success: true, message: 'Kích hoạt loại tiền ảo thành công', crypto: activeCrypto });
    } catch (error) {
        console.error('Error setting active cryptocurrency:', error);
        res.status(500).json({ error: 'Có lỗi xảy ra' });
    }
};

// Update cryptocurrency details
export const updateCryptocurrency = async (req: Request, res: Response): Promise<void> => {
    try {
        const { cryptoId, priceVND } = req.body;

        if (!cryptoId) {
            res.status(400).json({ error: 'ID loại tiền ảo không hợp lệ' });
            return;
        }

        // Get current crypto
        const currentCrypto = await (prisma as any).cryptocurrency.findUnique({
            where: { id: parseInt(cryptoId) }
        });

        if (!currentCrypto) {
            res.status(404).json({ error: 'Loại tiền ảo không tồn tại' });
            return;
        }

        // Update only price for active crypto
        const updatedCrypto = await (prisma as any).cryptocurrency.update({
            where: { id: parseInt(cryptoId) },
            data: {
                priceVND: priceVND ? parseFloat(priceVND) : currentCrypto.priceVND
            }
        });

        res.json({ success: true, message: 'Cập nhật giá tiền ảo thành công', crypto: updatedCrypto });
    } catch (error) {
        console.error('Error updating cryptocurrency:', error);
        res.status(500).json({ error: 'Có lỗi xảy ra' });
    }
};

// Delete cryptocurrency
export const deleteCryptocurrency = async (req: Request, res: Response): Promise<void> => {
    try {
        const { cryptoId } = req.body;

        if (!cryptoId) {
            res.status(400).json({ error: 'ID loại tiền ảo không hợp lệ' });
            return;
        }

        // Get crypto to check if it's active
        const crypto = await (prisma as any).cryptocurrency.findUnique({
            where: { id: parseInt(cryptoId) }
        });

        if (!crypto) {
            res.status(404).json({ error: 'Loại tiền ảo không tồn tại' });
            return;
        }

        if (crypto.isActive) {
            res.status(400).json({ error: 'Không thể xóa loại tiền ảo đang được kích hoạt' });
            return;
        }

        // Check if crypto has transactions
        const transactionCount = await (prisma as any).cryptoTransaction.count({
            where: { cryptoId: parseInt(cryptoId) }
        });

        if (transactionCount > 0) {
            res.status(400).json({ error: 'Không thể xóa loại tiền ảo có giao dịch liên quan' });
            return;
        }

        // Delete cryptocurrency
        await (prisma as any).cryptocurrency.delete({
            where: { id: parseInt(cryptoId) }
        });

        res.json({ success: true, message: 'Xóa loại tiền ảo thành công' });
    } catch (error) {
        console.error('Error deleting cryptocurrency:', error);
        res.status(500).json({ error: 'Có lỗi xảy ra' });
    }
};

// Get active cryptocurrency (API endpoint)
export const getActiveCryptocurrency = async (req: Request, res: Response): Promise<void> => {
    try {
        const activeCrypto = await (prisma as any).cryptocurrency.findFirst({
            where: { isActive: true }
        });

        if (!activeCrypto) {
            // Return default SGB if no active crypto
            res.json({
                id: 0,
                name: 'Songbird',
                code: 'SGB',
                symbol: '⚡',
                chainName: 'Flare Coston Testnet',
                rpcUrl: 'https://coston-api.flare.network/ext/bc/C/rpc',
                chainId: '0x10',
                contractAddress: null,
                decimals: 18,
                isActive: false
            });
            return;
        }

        res.json(activeCrypto);
    } catch (error) {
        console.error('Error getting active cryptocurrency:', error);
        res.status(500).json({ error: 'Có lỗi xảy ra' });
    }
};

// Get cryptocurrency details
export const getCryptocurrencyDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const { cryptoId } = req.params;

        if (!cryptoId) {
            res.status(400).json({ error: 'ID loại tiền ảo không hợp lệ' });
            return;
        }

        const crypto = await (prisma as any).cryptocurrency.findUnique({
            where: { id: parseInt(cryptoId) }
        });

        if (!crypto) {
            res.status(404).json({ error: 'Loại tiền ảo không tồn tại' });
            return;
        }

        res.json(crypto);
    } catch (error) {
        console.error('Error getting cryptocurrency details:', error);
        res.status(500).json({ error: 'Có lỗi xảy ra' });
    }
};

// Get active cryptocurrency with price - for payment conversion
export const getActiveCryptocurrencyPrice = async (req: Request, res: Response): Promise<void> => {
    try {
        const activeCrypto = await (prisma as any).cryptocurrency.findFirst({
            where: { isActive: true }
        });

        if (!activeCrypto) {
            // Return default SGB if no active crypto found
            res.json({
                code: 'SGB',
                name: 'Songbird',
                symbol: '⚡',
                priceVND: 8750
            });
            return;
        }

        res.json({
            code: activeCrypto.code,
            name: activeCrypto.name,
            symbol: activeCrypto.symbol,
            priceVND: activeCrypto.priceVND
        });
    } catch (error) {
        console.error('Error getting cryptocurrency price:', error);
        res.status(500).json({ 
            error: 'Không thể lấy thông tin giá tiền ảo',
            defaultPriceVND: 8750 
        });
    }
};

export const getEditPage = async (req: Request, res: Response) => {
    try {
        const cryptoId = parseInt(req.params.id);
        
        const crypto = await (prisma as any).cryptocurrency.findUnique({
            where: { id: cryptoId }
        });
        
        if (!crypto) {
            return res.status(404).render('404', {
                message: 'Tiền ảo không tìm thấy'
            });
        }
        
        res.render('admin/cryptocurrency/edit', {
            title: 'Chỉnh sửa tiền ảo',
            crypto: crypto,
            isActive: crypto.isActive
        });
    } catch (error) {
        console.error('Error getting cryptocurrency edit page:', error);
        res.status(500).render('error', {
            message: 'Lỗi khi tải trang chỉnh sửa',
            error: error
        });
    }
};

