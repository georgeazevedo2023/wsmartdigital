GRANT INSERT, UPDATE ON public.instance_secrets TO authenticated;

CREATE POLICY "Authorized users can create instance secrets"
ON public.instance_secrets
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.instances i
    WHERE i.id = instance_secrets.instance_id
      AND (
        i.user_id = auth.uid()
        OR public.is_super_admin(auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.user_instance_access uia
          WHERE uia.instance_id = i.id
            AND uia.user_id = auth.uid()
        )
      )
  )
);

CREATE POLICY "Authorized users can update instance secrets"
ON public.instance_secrets
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.instances i
    WHERE i.id = instance_secrets.instance_id
      AND (
        i.user_id = auth.uid()
        OR public.is_super_admin(auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.user_instance_access uia
          WHERE uia.instance_id = i.id
            AND uia.user_id = auth.uid()
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.instances i
    WHERE i.id = instance_secrets.instance_id
      AND (
        i.user_id = auth.uid()
        OR public.is_super_admin(auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.user_instance_access uia
          WHERE uia.instance_id = i.id
            AND uia.user_id = auth.uid()
        )
      )
  )
);