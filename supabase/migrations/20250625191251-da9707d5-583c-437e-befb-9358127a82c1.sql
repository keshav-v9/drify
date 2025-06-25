
-- Add monthly_income column to financial_plans table
ALTER TABLE public.financial_plans 
ADD COLUMN monthly_income NUMERIC DEFAULT 0;

-- Update the column to be non-nullable with a proper default
ALTER TABLE public.financial_plans 
ALTER COLUMN monthly_income SET NOT NULL;
