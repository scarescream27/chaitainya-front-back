# Self-updating Google Sheet (registrations, payments, teams)

A Google Sheet that reads the fest database every 15 minutes and rebuilds these tabs:

| Tab | What's in it |
|---|---|
| Summary | Per event: people, solo, teams, paid, payments to check, rejected, free. Money checked / to check, last update time |
| Registrations | Everyone signed up, with event, contact details, team, payment status, transaction ID, pass ID |
| Payments | Every payment, newest first, with status, transaction ID and who checked it |
| Teams | Every team, its code, members, how many have joined, payment |
| Accounts | Everyone who signed in |
| Queries | Contact-form messages |
| Ev · <event> | One tab per event with its participant list (only events with sign-ups) |

It is read-only: it never changes the database. Text people typed can't run as a formula.

## Setup (once, about 10 minutes)

The Google account that does this must be an **Owner or Editor of the Firebase project `chaitainya-hptu`** (adityaverma200911@gmail.com is). The sheet reads the database with that account's own access; there are no keys.

1. Go to [sheets.new](https://sheets.new) while signed in with that account. Name it e.g. "Chaitanya 2k26 – Live data".
2. **Extensions → Apps Script.**
3. In the editor, open **Project Settings** (gear icon) and tick **Show "appsscript.json" manifest file in editor**.
4. Back in **Editor**:
   - Open `appsscript.json` and replace everything with the contents of [`appsscript.json`](appsscript.json).
   - Open `Code.gs` and replace everything with the contents of [`Code.gs`](Code.gs).
   - Click **Save**.
5. In the function dropdown at the top choose **`setup`** and click **Run**.
6. Approve access: **Review permissions → your account → Advanced → Go to (project) → Allow**. ("Unverified app" is normal: it's your own script.)
7. Go back to the sheet and reload it. The tabs fill in, and a **Chaitanya** menu appears with:
   - **Refresh now**
   - **Turn on auto-refresh** (every 15 minutes, already on after step 5)
   - **Turn off auto-refresh**

## Sharing

The sheet has students' phone numbers and emails. Share it only with people who need it, as **Viewer**:

- **Share → add their email → Viewer.**
- Viewers see the data but can't run the refresh or change the script. Refresh keeps running under the account that did the setup.

## Changing things

At the top of `Code.gs`:

- `REFRESH_MINUTES`: 1, 5, 10, 15 or 30.
- `PER_EVENT_TABS`: `false` to drop the per-event tabs.

After editing, click **Save**, then run **setup** again.

## If something goes wrong

- **"Reading registrations failed (403)"**: the account that set it up has no access to the Firebase project. In the Firebase console, go to **Project settings → Users and permissions** and give it the Editor role (or use the owner account).
- **Nothing updates**: **Extensions → Apps Script → Triggers** (clock icon) should list `refresh` every 15 minutes. **Executions** shows errors.
- Google limits time-based scripts to about 90 minutes of run time per day on a free account. A refresh takes a few seconds, so every 15 minutes is well inside that.
