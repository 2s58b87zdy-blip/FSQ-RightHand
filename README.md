# FSQ Command v5.3.2

Permission management and workshop approval hotfix.

## Fixed
- Removed duplicate `canApproveTackAndComplete` definition that stopped the build.
- Only Flemming and Jakob can approve tack welding, final weld and job completion.

## New permission rule
Only Flemming can:
- assign user roles
- change user roles
- grant or remove permissions
- manage approval permissions
- create or delete users where those controls exist

Recognized owner accounts:
- Flemming
- Flemming Bach

Jakob can still approve workshop welding and complete jobs, but cannot assign permissions.

## Test
1. Log in as Flemming and change a user's role.
2. Log in as Jakob and verify role controls are blocked.
3. Log in as another administrator and verify role controls are blocked.
4. Verify Flemming and Jakob can still approve workshop QA.
