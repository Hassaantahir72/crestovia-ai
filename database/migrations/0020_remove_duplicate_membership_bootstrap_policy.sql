-- v0.2.31: The v0.2.30 combined INSERT policy includes the safe creator bootstrap path.
-- Drop the legacy bootstrap policy so each authenticated INSERT is evaluated once.
drop policy if exists "users bootstrap their own owner membership" on public.memberships;
