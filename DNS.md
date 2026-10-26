# Pointing goodcompanygames.co at this site

Notes for the owner. `_config.yml` keeps this file off the published site.

Do the steps in this order. The `CNAME` file in this repo tells GitHub to serve the site at
goodcompanygames.co, and from then on the old address redirects there. If that happens before the
domain points at GitHub, the privacy policy link in the game and in both store listings stops
working until it does.

## 1. Claim the domain on GitHub first (recommended)

This stops anyone else's GitHub Pages site from claiming goodcompanygames.co while it points at
GitHub's servers.

1. On github.com: your picture (top right) → **Settings** → **Pages** (left column, under
   *Code, planning, and automation*) → **Add a domain** → `goodcompanygames.co` → **Add domain**.
2. GitHub shows a TXT record: a name starting `_github-pages-challenge-` and a value.
3. In GoDaddy, add it (see step 2 for where): **Add New Record** → Type **TXT**, Name = that name
   *without* `.goodcompanygames.co` on the end, Value = the value → **Save**.
4. Back on GitHub, press **Verify**. If it says the record isn't there yet, wait ten minutes and
   try again.

## 2. GoDaddy: point the domain at GitHub Pages

Sign in at godaddy.com → **My Products** → next to goodcompanygames.co, **DNS**.

1. **Turn off forwarding and parking.** On the **Forwarding** tab, delete any domain or subdomain
   forwarding. On **DNS Records**, delete the `A` record for `@` whose value is `Parked` (or any
   other `A` record for `@`).
2. **Add four A records**, one at a time (**Add New Record**):

   | Type | Name | Value | TTL |
   |---|---|---|---|
   | A | `@` | `185.199.108.153` | 1 hour |
   | A | `@` | `185.199.109.153` | 1 hour |
   | A | `@` | `185.199.110.153` | 1 hour |
   | A | `@` | `185.199.111.153` | 1 hour |

3. **www**: edit the existing `CNAME` record named `www` (GoDaddy usually has one pointing at
   `@`) so its value is `wenhuangl.github.io`. If there isn't one, add it:

   | Type | Name | Value | TTL |
   |---|---|---|---|
   | CNAME | `www` | `wenhuangl.github.io` | 1 hour |

4. Optional, for visitors on IPv6, which GitHub also recommends: four `AAAA` records for `@`
   with the values `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153` and
   `2606:50c0:8003::153`.

Leave the `NS` and `SOA` records alone, and anything named `_domainconnect`.

**Check it has spread** before going on. In PowerShell:

```
Resolve-DnsName goodcompanygames.co -Type A -Server 8.8.8.8
```

It should list the four `185.199.x.153` addresses and nothing else. Usually that takes minutes;
it can take a few hours.

## 3. GitHub: publish and turn on HTTPS

1. Merge this branch into `main`. GitHub Pages rebuilds in a minute or two.
2. In the repo: **Settings** → **Pages**. Under **Custom domain** it should already say
   `goodcompanygames.co` (that comes from the `CNAME` file). If the box is empty, type it in and
   press **Save**.
3. Wait for **DNS check successful**. GitHub then requests the HTTPS certificate, which usually
   takes a few minutes and can take up to a day. While it does, the **Enforce HTTPS** box is
   greyed out.
4. Tick **Enforce HTTPS**.

Then check these all open, on a phone and a computer:

- https://goodcompanygames.co/
- https://goodcompanygames.co/gospel/
- https://goodcompanygames.co/privacy/
- https://goodcompanygames.co/app-ads.txt
- https://www.goodcompanygames.co/ (should move to the address without `www`)
- https://wenhuangl.github.io/goodcompanygames/privacy/ (should move to the new privacy address)

## 4. The store links on /gospel/

The top of the script in `gospel/index.html` has four settings. Edit them on github.com (open the
file, press the pencil, commit to `main`) as each store goes live.

```js
var APP_STORE_ID = "";     // the app's Apple ID, digits only
var PROVIDER_TOKEN = "";   // the pt= number from App Analytics → Campaigns
var IOS_LIVE = false;
var ANDROID_LIVE = false;
```

- **APP_STORE_ID**: App Store Connect → **Apps** → Gospel Puzzle → **App Information** (under
  *General*) → **Apple ID**. A number of nine or ten digits. It exists as soon as the app record
  does and never changes.
- **PROVIDER_TOKEN**: App Store Connect → **Analytics** → choose the app → **Acquisition** →
  **Campaigns** (older screens call it App Analytics → Sources → Campaigns) → **Generate a
  campaign link**, with any campaign name. The link it makes contains `pt=` followed by a number:
  copy just the number. It is the same for every app on the account. Apple may only offer this
  once the app is out; until then leave it empty, and links still work, just without campaign
  figures.
- **IOS_LIVE**: `true` once the app can actually be downloaded on the App Store. iPhones and
  iPads then go straight to it. It does nothing while APP_STORE_ID is empty.
- **ANDROID_LIVE**: `true` once the production release is out on Google Play. Not before: a
  testing-track app shows "not found" to everyone outside the test.

Every link the game shares carries a campaign (`?c=share`, `streak`, `act`, `story`, `friend`).
On iOS it arrives as `ct=` and shows up under App Analytics → Campaigns. On Android it arrives as
`utm_campaign` in the Play referrer, with `utm_source=gospel_link` and `utm_medium=share`, and
shows up in Play Console's acquisition reports.

## 5. Store listings and AdMob

- **Privacy policy URL**, in App Store Connect (App Privacy) and Play Console (App content):
  `https://goodcompanygames.co/privacy/`. The old address keeps redirecting, so this can wait.
- **Website**: in Play Console (Store settings → Contact details) and as the App Store's Support
  and Marketing URLs, use `https://goodcompanygames.co/`, not `/gospel/`. A phone opening
  `/gospel/` from the store would be sent straight back to the store.
- **app-ads.txt**: AdMob reads it from the domain of the website in the store listings, so it is
  only found once the step above is done. AdMob → **Apps** → **app-ads.txt** shows when it was
  last checked; the first check can take a day or two.
