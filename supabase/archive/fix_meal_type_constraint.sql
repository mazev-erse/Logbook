-- Run this in your Supabase SQL Editor if you want to allow CUSTOM meal category names 
-- (like 'Pre-Workout' or 'Midnight Snack') to be saved to the database.
-- Right now, the table has a strict lock that only accepts 4 specific lowercase words.

ALTER TABLE diet_logs DROP CONSTRAINT IF EXISTS diet_logs_meal_type_check;
