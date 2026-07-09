# Wachtwoord-reset — Supabase & build-config

De in-app wachtwoord-reset (audit cluster 8) is volledig in code gebouwd, maar
werkt **end-to-end pas** na twee handmatige stappen die niet in de codebase kunnen:
Supabase-dashboard-config en een native rebuild.

## Wat de code doet

- `lib/auth.ts` → `sendPasswordReset(email)` roept `resetPasswordForEmail` met
  `redirectTo = Linking.createURL('reset-password')` → `rowtrack://reset-password`.
- `app/(auth)/forgot-password.tsx` → request-scherm (e-mail → link → "check je mail").
- `app/(auth)/reset-password.tsx` → deep-link-doel. Parset de recovery-tokens uit
  de URL-fragment, toont het nieuw-wachtwoord-formulier, en rondt af via
  `completePasswordReset` (`setSession` → `updateUser` → `signOut`).
- `app/_layout.tsx` → de `RootNavigator` slaat de auto-redirect over op het
  reset-scherm, zodat de recovery-sessie de gebruiker niet naar de app wegkaapt.

## Stap 1 — Supabase dashboard (Jeroen)

**Authentication → URL Configuration → Redirect URLs** — voeg toe:

```
rowtrack://reset-password
```

Optioneel voor test in **Expo Go** (ander scheme): voeg ook de Expo Go-variant toe
die `Linking.createURL('reset-password')` daar produceert, bv.
`exp://127.0.0.1:8081/--/reset-password` (of het `exp://…exp.direct/--/reset-password`
tunnel-adres). In een standalone/dev-client build is `rowtrack://reset-password`
voldoende.

**Authentication → Email Templates → Reset Password** — de default-template met
`{{ .ConfirmationURL }}` werkt; die honoreert de `redirectTo`. Geen wijziging nodig
tenzij je de copy wil aanpassen.

## Stap 2 — Native rebuild

Het `scheme: rowtrack` staat al in `app.json`, maar URL-schemes worden native
geregistreerd (Info.plist / AndroidManifest). Een **Metro-reload volstaat niet** —
de deep link `rowtrack://` pakt pas na een native build:

```
pnpm ios     # of: pnpm android
```

## Security-config (Jeroen — out-of-band, uit de security-review)

- **Redirect-URL exact matchen, geen wildcard.** De hele veiligheid van de flow
  rust erop dat de recovery-tokens alleen in de app terechtkomen. Zet in de
  allowlist exact `rowtrack://reset-password` (+ evt. de Expo Go-variant), nooit
  een brede wildcard — dat zou recovery-token-hijack mogelijk maken.
- **Enumeration protection aan.** `forgot-password` lekt niets (toont altijd
  "check je mail"), maar `signUp` kan bij een bestaand adres "User already
  registered" teruggeven → account-enumeratie op registratie. Zet Supabase →
  Auth → *Enable email confirmations* / enumeration-protection aan zodat signUp
  een bestaand adres niet verraadt.
- **Rate limiting** op `resetPasswordForEmail` / `signInWithPassword` / `signUp`
  wordt server-side door GoTrue afgedwongen — controleer dat het niet is
  uitgezet in het project.

## Aannames / caveats

- **Implicit flow.** De Supabase-client (`lib/supabase.ts`) zet geen `flowType`,
  dus de default *implicit* geldt → recovery-tokens komen in de URL-**fragment**
  (`#access_token=…&refresh_token=…&type=recovery`). De parser in
  `reset-password.tsx` leest de fragment (met query als fallback). Zet je later
  `flowType: 'pkce'`, dan komt er een `?code=` en moet de parser naar
  `exchangeCodeForSession`.
- **Zelfde toestel.** De standaard-flow gaat ervan uit dat de gebruiker de mail
  op hetzelfde toestel opent als waar de reset is aangevraagd.
- **Niet in-sessie te verifiëren** (geen render-pad + geen Supabase-config in de
  build-omgeving). Test na stap 1+2 op device: aanvragen → mail → link → nieuw
  wachtwoord → inloggen.
