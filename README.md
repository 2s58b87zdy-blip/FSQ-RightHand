# FSQ Command v5.1.2

Client-side crash hotfix.

## Fixed
- Added missing React `useRef` import used by Freja speech recognition.
- Prevents the application-wide client-side exception after deployment.
- Keeps the Workshop QA role-based approval changes from v5.1.1.

## Test
1. Deploy and hard refresh with Ctrl+F5.
2. Log in.
3. Open a Workshop project.
4. Test Tasks and Approve for welding.
5. Test the Freja microphone button.
