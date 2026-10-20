# Single-operator security — phase 2

## Deployment requirements

This branch is not deployed. Keep live execution paused. This is a single operator / single Node process design, not tenant isolation or a public multi-user trading product.

1. On your own computer, run `python scripts/create_operator_secrets.py`. It asks for a 12–256 character operator password without echo, prints a scrypt password hash and a random 32-byte encryption key. Do not paste the password or generated values into chat, GitHub, screenshots or logs.
2. Put `APP_AUTH_PASSWORD_HASH` and `APP_CREDENTIALS_KEY` in the hosting secret manager. Keep a separate secure backup of the encryption key. Losing it makes the vault unreadable.
3. Set `APP_URL` to the exact HTTPS origin of the terminal (for example https://terminal.example.com). Set `NODE_ENV=production`. Cookies are HttpOnly, Secure, SameSite=Strict. HTTPS is mandatory in production. A wrong origin blocks state-changing API calls.
4. Use one Node instance and a durable, private writable directory for `.server_credentials.enc`. Sessions are in memory and expire after 8 hours; restart logs everyone out. Multiple replicas need a shared session store before use.
5. The existing `.server_credentials.json` plaintext file is deliberately not read or migrated. Re-enter exchange credentials after login. Remove the obsolete plaintext file from the host and backups through your hosting management process; do not copy it to this repository. Existing browser credentials are scrubbed when settings load, but historical backups are outside this change.
6. Check login/logout, exact origin, config metadata, and persistence with test credentials before any production use. Already stored browser settings are no longer enough to authenticate. Password hash or encryption-key absence causes API access / credential saving to fail closed.

## Behavior

All `/api` routes except authentication status/login require an operator session. Login checks scrypt, bounds failed attempts and concurrent password checks, and stores only hashed random session tokens. Every state-changing request must match APP_URL Origin. Authentication and API responses use Cache-Control: no-store. Logout revokes the current session token.

Exchange credentials use AES-256-GCM with a random nonce and atomic file replacement at mode 0600. The key is supplied only by server environment. Config GET returns connection metadata only. Config POST never echoes secrets. Browser state may contain keys temporarily while entering/testing a connection, but settings persistence and restored snapshots strip them. Users may need to re-enter keys to use the legacy connection-testing UI after a page reload; full server-only client refactoring remains pending.

## Limits

This is not an audit certificate. Other legacy endpoints may still contain simulated data and accounting assumptions. Live order/BNB/close endpoints remain paused. The UI is a working Turkish operator gate, not a final multilingual account product. No password reset, user enrollment, multi-factor login or distributed rate limit is implemented. A reverse proxy should impose request limits before a public rollout. Existing browser PIN controls are not server authentication.

## Tests

`npm run test:security` covers missing configuration, unauthenticated access, login/logout/expiry, origin checks, rate limiting, production cookie flags, encrypted vault roundtrip/tamper/wrong key/file permissions, legacy storage cleanup, and phase 1 execution guards. Tests use dummy credentials and a local HTTP fixture; no Binance or Gemini request is made.
