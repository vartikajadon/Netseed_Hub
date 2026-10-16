-- Migration 002: Add Batch Types and Student Payment Information
-- Description: Adds batch_type, training_duration_months, and internship_duration_months to batches,
-- and total_fees, payment_mode, and installment_type to students.

ALTER TABLE batches ADD COLUMN batch_type VARCHAR(50) DEFAULT 'TECH_MASTER';
ALTER TABLE batches ADD COLUMN training_duration_months INTEGER DEFAULT 6;
ALTER TABLE batches ADD COLUMN internship_duration_months INTEGER DEFAULT 6;

ALTER TABLE students ADD COLUMN total_fees DECIMAL(10, 2);
ALTER TABLE students ADD COLUMN payment_mode VARCHAR(50) DEFAULT 'ONLINE';
ALTER TABLE students ADD COLUMN installment_type VARCHAR(50) DEFAULT 'ONE_TIME';
