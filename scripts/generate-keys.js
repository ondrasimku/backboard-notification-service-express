#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('Generating RSA key pair for JWT signing...\n');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

const keysDir = path.join(__dirname, '..', 'keys');
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir);
}

fs.writeFileSync(path.join(keysDir, 'private.pem'), privateKey);
fs.writeFileSync(path.join(keysDir, 'public.pem'), publicKey);

console.log('Keys generated successfully!');
console.log('  - Private key: keys/private.pem');
console.log('  - Public key: keys/public.pem\n');

console.log('For .env file, use these values (copy exactly):\n');
console.log('JWT_PRIVATE_KEY="' + privateKey.replace(/\n/g, '\\n') + '"');
console.log('\nJWT_PUBLIC_KEY="' + publicKey.replace(/\n/g, '\\n') + '"');
console.log('\nIMPORTANT: Add keys/ directory to .gitignore to avoid committing private keys!');

