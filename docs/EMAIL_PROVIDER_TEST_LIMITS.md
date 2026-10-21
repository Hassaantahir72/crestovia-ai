# Email provider connection test limits

Crestovia AI v0.2.55 limits the owner-only Resend connection diagnostic to 3 attempts per minute and 10 per hour per owner account.

- The shared rate-limit check runs before the request to the Resend domains API.
- If the rate-limit service is unavailable, the test fails closed and does not contact Resend.
- This protects the diagnostic endpoint; it does not limit approved transactional email delivery, which has separate approval, idempotency, and retry controls.
- The implementation reuses migration `0032_user_rate_limits_v0_2_52.sql` and the server-only `SUPABASE_SERVICE_ROLE_KEY`. No new migration or secret is needed.
