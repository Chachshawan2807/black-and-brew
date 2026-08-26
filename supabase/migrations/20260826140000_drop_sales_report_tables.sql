-- Remove database tables owned by the retired Sales Report feature.
-- Safe to run on environments where the optional tables were never created.

DROP TABLE IF EXISTS public.sales_records CASCADE;
DROP TABLE IF EXISTS public.sales_uploads CASCADE;
DROP TABLE IF EXISTS public.product_categories CASCADE;
