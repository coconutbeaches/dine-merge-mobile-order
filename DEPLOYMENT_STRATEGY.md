# Safe Deployment Strategy for Performance Fix

## Current Status
- **Branch**: `fix/performance-cookie-bloat`  
- **Main Branch**: `main` (unchanged, safe to rollback)
- **Risk Level**: Medium (auth storage change affects all users)

## Pre-Deployment Testing

### Local Testing (15-20 minutes)
```bash
# 1. Switch to the fix branch
git checkout fix/performance-cookie-bloat

# 2. Start the dev server
npm run dev

# 3. Run diagnostic before testing
node scripts/diagnose-storage.js

# 4. Test key flows:
- [ ] Login as regular user
- [ ] Login as admin
- [ ] Guest checkout
- [ ] Add items to cart
- [ ] Place an order
- [ ] View admin dashboard
- [ ] Check that auth persists after page refresh

# 5. Run monitoring script while using the app
node scripts/monitor-storage.js
```

## Deployment Steps

### Option A: Staged Rollout (RECOMMENDED)
1. **Deploy to Preview/Staging First**
   ```bash
   # Push to a preview branch
   git push origin fix/performance-cookie-bloat:preview-performance-fix
   ```
   - Test with a small group of internal users for 2-4 hours
   - Monitor for any auth issues or unexpected behavior

2. **Deploy to Production**
   ```bash
   # If preview is successful, merge to main
   git checkout main
   git merge fix/performance-cookie-bloat
   git push origin main
   ```

### Option B: Direct Production with Quick Rollback Ready
1. **Prepare for deployment**
   ```bash
   # Tag the current main for easy rollback
   git checkout main
   git tag pre-performance-fix
   git push origin pre-performance-fix
   ```

2. **Deploy the fix**
   ```bash
   git merge fix/performance-cookie-bloat
   git push origin main
   ```

## Rollback Plan (if issues occur)

### Immediate Rollback (< 5 minutes)
```bash
# Option 1: Revert the merge commit
git checkout main
git revert HEAD
git push origin main

# Option 2: Force reset to previous state (use with caution)
git checkout main
git reset --hard pre-performance-fix
git push --force origin main

# Option 3: Deploy previous tag
git checkout pre-performance-fix
git push origin pre-performance-fix:main --force
```

## Post-Deployment Monitoring

### First Hour
- Monitor error logs for authentication failures
- Check that users can still log in
- Verify cart functionality works
- Watch for any spike in support requests

### First 24 Hours
- Run diagnostic periodically:
  ```bash
  node scripts/diagnose-storage.js
  ```
- Check browser console for any new errors
- Monitor application performance metrics
- Gather user feedback

## User Communication

### Pre-Deployment (Optional)
```
📢 Scheduled Maintenance Notice
We'll be deploying a performance improvement update.
You may need to log in again after the update.
Expected time: [DATE/TIME]
```

### Post-Deployment
```
✅ Performance Update Complete
We've fixed the issue causing the app to slow down over time.
If you experience any issues, please clear your browser cache and cookies, then log in again.
```

## Known Impact

### What Users Will Experience:
1. **One-time re-login required** - Auth tokens move from cookies to localStorage
2. **Significant performance improvement** - No more cookie bloat
3. **No data loss** - All user data remains intact

### What to Watch For:
- Authentication issues on Safari (strict cookie/storage policies)
- PWA installation might need refresh
- Service worker cache might need clearing

## Emergency Contacts
- Lead Developer: [Contact]
- DevOps: [Contact]
- Customer Support Lead: [Contact]

## Success Metrics
- [ ] No cookie bloat after 30 minutes of use
- [ ] Cookie size stays under 1KB
- [ ] localStorage has clean `supabase.auth.token` entry
- [ ] Page load times remain consistent
- [ ] No increase in authentication errors

## Rollback Triggers
Rollback immediately if:
- More than 10% of users can't log in
- Cart functionality breaks
- Orders can't be placed
- Admin dashboard is inaccessible
- Any data corruption is detected

---

## Quick Commands Reference

```bash
# Check current branch
git branch

# Switch to fix branch
git checkout fix/performance-cookie-bloat

# Switch back to main
git checkout main

# Run diagnostic
node scripts/diagnose-storage.js

# Monitor storage growth
node scripts/monitor-storage.js

# Check deployment status in Lovable
open https://lovable.dev/projects/c49a8c44-9196-466a-8929-d139ab77ca8e
```