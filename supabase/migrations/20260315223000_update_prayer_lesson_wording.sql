-- Update "The Power of Prayer in Choir" wording
-- This migration updates the content to remove the scientific reference and use more spiritual language as requested.

UPDATE public.choir_academy_modules
SET content = REPLACE(
    content,
    'Scientific studies and spiritual traditions alike suggest that synchronisation happens when we pray together, but for us, it is about alignment with the Father''s heart.',
    'There is a synchronisation that happens when we pray together, we align ourseves to the heart of God almighty.'
)
WHERE title ILIKE '%Power of Prayer%' OR title ILIKE '%Prayer in Choir%';
