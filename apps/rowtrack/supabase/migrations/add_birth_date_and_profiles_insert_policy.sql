-- birth_date: referenced by app/(tabs)/profile.tsx but never added via migration
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date date;

-- Defense-in-depth: profiles had no INSERT policy. Inserts normally happen via
-- the security-definer trigger handle_new_user(), but an explicit policy makes
-- the intended access model visible and covers direct client inserts.
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);
