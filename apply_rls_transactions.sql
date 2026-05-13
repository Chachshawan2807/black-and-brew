-- Enable RLS for inventory_transactions
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all transactions (History)
DROP POLICY IF EXISTS "Allow authenticated users to view all transactions" ON public.inventory_transactions;
CREATE POLICY "Allow authenticated users to view all transactions"
ON public.inventory_transactions
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert transactions
DROP POLICY IF EXISTS "Allow authenticated users to insert transactions" ON public.inventory_transactions;
CREATE POLICY "Allow authenticated users to insert transactions"
ON public.inventory_transactions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to delete transactions (Ledger-Safe Cancellation)
DROP POLICY IF EXISTS "Allow authenticated users to delete transactions" ON public.inventory_transactions;
CREATE POLICY "Allow authenticated users to delete transactions"
ON public.inventory_transactions
FOR DELETE
TO authenticated
USING (true);
