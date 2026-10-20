# Crestovia AI — Security and release plan

**Status:** Requirements and implementation plan. These controls are not all implemented yet. Do not treat this document as a security certification.

## Owner and access policy
- Configure the verified owner email privately in provider settings. Do not hard-code it in source or commit it to Git.
- Disable open public sign-up for the operational app. Add users only through a tested owner/admin invitation flow.
- Require verified owner email and test account recovery.
- Use least-privilege roles (owner, admin, manager, member, guest). Enforce permissions in server/database logic, not just UI.
- Do not use editable profile metadata as an authorization source.

## Two-factor authentication
Supabase Auth's built-in MFA factors are authenticator-app TOTP and phone/SMS. Email OTP or a magic link can be a primary sign-in method, but email code after a password is not a built-in Supabase MFA factor. Do not describe email-only sign-in as two independent factors.

Recommended owner setup:
1. Verified owner email and a strong unique password.
2. Enroll authenticator-app TOTP as the true second factor; document recovery and lost-device handling.
3. Optionally use email OTP for primary sign-in/recovery notifications; protect the mailbox itself with MFA.
4. Enforce MFA in frontend, API, and database authorization checks; a visible MFA screen alone is insufficient.
5. Test enrollment, challenge, recovery, factor removal, session revocation, and denial without the required assurance level.

If the owner specifically requires an email code after password entry, treat it as a custom security feature. Use trusted email delivery, short expiry, single-use hashed codes, strict rate limits, resend cooldowns, brute-force protection, audit events, and replay prevention. Review mailbox-compromise risk. Never store plaintext OTPs or send secrets through chat.

## Application security gates before launch
- [ ] Owner-only first-run setup; no open signup.
- [ ] Owner email configured privately, not committed.
- [ ] MFA enforced for owner/admin and tested server-side.
- [ ] RLS enabled and reviewed on all exposed tables.
- [ ] Cross-tenant isolation tests with two users in separate organizations.
- [ ] API verifies JWT signature, issuer, expiry, and MFA assurance where applicable.
- [ ] Role checks on every sensitive action; no model-generated arbitrary SQL or shell execution.
- [ ] Rate limits for login, OTP, password reset, AI requests, and high-risk actions.
- [ ] Secure cookies, CSRF/XSS protections, safe redirect allow-lists, security headers, dependency review.
- [ ] Secrets only in provider secret stores; no service-role key in browser code or Git.
- [ ] Audit logs for security events, approvals, role changes, and sensitive actions.
- [ ] Backup/export and restore drill; incident and recovery procedures.
- [ ] AI actions use allow-listed tools and approvals for sending, deleting, spending, access changes, and external side effects.
- [ ] Final security review and manual acceptance tests complete before deployment.

## AI provider keys
No AI provider key is required for the current foundation. When AI chat is implemented, Groq is a candidate subject to current account limits. The user will create the key and enter it directly into provider secret settings or a local .env file. Never paste it into chat, source code, or NEXT_PUBLIC_ variables. A custom email-second-factor flow may also need an email-delivery API key.

## Release policy: deploy at the end
Do not deploy a public preview or production service during development unless the owner explicitly changes this policy. Continue pushing source to private GitHub and applying/testing Supabase migrations as needed. Deploy only after feature, security, recovery, backup, and acceptance gates pass and the owner explicitly approves launch. Never enable paid plans/add-ons without approval.
