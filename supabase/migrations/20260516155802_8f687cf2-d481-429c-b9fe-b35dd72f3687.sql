
-- Consolidate curriculum into 4 months / 16 weeks (4 weeks per month)
UPDATE public.weeks SET module_id='da466bb1-d12c-4af2-9179-92049d64bea2' WHERE week_index IN (1,2,3,4);
UPDATE public.weeks SET module_id='d0fa0149-5d75-4a1b-a590-62ed73eb5c1b' WHERE week_index IN (5,6,7,8);
UPDATE public.weeks SET module_id='cd93e82e-396b-4a19-abeb-bf6d6864a006' WHERE week_index IN (9,10,11,12);
UPDATE public.weeks SET module_id='30b93ac9-bcb2-4ae3-9127-178e56886087' WHERE week_index IN (13,14,15,16);

DELETE FROM public.modules WHERE id IN ('1bac2bf9-3d3c-43eb-87f3-19dc37f720da','550f6922-5e7b-4137-8a27-b9be748e20ce');
