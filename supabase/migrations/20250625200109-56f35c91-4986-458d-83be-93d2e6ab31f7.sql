
-- First, let's clean up duplicate care_recipients records, keeping only the most recent one
WITH ranked_recipients AS (
  SELECT id, user_id, 
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
  FROM care_recipients
)
DELETE FROM care_recipients 
WHERE id IN (
  SELECT id FROM ranked_recipients WHERE rn > 1
);

-- Clean up duplicate financial_plans records, keeping only the most recent one
WITH ranked_plans AS (
  SELECT id, user_id,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
  FROM financial_plans
)
DELETE FROM financial_plans 
WHERE id IN (
  SELECT id FROM ranked_plans WHERE rn > 1
);

-- Now add the unique constraints
ALTER TABLE care_recipients ADD CONSTRAINT care_recipients_user_id_unique UNIQUE (user_id);
ALTER TABLE financial_plans ADD CONSTRAINT financial_plans_user_id_unique UNIQUE (user_id);
