-- Performance Indexes Migration
-- Created: 2026-02-12
-- Purpose: Add indexes to improve query performance based on audit findings

-- Migration: 001_add_performance_indexes
-- Description: Add indexes for frequently queried columns

BEGIN;

-- ============================================
-- Facility Certificates Indexes
-- ============================================

-- Index for facility certificate lookups with active filter
-- Used by: signer-service when looking up active certificates
CREATE INDEX IF NOT EXISTS idx_facility_certificates_facility_id_active 
ON facility_certificates(facility_id, is_active) 
WHERE is_active = TRUE;

-- Index for certificate serial number lookups
CREATE INDEX IF NOT EXISTS idx_facility_certificates_serial 
ON facility_certificates(serial_number);

-- Index for certificate expiry monitoring
CREATE INDEX IF NOT EXISTS idx_facility_certificates_expiry 
ON facility_certificates(valid_until) 
WHERE is_active = TRUE;

-- ============================================
-- SBS Normalization Map Indexes
-- ============================================

-- Composite index for code normalization lookups
-- Used by: normalizer-service for database lookups
CREATE INDEX IF NOT EXISTS idx_sbs_normalization_map_facility_code 
ON sbs_normalization_map(facility_id, internal_code_id, is_active) 
WHERE is_active = TRUE;

-- Index for SBS code reverse lookups
CREATE INDEX IF NOT EXISTS idx_sbs_normalization_map_sbs_code 
ON sbs_normalization_map(sbs_code) 
WHERE is_active = TRUE;

-- ============================================
-- NPHIES Transactions Indexes
-- ============================================

-- Index for transaction history queries (most recent first)
-- Used by: nphies-bridge for transaction status lookups
CREATE INDEX IF NOT EXISTS idx_nphies_transactions_timestamp 
ON nphies_transactions(submission_timestamp DESC);

-- Index for transaction UUID lookups
CREATE INDEX IF NOT EXISTS idx_nphies_transactions_uuid 
ON nphies_transactions(transaction_uuid);

-- Index for facility transaction queries
CREATE INDEX IF NOT EXISTS idx_nphies_transactions_facility_status 
ON nphies_transactions(facility_id, status, submission_timestamp DESC);

-- Index for NPHIES transaction ID lookups
CREATE INDEX IF NOT EXISTS idx_nphies_transactions_nphies_id 
ON nphies_transactions(nphies_transaction_id) 
WHERE nphies_transaction_id IS NOT NULL;

-- ============================================
-- Facility Internal Codes Indexes
-- ============================================

-- Index for internal code lookups with active filter
CREATE INDEX IF NOT EXISTS idx_facility_internal_codes_facility_code 
ON facility_internal_codes(facility_id, internal_code, is_active) 
WHERE is_active = TRUE;

-- ============================================
-- Healthcare Tables Indexes (if they exist)
-- ============================================

-- Index for patient lookups by national ID
CREATE INDEX IF NOT EXISTS idx_patients_national_id 
ON patients(national_id) 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patients');

-- Index for healthcare request lookups
CREATE INDEX IF NOT EXISTS idx_healthcare_requests_status_created 
ON healthcare_requests(status, created_at DESC)
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'healthcare_requests');

-- Index for claim items queries
CREATE INDEX IF NOT EXISTS idx_claim_items_claim_id 
ON claim_items(claim_id)
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'claim_items');

-- ============================================
-- Update Statistics
-- ============================================

-- Analyze tables to update query planner statistics
ANALYZE facility_certificates;
ANALYZE sbs_normalization_map;
ANALYZE nphies_transactions;
ANALYZE facility_internal_codes;

COMMIT;

-- ============================================
-- Rollback Script (if needed)
-- ============================================
-- To rollback this migration, run:
/*
BEGIN;

DROP INDEX IF EXISTS idx_facility_certificates_facility_id_active;
DROP INDEX IF EXISTS idx_facility_certificates_serial;
DROP INDEX IF EXISTS idx_facility_certificates_expiry;
DROP INDEX IF EXISTS idx_sbs_normalization_map_facility_code;
DROP INDEX IF EXISTS idx_sbs_normalization_map_sbs_code;
DROP INDEX IF EXISTS idx_nphies_transactions_timestamp;
DROP INDEX IF EXISTS idx_nphies_transactions_uuid;
DROP INDEX IF EXISTS idx_nphies_transactions_facility_status;
DROP INDEX IF EXISTS idx_nphies_transactions_nphies_id;
DROP INDEX IF EXISTS idx_facility_internal_codes_facility_code;
DROP INDEX IF EXISTS idx_patients_national_id;
DROP INDEX IF EXISTS idx_healthcare_requests_status_created;
DROP INDEX IF EXISTS idx_claim_items_claim_id;

COMMIT;
*/

-- ============================================
-- Verification Queries
-- ============================================
-- Run these queries to verify indexes were created:
/*
-- List all indexes on facility_certificates
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'facility_certificates';

-- List all indexes on sbs_normalization_map
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'sbs_normalization_map';

-- List all indexes on nphies_transactions
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'nphies_transactions';

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename IN ('facility_certificates', 'sbs_normalization_map', 'nphies_transactions')
ORDER BY tablename, indexname;
*/
