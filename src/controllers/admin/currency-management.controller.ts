import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get currency management page
export const getCurrencyManagementPage = async (req: Request, res: Response): Promise<void> => {
    try {
        const currencies = await (prisma as any).currencyRate.findMany({
            orderBy: { createdAt: 'desc' }
        });

        const activeCurrency = currencies.find((c: any) => c.isActive);

        res.render('admin/currency/management.ejs', {
            currencies,
            activeCurrency,
            error: null
        });
    } catch (error: any) {
        console.error('Error in getCurrencyManagementPage:', error);
        res.status(500).render('admin/currency/management.ejs', {
            currencies: [],
            activeCurrency: null,
            error: 'Có lỗi xảy ra: ' + error.message
        });
    }
};

// Add new currency
export const addCurrency = async (req: Request, res: Response): Promise<void> => {
    try {
        const { currencyCode, currencyName, exchangeRate, symbol } = req.body;

        if (!currencyCode || !currencyName || !exchangeRate || !symbol) {
            res.status(400).json({ error: 'Tất cả trường đều là bắt buộc' });
            return;
        }

        // Validate exchange rate
        if (isNaN(parseFloat(exchangeRate)) || parseFloat(exchangeRate) <= 0) {
            res.status(400).json({ error: 'Tỷ giá phải là số dương' });
            return;
        }

        // Check if currency code already exists
        const existingCurrency = await (prisma as any).currencyRate.findUnique({
            where: { currencyCode: currencyCode.toUpperCase() }
        });

        if (existingCurrency) {
            res.status(400).json({ error: 'Mã loại tiền này đã tồn tại' });
            return;
        }

        // Add new currency
        const newCurrency = await (prisma as any).currencyRate.create({
            data: {
                currencyCode: currencyCode.toUpperCase(),
                currencyName,
                exchangeRate: parseFloat(exchangeRate),
                symbol
            }
        });

        res.json({
            success: true,
            message: 'Thêm loại tiền mới thành công',
            currency: newCurrency
        });
    } catch (error: any) {
        console.error('Error in addCurrency:', error);
        res.status(500).json({ error: error.message });
    }
};

// Set active currency
export const setActiveCurrency = async (req: Request, res: Response): Promise<void> => {
    try {
        const { currencyId } = req.body;

        if (!currencyId) {
            res.status(400).json({ error: 'Mã loại tiền là bắt buộc' });
            return;
        }

        // Get currency to activate
        const currency = await (prisma as any).currencyRate.findUnique({
            where: { id: parseInt(currencyId) }
        });

        if (!currency) {
            res.status(404).json({ error: 'Không tìm thấy loại tiền' });
            return;
        }

        // Deactivate all currencies
        await (prisma as any).currencyRate.updateMany({
            data: { isActive: false }
        });

        // Activate selected currency
        await (prisma as any).currencyRate.update({
            where: { id: parseInt(currencyId) },
            data: { isActive: true }
        });

        // Update environment variable
        process.env.ACTIVE_CURRENCY_CODE = currency.currencyCode;
        process.env.ACTIVE_EXCHANGE_RATE = currency.exchangeRate.toString();

        res.json({
            success: true,
            message: 'Thay đổi loại tiền thành công',
            currency: {
                code: currency.currencyCode,
                name: currency.currencyName,
                exchangeRate: currency.exchangeRate
            }
        });
    } catch (error: any) {
        console.error('Error in setActiveCurrency:', error);
        res.status(500).json({ error: error.message });
    }
};

// Update currency exchange rate
export const updateExchangeRate = async (req: Request, res: Response): Promise<void> => {
    try {
        const { currencyId, exchangeRate } = req.body;

        if (!currencyId || !exchangeRate) {
            res.status(400).json({ error: 'Mã loại tiền và tỷ giá là bắt buộc' });
            return;
        }

        // Validate exchange rate
        if (isNaN(parseFloat(exchangeRate)) || parseFloat(exchangeRate) <= 0) {
            res.status(400).json({ error: 'Tỷ giá phải là số dương' });
            return;
        }

        const currency = await (prisma as any).currencyRate.findUnique({
            where: { id: parseInt(currencyId) }
        });

        if (!currency) {
            res.status(404).json({ error: 'Không tìm thấy loại tiền' });
            return;
        }

        // Update exchange rate
        const updatedCurrency = await (prisma as any).currencyRate.update({
            where: { id: parseInt(currencyId) },
            data: { exchangeRate: parseFloat(exchangeRate) }
        });

        // If this is active currency, update env variable
        if (updatedCurrency.isActive) {
            process.env.ACTIVE_EXCHANGE_RATE = updatedCurrency.exchangeRate.toString();
        }

        res.json({
            success: true,
            message: 'Cập nhật tỷ giá thành công',
            currency: updatedCurrency
        });
    } catch (error: any) {
        console.error('Error in updateExchangeRate:', error);
        res.status(500).json({ error: error.message });
    }
};

// Delete currency
export const deleteCurrency = async (req: Request, res: Response): Promise<void> => {
    try {
        const { currencyId } = req.body;

        if (!currencyId) {
            res.status(400).json({ error: 'Mã loại tiền là bắt buộc' });
            return;
        }

        const currency = await (prisma as any).currencyRate.findUnique({
            where: { id: parseInt(currencyId) }
        });

        if (!currency) {
            res.status(404).json({ error: 'Không tìm thấy loại tiền' });
            return;
        }

        // Don't allow deleting active currency
        if (currency.isActive) {
            res.status(400).json({ error: 'Không thể xóa loại tiền đang hoạt động' });
            return;
        }

        // Delete currency
        await (prisma as any).currencyRate.delete({
            where: { id: parseInt(currencyId) }
        });

        res.json({
            success: true,
            message: 'Xóa loại tiền thành công'
        });
    } catch (error: any) {
        console.error('Error in deleteCurrency:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get active currency API
export const getActiveCurrency = async (req: Request, res: Response): Promise<void> => {
    try {
        // Get active cryptocurrency instead of currency rate
        const activeCrypto = await (prisma as any).cryptocurrency.findFirst({
            where: { isActive: true }
        });

        if (!activeCrypto) {
            res.status(404).json({ error: 'Không có loại tiền nào được kích hoạt' });
            return;
        }

        res.json({
            code: activeCrypto.code,
            name: activeCrypto.name,
            price: activeCrypto.price,
            symbol: activeCrypto.symbol
        });
    } catch (error: any) {
        console.error('Error in getActiveCurrency:', error);
        res.status(500).json({ error: error.message });
    }
};
