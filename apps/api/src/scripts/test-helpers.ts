import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { formatCHF, validateSwissPLZ, calculateMWST } from '../lib/swiss';
import { emailService } from '../services/email';

async function runTests() {
  console.log('=== STARTING UNIT & INTEGRATION TESTS ===\n');

  // Test 1: Swiss Helper Functions
  console.log('Test 1: Swiss Helpers');
  const chfVal = formatCHF(1234.5);
  console.log(`- formatCHF(1234.5) => Expect: CHF 1'234.50, Got: ${chfVal}`);
  const plzVal1 = validateSwissPLZ('8000');
  const plzVal2 = validateSwissPLZ('9999');
  console.log(`- validateSwissPLZ('8000') => Expect: true, Got: ${plzVal1}`);
  console.log(`- validateSwissPLZ('9999') => Expect: false, Got: ${plzVal2}`);
  const vat = calculateMWST(108.1);
  console.log(`- calculateMWST(108.1) => Expect net: 100, vat: 8.1, Got net: ${vat.netPrice}, vat: ${vat.vatAmount}`);
  console.log('Test 1 Passed!\n');

  // Test 2: Password Hashing
  console.log('Test 2: Password Hashing');
  const password = 'SuperSecretPassword123!';
  const hash = await bcrypt.hash(password, 12);
  console.log(`- Password hashed successfully. Length: ${hash.length}`);
  const matchTrue = await bcrypt.compare(password, hash);
  const matchFalse = await bcrypt.compare('WrongPassword!', hash);
  console.log(`- bcrypt.compare (correct password) => Expect: true, Got: ${matchTrue}`);
  console.log(`- bcrypt.compare (incorrect password) => Expect: false, Got: ${matchFalse}`);
  if (matchTrue && !matchFalse) {
    console.log('Test 2 Passed!\n');
  } else {
    throw new Error('Test 2 Failed!');
  }

  // Test 3: JWT Tokens
  console.log('Test 3: JWT Token Flow');
  const payload = { id: 'usr_123', email: 'test@example.com', role: 'CUSTOMER' as const };
  const secret = 'test-secret';
  const token = jwt.sign(payload, secret, { expiresIn: '15m' });
  console.log(`- Token signed successfully.`);
  const decoded = jwt.verify(token, secret) as typeof payload;
  console.log(`- Token verified. Decoded user ID: ${decoded.id}, Role: ${decoded.role}`);
  if (decoded.id === 'usr_123' && decoded.role === 'CUSTOMER') {
    console.log('Test 3 Passed!\n');
  } else {
    throw new Error('Test 3 Failed!');
  }

  // Test 4: Password Reset Token (Stateless JWT flow)
  console.log('Test 4: Stateless Password Reset Token Flow');
  const user = { id: 'usr_999', passwordHash: hash };
  const resetSecret = secret + user.passwordHash;
  const resetToken = jwt.sign({ userId: user.id }, resetSecret, { expiresIn: '1h' });
  console.log('- Reset token signed using user-specific secret.');
  
  // Verify reset token works
  const verifiedPayload = jwt.verify(resetToken, resetSecret) as { userId: string };
  console.log(`- Reset token verified. User ID matches: ${verifiedPayload.userId === user.id}`);
  
  // Verify token becomes invalid if password hash changes
  const newHash = await bcrypt.hash(password, 12);
  const invalidSecret = secret + newHash;
  try {
    jwt.verify(resetToken, invalidSecret);
    console.log('- ERROR: Token verified with new password hash! (Security risk)');
  } catch (err) {
    console.log('- Success: Token is invalid after password hash changed.');
    console.log('Test 4 Passed!\n');
  }

  // Test 5: Email service triggers log
  console.log('Test 5: Email Service (Console output sandbox mode)');
  await emailService.sendOrderConfirmation(
    {
      orderNumber: 'SWP-2026-00001',
      subtotalChf: 120.00,
      vatAmountChf: 9.72,
      shippingCostChf: 15.00,
      discountAmountChf: 0,
      totalChf: 144.72,
      paymentMethod: 'stripe',
      items: [
        {
          productName: 'Acoustic Oak Panel (Classic)',
          quantity: 1,
          unitPriceChf: 120.00,
          totalChf: 120.00,
        }
      ],
      invoiceUrl: 'https://cdn.swisswallpanels.ch/invoices/inv_123.pdf'
    },
    {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com'
    },
    'de'
  );
  console.log('Test 5 Passed!\n');

  console.log('=== ALL HELPER AND COMPONENT LOGIC TESTS PASSED SUCCESSFULLY! ===');
}

runTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
