const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const randomSecret = crypto.randomBytes(32).toString('hex');
const secret = process.argv[2] || randomSecret;

const token = jwt.sign(
    { role: 'orchestrator', service: 'lambda-bff' }, 
    secret, 
    { expiresIn: '365d' }
);

console.log('\n🔐 === CREDENTIALS GENERATOR ===');
console.log('Copy these values into your .env files:\n');
console.log(`JWT_SECRET=${secret}`);
console.log(`SERVICE_TOKEN=${token}`);
console.log('\n⚠️  NOTE: If you change the secret, you must regenerate the token.');