"""Run privately on your computer; do not paste output into chat or commit it."""
import getpass
import hashlib
import secrets

password = getpass.getpass('Operator password (12–256 characters): ')
if not 12 <= len(password) <= 256:
    raise SystemExit('Password must contain 12–256 characters.')
if password != getpass.getpass('Confirm password: '):
    raise SystemExit('Passwords do not match.')
salt = secrets.token_hex(16)
hash_value = hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1, dklen=64).hex()
print('APP_AUTH_PASSWORD_HASH=' + salt + ':' + hash_value)
print('APP_CREDENTIALS_KEY=' + secrets.token_hex(32))
