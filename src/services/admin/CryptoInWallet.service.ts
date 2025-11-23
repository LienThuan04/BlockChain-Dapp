import { prisma } from "config/client";

// lấy cryptocurrency đang hoạt động
export const GetActiveCryptocurrency = async () => { // lấy cryptocurrency đang hoạt động
    try {
        const activeCrypto = await prisma.cryptocurrency.findFirst({
            where: { isActive: true }
        });
        return activeCrypto;
    } catch (error) {
        console.error('Error in GetActiveCryptocurrency:', error);
        throw error;
    }
};
// lấy tất cả các loại tiền ảo
export const GetAllCurencies = async () => { // lấy tất cả các loại tiền ảo
    try {
        const allCryptos = await prisma.cryptocurrency.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return allCryptos;
    } catch (error) {
        console.error('Error in GetAllCurencies:', error);
        throw error;
    }
};
// kiểm tra mã loại tiền ảo đã tồn tại chưa
export const GetExistingCryptoByCode = async (code: string) => { // kiểm tra mã loại tiền ảo đã tồn tại chưa
    try {
        if (!code) {
            throw new Error('Mã loại tiền ảo là bắt buộc');
        }
        const existingCrypto = await prisma.cryptocurrency.findUnique({
            where: { code }
        });
        return existingCrypto;
    } catch (error) {
        console.error('Error in GetExistingCryptoByCode:', error);
        throw error;
    }
};
// tạo loại tiền ảo mới
export const CreateNewCryptocurrency = async (data: {name: string, code: string, symbol: string, priceVND: string, chainName: string, rpcUrl: string, chainId: string, contractAddress?: string, decimals?: string, description?: string})  => { // tạo loại tiền ảo mới
    try {
        const newCrypto = await prisma.cryptocurrency.create({
            data: {
                name: data.name,
                code: data.code.toUpperCase(),
                symbol: data.symbol,
                priceVND: parseFloat(data.priceVND) || 8750,
                chainName: data.chainName,
                rpcUrl: data.rpcUrl,
                chainId: data.chainId,
                contractAddress: data.contractAddress || null,
                decimals: parseInt(data.decimals || "18"),
                description: data.description || null,
                isActive: false
            }
        });
        return newCrypto;
    } catch (error) {
        console.error('Error in CreateNewCryptocurrency:', error);
        throw error;
    }   
};
// huy kích hoạt tất cả các loại tiền ảo khác với id không phải là cryptoId đưa vào
export const DeactivateOtherCryptocurrencies = async (cryptoId: number) => {
    try {
        const result = await prisma.cryptocurrency.updateMany({
            where: { id: { not: cryptoId } },
            data: { isActive: false }
        });
        return result;
    } catch (error) {
        console.error('Error in DeactivateOtherCryptocurrencies:', error);
        throw error;
    }
};

//kich hoạt loại tiền ảo theo id
export const ActivateCryptocurrencyById = async (cryptoId: number) => { 
    try {
        if (!cryptoId) {
            throw new Error('Mã loại tiền ảo là bắt buộc');
        }
        const activatedCrypto = await prisma.cryptocurrency.update({
            where: { id: cryptoId },
            data: { isActive: true }
        });
        return activatedCrypto;
    } catch (error) {
        console.error('Error in ActivateCryptocurrencyById:', error);
        throw error;
    }
};

// Lấy thông tin loại tiền ảo với id 
export const GetCryptocurrencyById = async (cryptoId: number) => { 
    try {
        if (!cryptoId) {
            throw new Error('Mã loại tiền ảo là bắt buộc');
        }
        const crypto = await prisma.cryptocurrency.findUnique({
            where: { id: cryptoId }
        });
        return crypto;
    } catch (error) {
        console.error('Error in GetCryptocurrencyById:', error);
        throw error;
    }
};
// cập nhật giá tiền ảo cho loại tiền ảo theo id
export const UpdateCryptocurrencyPriceById = async (cryptoId: number, newPriceVND: number) => { // cập nhật giá tiền ảo
    try {
        if (!cryptoId) {
            throw new Error('Mã loại tiền ảo là bắt buộc');
        }
        if (newPriceVND <= 0 || isNaN(newPriceVND)) {
            throw new Error('Giá tiền ảo phải lớn hơn 0');
        }
        const updatedCrypto = await prisma.cryptocurrency.update({
            where: { id: cryptoId },
            data: { priceVND: newPriceVND }
        });
        return updatedCrypto;
    } catch (error) {
        console.error('Error in UpdateCryptocurrencyPriceById:', error);
        throw error;
    }
};

// xoa loại tiền ảo theo id
export const DeleteCryptocurrencyById = async (cryptoId: number) => { 
    try {
        if (!cryptoId) {
            throw new Error('Mã loại tiền ảo là bắt buộc');
        }
        const deletedCrypto = await prisma.cryptocurrency.delete({
            where: { id: cryptoId }
        });
        return deletedCrypto;
    } catch (error) {
        console.error('Error in DeleteCryptocurrencyById:', error);
        throw error;
    }
};

