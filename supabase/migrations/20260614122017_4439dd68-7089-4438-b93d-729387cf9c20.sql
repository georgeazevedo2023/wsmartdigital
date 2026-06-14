CREATE TABLE public.instance_secrets (
  instance_id text PRIMARY KEY REFERENCES public.instances(id) ON DELETE CASCADE,
  token text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT ALL ON public.instance_secrets TO service_role;
ALTER TABLE public.instance_secrets ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_instance_secrets_updated_at ON public.instance_secrets;
CREATE TRIGGER set_instance_secrets_updated_at
BEFORE UPDATE ON public.instance_secrets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.instance_secrets (instance_id, token)
SELECT id, token
FROM public.instances
ON CONFLICT (instance_id) DO UPDATE
SET token = EXCLUDED.token,
    updated_at = now();

ALTER TABLE public.instances DROP COLUMN token;

DROP POLICY IF EXISTS "Users can upload carousel images" ON storage.objects;
CREATE POLICY "Users can upload carousel images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'carousel-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Criadores e responsáveis atualizam cards" ON public.kanban_cards;
CREATE POLICY "Criadores e responsáveis atualizam cards"
ON public.kanban_cards
FOR UPDATE
TO authenticated
USING (
  (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.kanban_boards b
      WHERE b.id = kanban_cards.board_id
        AND b.created_by = auth.uid()
    )
  )
  AND public.can_access_kanban_board(auth.uid(), board_id)
)
WITH CHECK (
  (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.kanban_boards b
      WHERE b.id = kanban_cards.board_id
        AND b.created_by = auth.uid()
    )
  )
  AND public.can_access_kanban_board(auth.uid(), board_id)
);