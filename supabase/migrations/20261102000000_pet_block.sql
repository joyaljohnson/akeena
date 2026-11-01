-- Adds the family dog's two credits to the shared letter (Sealed by / Witnessed by).
-- Signed letters keep the snapshot they were signed with, so they are not touched.
update public.letter_template
set content = content || jsonb_build_object(
  'pet', jsonb_build_object(
    'name', 'Loki',
    'sealLine', 'Sealed by {pet}',
    'witnessLine', 'Witnessed by {pet}',
    'enabled', true
  )
)
where not (content ? 'pet');
