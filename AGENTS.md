<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Access control lives in database RLS (patient = own rows, praticien = own patients with MFA aal2, admin = aal2); UI gates are convenience only.
- Admin account/role management goes through server functions in src/lib/admin.functions.ts that verify admin role + aal2 before using the admin client.
- Audit entries are written by DB triggers or the `log_access` RPC, never by direct inserts from the browser.
