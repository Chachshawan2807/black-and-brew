-- Reset count accuracy history after major inventory system overhaul.
-- Clears inventory_count_verifications so /inventory/accuracy starts fresh.

DELETE FROM public.inventory_count_verifications;
