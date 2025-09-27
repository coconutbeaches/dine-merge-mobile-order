#!/bin/bash

# Safe Project Cleanup Script
# Creates backups before deleting old files

set -e  # Exit on error

echo "🧹 Dine Merge Mobile Order - Project Cleanup"
echo "============================================"
echo ""

# Create backup directory with timestamp
BACKUP_DIR="$HOME/backup/dine-merge-cleanup-$(date +%Y%m%d-%H%M%S)"
echo "📦 Creating backup at: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# Function to safely delete files
safe_delete() {
    local file="$1"
    if [ -f "$file" ]; then
        cp "$file" "$BACKUP_DIR/" 2>/dev/null || true
        rm -f "$file"
        echo "  ✓ Deleted: $file"
    fi
}

safe_delete_dir() {
    local dir="$1"
    if [ -d "$dir" ]; then
        cp -r "$dir" "$BACKUP_DIR/" 2>/dev/null || true
        rm -rf "$dir"
        echo "  ✓ Deleted directory: $dir"
    fi
}

echo ""
echo "📋 Starting cleanup..."
echo ""

# Category 1: Old SQL migration scripts
echo "1️⃣ Cleaning up old SQL migration scripts..."
safe_delete "20250711000000_guest_family_archiving.sql"
safe_delete "20250712000000_walkin_stay_id_migration.sql"
safe_delete "add_admin_note.sql"
safe_delete "add_admin_note_mila.sql"
safe_delete "add_deleted_column.sql"
safe_delete "add_guest_fields.sql"
safe_delete "apply_guest_family_archiving.sql"
safe_delete "cart_backups_migration.sql"
safe_delete "fix_analytics_classification.sql"
safe_delete "fix_analytics_exact_match.sql"
safe_delete "fix_custom_order_columns.sql"
safe_delete "fix_missing_columns.sql"
safe_delete "fix_orders_table.sql"
safe_delete "guest_family_archives.sql"
safe_delete "merge_walkin_to_a5_bianca_mila.sql"
safe_delete "notify_frontoffice_staff.sql"
safe_delete "option_a_transaction.sql"
safe_delete "option_b_shadow_backup.sql"
safe_delete "partition_orders_table.sql"
safe_delete "reset_admin_password.sql"
safe_delete "restore_guests_table.sql"
safe_delete "retire_walkin_stay.sql"
safe_delete "seed_test_profiles.sql"
safe_delete "update_analytics_function.sql"
safe_delete "update_kung_to_walkin.sql"
safe_delete "update_orders_to_double_nathan.sql"
safe_delete "update_unknown_to_walkin.sql"
safe_delete "update_user_name.sql"
safe_delete "verify_kung_changes.sql"
safe_delete "debug_customer_data.sql"
safe_delete "maintenance_tasks.sql"
safe_delete "realtime-monitoring-alert.sql"

echo ""
echo "2️⃣ Cleaning up debug/test scripts..."
safe_delete "add-guest-columns.js"
safe_delete "check_guests.js"
safe_delete "create_a4_natascha.js"
safe_delete "create_temp_admin.js"
safe_delete "debug_a4_natascha_visibility.js"
safe_delete "debug_order_total.js"
safe_delete "debug_orders.js"
safe_delete "debug_orders.mjs"
safe_delete "debug_uuid.js"
safe_delete "debug_views.mjs"
safe_delete "debug-console.js"
safe_delete "debug-customers.js"
safe_delete "diagnose_login.js"
safe_delete "fix_order_names.js"
safe_delete "manual-test-guest.js"
safe_delete "place_order_a4_natascha.js"
safe_delete "qa_guest_family_archiving.js"
safe_delete "recover_orders_from_whatsapp.js"
safe_delete "test_connection.js"
safe_delete "test-auth-hanging.js"
safe_delete "test-auth-regression-suite.js"
safe_delete "test-browser-auth-detailed.js"
safe_delete "test-browser-auth-diagnosis.js"
safe_delete "test-browser-auth-hanging.js"
safe_delete "test-guest-checkout.js"
safe_delete "test-guest-order-admin.js"
safe_delete "test-nodejs-auth-comparison.js"

echo ""
echo "3️⃣ Cleaning up performance benchmarks..."
safe_delete "baseline-performance-2025-07-13T16-36-27-278Z.csv"
safe_delete "baseline-performance-2025-07-13T16-36-27-278Z.json"
safe_delete "baseline-performance-report-2025-07-13T16-36-27-278Z.md"
safe_delete "performance-benchmark.js"

echo ""
echo "4️⃣ Cleaning up log files..."
safe_delete "dev.log"
safe_delete "vercel-last.log"
safe_delete "vite.log"

echo ""
echo "5️⃣ Cleaning up old build artifacts..."
safe_delete_dir "dist"
safe_delete "text-width-measurement.html"
safe_delete "index.html"
safe_delete "77"  # Empty file

echo ""
echo "6️⃣ Cleaning up old documentation..."
safe_delete "auth-diagnosis-findings.md"
safe_delete "cart-badge-issue-documentation.md"
safe_delete "BUG_REPRODUCTION_GUIDE.md"
safe_delete "DATABASE_MAINTENANCE_SUMMARY.md"
safe_delete "file_analysis_checklist.md"
safe_delete "GUEST_CHECKOUT_FIX.md"
safe_delete "MANUAL_TESTING_STEPS.md"
safe_delete "SESSION_RETRY_DOCUMENTATION.md"
safe_delete "STEP5_EDGE_CASE_HANDLING_SUMMARY.md"
safe_delete "TEAM_COMMUNICATION_AUTH_FIX.md"
safe_delete "DEPLOYMENT_STEP_9_SUMMARY.md"
safe_delete "ADMIN_TARGETED_DEPLOYMENT.md"
safe_delete "ADMIN_PERFORMANCE_FIXES.md"
safe_delete "ADMIN_SERVER_SIDE_AUTH.md"
safe_delete "ANALYTICS_SETUP.md"
safe_delete "FIXES_SUMMARY.md"
safe_delete "ORDERS_OPTIMIZATION_SUMMARY.md"
safe_delete "PERFORMANCE_ANALYSIS.md"
safe_delete "ROUTE_GUARDS_README.md"
safe_delete "TESTING_SUMMARY.md"

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Summary:"
echo "  • Backup created at: $BACKUP_DIR"
echo "  • Files cleaned up from project root"
echo "  • Project structure is now cleaner"
echo ""
echo "💡 To restore any file, copy it from: $BACKUP_DIR"
echo ""

# Count remaining files
REMAINING_SQL=$(find . -maxdepth 1 -name "*.sql" | wc -l)
REMAINING_JS=$(find . -maxdepth 1 -name "*.js" -o -name "*.mjs" | wc -l)
REMAINING_MD=$(find . -maxdepth 1 -name "*.md" | wc -l)

echo "📁 Remaining root files:"
echo "  • SQL files: $REMAINING_SQL"
echo "  • JS files: $REMAINING_JS"  
echo "  • MD files: $REMAINING_MD"