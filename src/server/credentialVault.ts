import crypto from 'node:crypto';
import fs from 'node:fs';

export interface ExchangeCredentials {
  apiKey: string; secretKey: string; exchange: string; updatedAt: number;
  liveBalance?: number; availableCash?: number;
}

/** Authenticated encryption; never reads the legacy plaintext JSON file. */
export function createCredentialVault(file: string, keyHex?: string) {
  const key = keyHex && /^[a-f0-9]{64}$/i.test(keyHex) ? Buffer.from(keyHex, 'hex') : null;
  return {
    configured: !!key,
    load(): ExchangeCredentials | null {
      if (!key || !fs.existsSync(file)) return null;
      const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (payload.version !== 1) throw new Error('Unsupported vault');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'hex'));
      decipher.setAuthTag(Buffer.from(payload.tag, 'hex'));
      return JSON.parse(Buffer.concat([decipher.update(Buffer.from(payload.data, 'hex')), decipher.final()]).toString('utf8'));
    },
    save(value: ExchangeCredentials) {
      if (!key) throw new Error('Credential vault key is not configured');
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
      const payload = JSON.stringify({ version: 1, iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), data: data.toString('hex') });
      const temp = `${file}.${crypto.randomBytes(8).toString('hex')}.tmp`;
      try { fs.writeFileSync(temp, payload, { mode: 0o600, flag: 'wx' }); fs.renameSync(temp, file); }
      finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
    },
    clear() { if (fs.existsSync(file)) fs.unlinkSync(file); },
  };
}

export function credentialStatus(creds: ExchangeCredentials | null, vaultConfigured: boolean) {
  return { success: true, configured: !!creds, vaultConfigured,
    exchange: creds?.exchange || 'BINANCE', updatedAt: creds?.updatedAt || null,
    liveBalance: creds?.liveBalance ?? null, availableCash: creds?.availableCash ?? null };
}
