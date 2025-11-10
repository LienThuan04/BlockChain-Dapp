import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type ActiveCryptoInfo = {
  code: string;
  name: string;
  symbol?: string | null;
  priceVND: number;
  decimals: number;
};

/**
 * Get the currently active cryptocurrency and its price in VND.
 * Falls back to Songbird (SGB) default if none active.
 */
export const getActiveCryptoInfo = async (): Promise<ActiveCryptoInfo> => {
  const active = await (prisma as any).cryptocurrency.findFirst({ where: { isActive: true } });
  if (!active) {
    return {
      code: 'SGB',
      name: 'Songbird',
      symbol: '⚡',
      priceVND: 8750,
      decimals: 18
    };
  }
  return {
    code: active.code,
    name: active.name,
    symbol: active.symbol || null,
    priceVND: Number(active.priceVND) || 8750,
    decimals: Number(active.decimals) || 18
  };
};

/**
 * Convert an amount in VND to cryptocurrency amount using active crypto price.
 * Returns a string formatted with up to `displayDecimals` (default 8) to show in UI.
 *
 * Example: convertVndToCrypto(50000, 8750) => '5.71428571' (if priceVND=8750)
 */
export const convertVndToCrypto = (
  amountVND: number,
  priceVND: number,
  decimals = 18,
  displayDecimals = 8
): string => {
  if (!amountVND || !isFinite(amountVND) || amountVND <= 0) return '0';
  const effectivePrice = (!priceVND || !isFinite(priceVND) || priceVND <= 0) ? 8750 : priceVND;
  const raw = amountVND / effectivePrice;
  // Limit displayed decimals to avoid huge strings for tokens with many decimals
  const fixed = raw.toFixed(displayDecimals);
  // Trim trailing zeros
  return fixed.replace(/\.0+$|0+$/,'').replace(/\.$/, '');
};

export default {
  getActiveCryptoInfo,
  convertVndToCrypto
};
