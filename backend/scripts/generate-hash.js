const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'test123';
  const hash = await bcrypt.hash(password, 12);
  console.log('Password:', password);
  console.log('Hash:', hash);
  
  // Verify it works
  const isValid = await bcrypt.compare(password, hash);
  console.log('Verification:', isValid ? 'OK' : 'FAILED');
}

generateHash();
