-- Migration to reset accuracy history due to new calculation policy rules
-- This empties the inventory_count_verifications table to reset accuracy stats.

DELETE FROM public.inventory_count_verifications;
