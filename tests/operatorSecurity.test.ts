import {assertPrivateFile} from '../src/server/privateStorage';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createOperatorAuth, passwordHash } from '../src/server/operatorAuth';
import { createCredentialVault, credentialStatus } from '../src/server/credentialVault';
import { safeSettings } from '../src/utils/safeSettings';
import { liveExecutionGuard } from '../src/server/executionSafety';

const fixturePassword = 'local-test-password-only';
const fixtureHash = passwordHash(fixturePassword);
async function withApp(router: ReturnType<typeof createOperatorAuth>, action: (url: string) => Promise<void>) {
  const app = express(); app.use(express.json()); app.use('/api', router);
  app.post('/api/binance/order', liveExecutionGuard);
  app.get('/api/binance/config', (_req, res) => res.json(credentialStatus({ apiKey: 'test-key', secretKey: 'test-secret', exchange: 'BINANCE', updatedAt: 1 }, true)));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try { const address = server.address(); assert.ok(address && typeof address !== 'string'); await action(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve())); }
}
const origin = 'http://localhost:3000';

test('unconfigured server denies all private API access', async () => {
  await withApp(createOperatorAuth({}), async url => {
    assert.equal((await fetch(url + '/api/binance/config')).status, 503);
    const session = await (await fetch(url + '/api/auth/session')).json();
    assert.deepEqual(session, { configured: false, authenticated: false });
  });
});

test('login, private metadata, origin rejection, expiry and logout', async () => {
  let time = 1000;
  await withApp(createOperatorAuth({ passwordHash: fixtureHash, appUrl: origin, now: () => time }), async url => {
    assert.equal((await fetch(url + '/api/binance/config')).status, 401);
    const login = (password = fixturePassword, requestOrigin = origin) => fetch(url + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: requestOrigin }, body: JSON.stringify({ password }) });
    assert.equal((await login(fixturePassword, 'https://evil.example')).status, 403);
    assert.equal((await login('wrong-password-example')).status, 401);
    const response = await login(); assert.equal(response.status, 200);
    const setCookie = response.headers.get('set-cookie')!;
    assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /SameSite=Strict/);
    const cookie = setCookie.split(';')[0];
    const config = await fetch(url + '/api/binance/config', { headers: { Cookie: cookie } });
    assert.equal(config.status, 200); assert.equal(config.headers.get('cache-control'), 'no-store');
    const data = await config.text(); assert.ok(!data.includes('test-key')); assert.ok(!data.includes('test-secret'));
    assert.equal((await fetch(url + '/api/binance/order', { method: 'POST', headers: { Cookie: cookie, Origin: 'https://evil.example' } })).status, 403);
    assert.equal((await fetch(url + '/api/binance/order', { method: 'POST', headers: { Cookie: cookie, Origin: origin } })).status, 503);
    const logout = await fetch(url + '/api/auth/logout', { method: 'POST', headers: { Cookie: cookie, Origin: origin } });
    assert.equal(logout.status, 200);
    assert.equal((await fetch(url + '/api/binance/config', { headers: { Cookie: cookie } })).status, 401);
    const again = await login(); const secondCookie = again.headers.get('set-cookie')!.split(';')[0];
    time += 8 * 60 * 60 * 1000 + 1;
    assert.equal((await fetch(url + '/api/binance/config', { headers: { Cookie: secondCookie } })).status, 401);
  });
});

test('login attempts are bounded and production cookies require HTTPS', async () => {
  await withApp(createOperatorAuth({ passwordHash: fixtureHash, appUrl: 'https://terminal.example', production: true }), async url => {
    const response = await fetch(url + '/api/auth/login', { method: 'POST', headers: { Origin: 'https://terminal.example', 'Content-Type': 'application/json' }, body: JSON.stringify({ password: fixturePassword }) });
    assert.match(response.headers.get('set-cookie')!, /__Host-aq_session=/);
    assert.match(response.headers.get('set-cookie')!, /Secure/);
    for (let i = 0; i < 5; i++) await fetch(url + '/api/auth/login', { method: 'POST', headers: { Origin: 'https://terminal.example', 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'bad' }) });
    assert.equal((await fetch(url + '/api/auth/login', { method: 'POST', headers: { Origin: 'https://terminal.example', 'Content-Type': 'application/json' }, body: JSON.stringify({ password: fixturePassword }) })).status, 429);
  });
});

test('vault roundtrip, restrictive permissions, missing/wrong keys and tampering', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aq-vault-'));
  try {
    const file = path.join(dir, 'vault.enc'); const key = crypto.randomBytes(32).toString('hex');
    const vault = createCredentialVault(file, key);
    const value = { apiKey: 'fixture-api-key', secretKey: 'fixture-secret-key', exchange: 'BINANCE', updatedAt: 1 };
    assert.throws(() => createCredentialVault(file).save(value));
    vault.save(value); assert.deepEqual(vault.load(), value);
    assertPrivateFile(file);
    assert.ok(!fs.readFileSync(file, 'utf8').includes(value.secretKey));
    assert.ok(!fs.readFileSync(file, 'utf8').includes(value.apiKey));
    assert.throws(() => createCredentialVault(file, crypto.randomBytes(32).toString('hex')).load());
    const payload = JSON.parse(fs.readFileSync(file, 'utf8')); payload.tag = '00'.repeat(16); fs.writeFileSync(file, JSON.stringify(payload));
    assert.throws(() => vault.load());
    vault.clear(); assert.equal(vault.load(), null);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('persisted settings and legacy migration never retain exchange secrets', async () => {
  const safe = safeSettings({ binanceApiKey: 'fixture-api-key', binanceSecretKey: 'fixture-secret-key', futureSecret: 'secret', soundEnabled: true });
  assert.equal(safe.binanceApiKey, ''); assert.equal(safe.binanceSecretKey, ''); assert.ok(!('futureSecret' in safe));
  const memory = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => memory.set(k, v) } });
  try {
    const { loadSecuritySettings, saveSecuritySettings } = await import('../src/utils/storageVault');
    memory.set('nexus_crypto_settings_v1', JSON.stringify({ binanceApiKey: 'fixture-api-key', binanceSecretKey: 'fixture-secret-key', soundEnabled: false }));
    const settings = loadSecuritySettings(); assert.equal(settings.binanceSecretKey, ''); assert.equal(settings.soundEnabled, false);
    saveSecuritySettings({ ...settings, binanceApiKey: 'fixture-api-key', binanceSecretKey: 'fixture-secret-key' });
    assert.ok(!memory.get('nexus_crypto_settings_v1')!.includes('fixture-'));
  } finally { if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete (globalThis as any).localStorage; }
});
