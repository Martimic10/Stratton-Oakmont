export const DEFAULT_ANNUAL_RATE = 1.5;

export function computeQuarterlyFee(accountValue: number, annualRatePercent: number): number {
  return (accountValue * (annualRatePercent / 100)) / 4;
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
