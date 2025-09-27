# Project Cleanup Recommendations

## Files That Can Be SAFELY DELETED

### 1. One-Time Migration/Fix Scripts (Already Applied)
These SQL scripts were for one-time fixes that have already been applied to the database:
```
✅ 20250711000000_guest_family_archiving.sql
✅ 20250712000000_walkin_stay_id_migration.sql
✅ add_admin_note.sql
✅ add_admin_note_mila.sql
✅ add_deleted_column.sql
✅ add_guest_fields.sql
✅ apply_guest_family_archiving.sql
✅ cart_backups_migration.sql
✅ fix_analytics_classification.sql
✅ fix_analytics_exact_match.sql
✅ fix_custom_order_columns.sql
✅ fix_missing_columns.sql
✅ fix_orders_table.sql
✅ guest_family_archives.sql
✅ merge_walkin_to_a5_bianca_mila.sql
✅ notify_frontoffice_staff.sql
✅ option_a_transaction.sql
✅ option_b_shadow_backup.sql
✅ partition_orders_table.sql
✅ reset_admin_password.sql
✅ restore_guests_table.sql
✅ retire_walkin_stay.sql
✅ seed_test_profiles.sql
✅ update_analytics_function.sql
✅ update_kung_to_walkin.sql
✅ update_orders_to_double_nathan.sql
✅ update_unknown_to_walkin.sql
✅ update_user_name.sql
✅ verify_kung_changes.sql
```

### 2. Debug/Test Scripts (No Longer Needed)
These were for debugging specific issues that have been resolved:
```
✅ add-guest-columns.js
✅ check_guests.js
✅ create_a4_natascha.js
✅ create_temp_admin.js
✅ debug_a4_natascha_visibility.js
✅ debug_order_total.js
✅ debug_orders.js
✅ debug_orders.mjs
✅ debug_uuid.js
✅ debug_views.mjs
✅ debug-console.js
✅ debug-customers.js
✅ diagnose_login.js
✅ fix_order_names.js
✅ manual-test-guest.js
✅ place_order_a4_natascha.js
✅ qa_guest_family_archiving.js
✅ recover_orders_from_whatsapp.js
✅ test_connection.js
✅ test-auth-hanging.js
✅ test-auth-regression-suite.js
✅ test-browser-auth-detailed.js
✅ test-browser-auth-diagnosis.js
✅ test-browser-auth-hanging.js
✅ test-guest-checkout.js
✅ test-guest-order-admin.js
✅ test-nodejs-auth-comparison.js
```

### 3. Performance Benchmarking Files (Historical Data)
```
✅ baseline-performance-2025-07-13T16-36-27-278Z.csv
✅ baseline-performance-2025-07-13T16-36-27-278Z.json
✅ baseline-performance-report-2025-07-13T16-36-27-278Z.md
✅ performance-benchmark.js
```

### 4. Log Files
```
✅ dev.log
✅ vercel-last.log
✅ vite.log
```

### 5. Old Build Artifacts
```
✅ dist/ (entire folder - this is old Vite build)
✅ text-width-measurement.html (test file)
✅ index.html (root level, not needed for Next.js)
```

### 6. Duplicate/Superseded Documentation
Keep only the most recent/relevant docs:
```
✅ auth-diagnosis-findings.md (superseded by performance fix docs)
✅ cart-badge-issue-documentation.md (old issue, resolved)
✅ BUG_REPRODUCTION_GUIDE.md (old bugs, resolved)
✅ DATABASE_MAINTENANCE_SUMMARY.md (tasks completed)
✅ file_analysis_checklist.md (one-time analysis)
✅ GUEST_CHECKOUT_FIX.md (already fixed)
✅ MANUAL_TESTING_STEPS.md (outdated)
✅ SESSION_RETRY_DOCUMENTATION.md (superseded)
✅ STEP5_EDGE_CASE_HANDLING_SUMMARY.md (completed)
✅ TEAM_COMMUNICATION_AUTH_FIX.md (completed)
```

### 7. Old Deployment Docs (Keep only latest)
```
✅ DEPLOYMENT_STEP_9_SUMMARY.md (superseded by DEPLOYMENT_STRATEGY.md)
✅ ADMIN_TARGETED_DEPLOYMENT.md (superseded by DEPLOYMENT_STRATEGY.md)
```

