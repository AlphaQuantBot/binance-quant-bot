/** Fixed 18-place decimal arithmetic for exchange amounts; never use Number for accounting. */
export function units(value: string): bigint {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,24})(\.\d{1,18})?$/.test(value)) throw Error('INVALID_DECIMAL');
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole + fraction.padEnd(18, '0'));
}
export function decimal(value: bigint): string {
  if (value < 0n) throw Error('NEGATIVE_AMOUNT');
  const text = value.toString().padStart(19, '0');
  const fraction = text.slice(-18).replace(/0+$/, '');
  return text.slice(0, -18) + (fraction ? '.' + fraction : '');
}
