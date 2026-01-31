-- Migration: Refactor size_options from string[] to object[] with label and size_code
-- This migration converts existing size_options like ["S", "M", "L"] to
-- [{"label": "S", "size_code": "001"}, {"label": "M", "size_code": "002"}, {"label": "L", "size_code": "003"}]

UPDATE products
SET size_options = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'label', elem,
      'size_code', LPAD((row_number)::text, 3, '0')
    )
  )
  FROM jsonb_array_elements_text(size_options) WITH ORDINALITY AS t(elem, row_number)
)
WHERE size_options IS NOT NULL
  AND jsonb_array_length(size_options) > 0
  AND jsonb_typeof(size_options->0) = 'string';
