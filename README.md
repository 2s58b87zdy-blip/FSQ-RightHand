# FSQ Command 6.0.3.1 Stability Hotfix

No new modules are included.

## Fixed
- Validates all local browser state before loading it.
- Removes malformed or incompatible FSQ localStorage entries.
- Prevents invalid saved arrays from crashing the application.
- Adds a recovery screen instead of the black Next.js client exception page.
- Recovery button clears only keys beginning with `fsq-`.
- Azure Blob files are not deleted by local recovery.

## Test
1. Deploy and hard-refresh with Ctrl+F5.
2. Log in and open Dashboard, My Jobs, Projects and Workshop QC.
3. If the recovery screen appears, click Reset local data and restart.
