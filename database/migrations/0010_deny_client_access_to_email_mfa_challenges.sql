drop policy if exists "no client access to email MFA challenges" on public.email_mfa_challenges;
create policy "no client access to email MFA challenges"
on public.email_mfa_challenges for all to anon, authenticated
using (false)
with check (false);
