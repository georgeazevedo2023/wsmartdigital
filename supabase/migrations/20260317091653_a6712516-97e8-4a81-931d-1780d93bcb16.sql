-- Drop overly broad SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view contacts" ON public.contacts;

-- Create scoped SELECT policy: users can only see contacts linked to conversations in their inboxes
CREATE POLICY "Inbox members can view contacts"
ON public.contacts FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.contact_id = contacts.id
    AND has_inbox_access(auth.uid(), c.inbox_id)
  )
);
