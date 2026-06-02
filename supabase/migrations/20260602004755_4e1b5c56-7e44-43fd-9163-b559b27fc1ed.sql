
-- enrollments: mentors can only UPDATE their assigned enrollments
DROP POLICY IF EXISTS enrollments_admin_update ON public.enrollments;
CREATE POLICY enrollments_admin_update ON public.enrollments
FOR UPDATE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::app_role)
  OR (private.has_role(auth.uid(), 'mentor'::app_role) AND assigned_mentor_id = auth.uid())
)
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::app_role)
  OR (private.has_role(auth.uid(), 'mentor'::app_role) AND assigned_mentor_id = auth.uid())
);

-- enrollments SELECT: mentors only see assigned (admins all; students own)
DROP POLICY IF EXISTS enrollments_select_own_or_admin ON public.enrollments;
CREATE POLICY enrollments_select_own_or_admin ON public.enrollments
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR private.has_role(auth.uid(), 'admin'::app_role)
  OR (private.has_role(auth.uid(), 'mentor'::app_role) AND assigned_mentor_id = auth.uid())
);

-- compliance_responses: mentors only for assigned enrollments
DROP POLICY IF EXISTS cr_select_own_or_staff ON public.compliance_responses;
CREATE POLICY cr_select_own_or_staff ON public.compliance_responses
FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.id = compliance_responses.enrollment_id
      AND (
        e.user_id = auth.uid()
        OR (private.has_role(auth.uid(), 'mentor'::app_role) AND e.assigned_mentor_id = auth.uid())
      )
  )
);

DROP POLICY IF EXISTS cr_upsert_own_or_staff ON public.compliance_responses;
CREATE POLICY cr_upsert_own_or_staff ON public.compliance_responses
FOR ALL TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.id = compliance_responses.enrollment_id
      AND (
        e.user_id = auth.uid()
        OR (private.has_role(auth.uid(), 'mentor'::app_role) AND e.assigned_mentor_id = auth.uid())
      )
  )
)
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.id = compliance_responses.enrollment_id
      AND (
        e.user_id = auth.uid()
        OR (private.has_role(auth.uid(), 'mentor'::app_role) AND e.assigned_mentor_id = auth.uid())
      )
  )
);

-- week_progress: mentors only for assigned enrollments
DROP POLICY IF EXISTS wp_select_own_or_staff ON public.week_progress;
CREATE POLICY wp_select_own_or_staff ON public.week_progress
FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.id = week_progress.enrollment_id
      AND (
        e.user_id = auth.uid()
        OR (private.has_role(auth.uid(), 'mentor'::app_role) AND e.assigned_mentor_id = auth.uid())
      )
  )
);

DROP POLICY IF EXISTS wp_update_own_or_staff ON public.week_progress;
CREATE POLICY wp_update_own_or_staff ON public.week_progress
FOR UPDATE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.id = week_progress.enrollment_id
      AND (
        e.user_id = auth.uid()
        OR (private.has_role(auth.uid(), 'mentor'::app_role) AND e.assigned_mentor_id = auth.uid())
      )
  )
)
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.id = week_progress.enrollment_id
      AND (
        e.user_id = auth.uid()
        OR (private.has_role(auth.uid(), 'mentor'::app_role) AND e.assigned_mentor_id = auth.uid())
      )
  )
);

-- subscriptions: mentors only for assigned students
DROP POLICY IF EXISTS subs_select_own_or_staff ON public.subscriptions;
CREATE POLICY subs_select_own_or_staff ON public.subscriptions
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR private.has_role(auth.uid(), 'admin'::app_role)
  OR (
    private.has_role(auth.uid(), 'mentor'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.user_id = subscriptions.user_id
        AND e.assigned_mentor_id = auth.uid()
    )
  )
);

-- support_tickets: mentors only their own assigned tickets (no NULL access)
DROP POLICY IF EXISTS tickets_select ON public.support_tickets;
CREATE POLICY tickets_select ON public.support_tickets
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR private.has_role(auth.uid(), 'admin'::app_role)
  OR (private.has_role(auth.uid(), 'mentor'::app_role) AND mentor_id = auth.uid())
);

DROP POLICY IF EXISTS tickets_update_staff ON public.support_tickets;
CREATE POLICY tickets_update_staff ON public.support_tickets
FOR UPDATE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::app_role)
  OR (private.has_role(auth.uid(), 'mentor'::app_role) AND mentor_id = auth.uid())
)
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::app_role)
  OR (private.has_role(auth.uid(), 'mentor'::app_role) AND mentor_id = auth.uid())
);

-- support_ticket_messages: mirror the ticket fix
DROP POLICY IF EXISTS msgs_select ON public.support_ticket_messages;
CREATE POLICY msgs_select ON public.support_ticket_messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = support_ticket_messages.ticket_id
      AND (
        auth.uid() = t.user_id
        OR private.has_role(auth.uid(), 'admin'::app_role)
        OR (private.has_role(auth.uid(), 'mentor'::app_role) AND t.mentor_id = auth.uid())
      )
  )
);

DROP POLICY IF EXISTS msgs_insert ON public.support_ticket_messages;
CREATE POLICY msgs_insert ON public.support_ticket_messages
FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = support_ticket_messages.ticket_id
      AND (
        auth.uid() = t.user_id
        OR private.has_role(auth.uid(), 'admin'::app_role)
        OR (private.has_role(auth.uid(), 'mentor'::app_role) AND t.mentor_id = auth.uid())
      )
  )
);
