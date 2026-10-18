   -- The reset script (service role) must be able to clear the refund ledger
   grant delete on public.auto_refunds to service_role;