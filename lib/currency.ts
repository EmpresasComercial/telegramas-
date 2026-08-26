export type CurrencyType = 'KZ' | 'USDT';

const USDT_RATE = 1100; // 1 USDT = 1100 KZ

export const formatCurrency = (val: number, currency: CurrencyType) => {
  if (currency === 'KZ') {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kz';
  } else {
    const usdtVal = val / USDT_RATE;
    return usdtVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USDT';
  }
};
