/**
 * Helper utility to construct official, reliable PancakeSwap swap URLs.
 * Uses official BSC Chain ID 56 parameter so PancakeSwap Web3 frontend directly
 * loads the contract on BNB Smart Chain and pre-selects the output token.
 */

export const BSC_CHAIN_ID = 56;

export function getPancakeSwapSwapUrl(outputTokenAddress: string): string {
  const cleanAddress = (outputTokenAddress || '').trim();
  // Using chainId=56 guarantees PancakeSwap directly queries BSC RPC for token metadata
  return `https://pancakeswap.finance/swap?outputCurrency=${cleanAddress}&chainId=${BSC_CHAIN_ID}`;
}

export function isValidBscAddress(address: string): boolean {
  if (!address) return false;
  const clean = address.trim();
  return /^0x[a-fA-F0-9]{40}$/.test(clean);
}
