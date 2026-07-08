-- Reset count accuracy history after inventory verification workflow changes.
-- Clears inventory_count_verifications so /inventory/accuracy starts fresh.

DELETE FROM public.inventory_count_verifications;
