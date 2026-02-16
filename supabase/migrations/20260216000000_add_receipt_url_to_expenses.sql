-- Add receipt_url column to project_expenses table
ALTER TABLE project_expenses
ADD COLUMN receipt_url TEXT;

-- Optional: Add a comment to the column
COMMENT ON COLUMN project_expenses.receipt_url IS 'URL of the uploaded receipt image (R2)';