## Files That Should be KEPT

### Important Documentation
- ✅ KEEP: README.md
- ✅ KEEP: WARP.md (AI assistance guide)
- ✅ KEEP: DEPLOYMENT_STRATEGY.md (latest deployment guide)
- ✅ KEEP: PERFORMANCE_FIX_SUMMARY.md (recent fix documentation)
- ✅ KEEP: PERFORMANCE_FIXES_COMPLETE.md (complete record)
- ✅ KEEP: SUPABASE_CHANNELS_INVENTORY.md (channel management)
- ✅ KEEP: CHANGELOG.md

### Active Configuration
- ✅ KEEP: All .json config files (package.json, tsconfig.json, etc.)
- ✅ KEEP: All migration files in supabase/migrations/
- ✅ KEEP: schema.sql (database schema reference)
- ✅ KEEP: index_commands.sql (may need to rerun)
- ✅ KEEP: fix_orders_performance_indexes.sql (recent fix, keep for reference)

### Active Scripts in /scripts
- ✅ KEEP: All scripts in /scripts folder (useful utilities)

### Test Files
- ✅ KEEP: All files in /tests folder (active tests)
- ✅ KEEP: playwright.config.js
- ✅ KEEP: cypress/ folder

## Deletion Commands

### Safe Bulk Deletion (63 files, ~500KB)
```bash
# Create backup first
mkdir -p ~/backup/dine-merge-cleanup-$(date +%Y%m%d)
cp *.sql *.js *.mjs *.log *.csv *.md ~/backup/dine-merge-cleanup-$(date +%Y%m%d)/

# Delete old SQL migrations
rm -f 20250711000000_guest_family_archiving.sql
rm -f 20250712000000_walkin_stay_id_migration.sql
rm -f add_admin_note*.sql
rm -f add_deleted_column.sql
rm -f add_guest_fields.sql
rm -f apply_guest_family_archiving.sql
rm -f cart_backups_migration.sql
rm -f fix_analytics_*.sql
rm -f fix_custom_order_columns.sql
rm -f fix_missing_columns.sql
rm -f fix_orders_table.sql
rm -f guest_family_archives.sql
rm -f merge_walkin_to_a5_bianca_mila.sql
rm -f notify_frontoffice_staff.sql
rm -f option_*.sql
rm -f partition_orders_table.sql
rm -f reset_admin_password.sql
rm -f restore_guests_table.sql
rm -f retire_walkin_stay.sql
rm -f seed_test_profiles.sql
rm -f update_*.sql
rm -f verify_kung_changes.sql

# Delete debug scripts
rm -f add-guest-columns.js
rm -f check_guests.js
rm -f create_*admin*.js
rm -f debug*.js debug*.mjs
rm -f diagnose_login.js
rm -f fix_order_names.js
rm -f manual-test-guest.js
rm -f place_order_*.js
rm -f qa_guest_family_archiving.js
rm -f recover_orders_from_whatsapp.js
rm -f test*.js

# Delete logs and reports
rm -f *.log
rm -f baseline-performance*.*
rm -f performance-benchmark.js

# Delete old documentation
rm -f auth-diagnosis-findings.md
rm -f cart-badge-issue-documentation.md
rm -f BUG_REPRODUCTION_GUIDE.md
rm -f DATABASE_MAINTENANCE_SUMMARY.md
rm -f file_analysis_checklist.md
rm -f GUEST_CHECKOUT_FIX.md
rm -f MANUAL_TESTING_STEPS.md
rm -f SESSION_RETRY_DOCUMENTATION.md
rm -f STEP5_EDGE_CASE_HANDLING_SUMMARY.md
rm -f TEAM_COMMUNICATION_AUTH_FIX.md
rm -f DEPLOYMENT_STEP_9_SUMMARY.md
rm -f ADMIN_TARGETED_DEPLOYMENT.md

# Delete old build artifacts
rm -rf dist/
rm -f text-width-measurement.html
rm -f index.html
```

## Summary
- **Files to delete**: 63+ files
- **Space to recover**: ~500KB-1MB
- **Risk level**: Very Low (all one-time scripts and old docs)
- **Recommendation**: Create a backup folder first, then delete in batches