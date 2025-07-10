# QR Deep-Link and Private Mode Test Guide

## Overview
This guide covers testing the QR code deep-link functionality and Safari Private Mode compatibility as specified in Step 7 of the broader plan.

## Test Requirements
1. **Scan QR as new browser session** – expect row in `guest_users`, order row with table_number
2. **Scan again with existing session** – no new guest_users row, table stored
3. **Place second order without rescan** – table_number should be null (cleared)
4. **Safari private mode** – verify try/catch paths don't crash

## Test Files Created

### 1. Automated Tests
- `tests/qr-deeplink-core.spec.js` - Core functionality tests
- `tests/qr-deeplink-private-mode.spec.js` - Comprehensive tests with order flow

### 2. Verification Tools
- `tests/verify-qr-deeplink-results.sql` - SQL queries to verify database state
- `tests/QR_DEEPLINK_TEST_GUIDE.md` - This guide

## Running the Tests

### Prerequisites
1. Ensure your development server is running:
   ```bash
   npm run dev
   ```

2. Ensure Supabase is configured and accessible

### Automated Test Execution

#### Option 1: Run Core Tests (Recommended for CI)
```bash
npx playwright test tests/qr-deeplink-core.spec.js --reporter=list
```

#### Option 2: Run Full Test Suite
```bash
npx playwright test tests/qr-deeplink-private-mode.spec.js --reporter=list
```

#### Option 3: Run Specific Test
```bash
# Test 1: New QR scan
npx playwright test tests/qr-deeplink-core.spec.js -g "Should create new guest_user"

# Test 2: Existing session
npx playwright test tests/qr-deeplink-core.spec.js -g "Should NOT create new guest_user"

# Test 3: Private mode
npx playwright test tests/qr-deeplink-core.spec.js -g "Should handle localStorage failure"

# Test 4: Order flow setup
npx playwright test tests/qr-deeplink-core.spec.js -g "Should verify table number behavior"
```

### Manual Test Verification

#### Step 1: Database Verification
After running automated tests, execute the SQL script in Supabase:
```sql
-- Copy and paste contents from tests/verify-qr-deeplink-results.sql
```

#### Step 2: Manual Order Flow Test
1. Run Test 4 (setup test):
   ```bash
   npx playwright test tests/qr-deeplink-core.spec.js -g "table number behavior"
   ```

2. Navigate to `http://localhost:3001/menu` in your browser

3. Add items to cart and place an order

4. Verify in database:
   - First order should have `table_number = '10'`
   - Guest user ID should be `'test_guest_order_flow'`

5. Place a second order (without rescanning QR):
   - Second order should have `table_number = null`

## Test Scenarios Explained

### Test 1: New QR Scan
- **URL**: `/?goto=table-7`
- **Expected**: 
  - New guest_user created in database
  - localStorage contains guest session
  - `table_number_pending = '7'`

### Test 2: Existing Session QR Scan
- **Setup**: Pre-existing guest session in localStorage
- **URL**: `/?goto=table-8` (different table)
- **Expected**:
  - NO new guest_user created
  - Existing session preserved
  - `table_number_pending` updated to '8'

### Test 3: Safari Private Mode
- **Setup**: localStorage mocked to throw errors
- **URL**: `/?goto=table-9`
- **Expected**:
  - No uncaught errors
  - Page loads successfully
  - Graceful handling of localStorage failures

### Test 4: Order Flow
- **Setup**: Guest session with `table_number_pending = '10'`
- **Process**: Manual order placement
- **Expected**:
  - First order: `table_number = '10'`
  - After order: `table_number_pending` cleared
  - Second order: `table_number = null`

## Key Components Tested

### TableScanRouter.tsx
- QR parameter parsing (`?goto=table-X`)
- Guest user creation logic
- Table number storage

### guestSession.ts
- localStorage availability testing
- Safari Private Mode compatibility
- Session storage and retrieval

### orderService.ts
- Table number clearing after order placement
- Guest order creation with correct fields

## Expected Database Results

### guest_users Table
```sql
user_id                  | first_name | stay_id | table_number
-------------------------|------------|---------|-------------
<uuid>                   | Guest      | walkin  | 7           -- Test 1
existing_guest_123       | Existing   | walkin  | 8           -- Test 2 (no new row)
test_guest_order_flow    | Test Guest | walkin  | 10          -- Test 4
```

### orders Table
```sql
guest_user_id            | table_number | order_sequence
-------------------------|--------------|---------------
<uuid-from-test1>        | 7           | 1st order
<uuid-from-test1>        | null        | 2nd order
test_guest_order_flow    | 10          | 1st order
test_guest_order_flow    | null        | 2nd order
```

## Troubleshooting

### Common Issues

1. **Web server not starting**
   ```bash
   # Check if port 3001 is available
   lsof -i :3001
   # Kill existing process if needed
   kill -9 <PID>
   ```

2. **Supabase connection issues**
   - Verify `.env.local` contains correct Supabase credentials
   - Check Supabase project is active

3. **localStorage tests failing**
   - Ensure your `guestSession.ts` has proper try/catch blocks
   - Verify `isLocalStorageAvailable()` function exists

### Debug Mode
Run tests with debug output:
```bash
DEBUG=pw:api npx playwright test tests/qr-deeplink-core.spec.js
```

### Screenshots and Videos
Test failures automatically capture:
- Screenshots: `test-results/`
- Videos: `test-results/`
- Traces: `test-results/`

## Success Criteria

✅ **Test 1**: New guest_user created, table_number stored  
✅ **Test 2**: No duplicate guest_user, table_number updated  
✅ **Test 3**: No crashes in Private Mode  
✅ **Test 4**: Correct table_number behavior in orders  

## Integration with CI/CD

Add to your CI pipeline:
```yaml
- name: Run QR Deep-Link Tests
  run: npx playwright test tests/qr-deeplink-core.spec.js --reporter=junit
  
- name: Upload Test Results
  uses: actions/upload-artifact@v2
  with:
    name: qr-deeplink-test-results
    path: test-results/
```

## Next Steps

After successful test execution:
1. Review database results using the SQL verification script
2. Test manually in actual Safari Private Mode
3. Test on mobile devices with QR code scanning
4. Integrate tests into CI/CD pipeline
5. Document any edge cases discovered during testing
