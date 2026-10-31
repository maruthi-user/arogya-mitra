# Release checks and future integrations

Implemented: supplied logo and responsive role landing; provider/admin login; passwordless guest patients; provider applications with review-before-submit; admin approval/rejection with mandatory instructions/reason; one-use activation/reset links; scoped appointment workflows and real slot lookup; pharmacy inquiry/inventory operations; transactional SMTP notifications; admin audit history; API-only operation.

Before public release: configure HTTPS, production database/migrations, backup/restore, SMTP reputation/delivery, shared or single-instance session/rate-limit strategy, admin credential recovery, monitoring, retention/privacy policy, abuse prevention and independent security/accessibility/load testing. Verify real browser/device layouts and speech compatibility.

Not connected: official medical-registration verification, ambulance dispatch integration, external pharmacy inventory feeds, guest request recovery across sessions/devices, conversational LLM intent handling. Emergency assistance currently offers a direct call, not a dispatch confirmation. Provider approval must not be labelled as license verification.
