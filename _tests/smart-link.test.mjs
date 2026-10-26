// Checks the store redirect at the top of gospel/index.html. Run from the repo root: node --test
// Jekyll leaves folders starting with "_" off the published site.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const page = readFileSync(new URL("../gospel/index.html", import.meta.url), "utf8");
const script = page.match(/<script>([\s\S]*?)<\/script>/)[1];

const UA = {
  iPhone: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  iPod: "Mozilla/5.0 (iPod touch; CPU iPhone OS 15_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1",
  iPadOld: "Mozilla/5.0 (iPad; CPU OS 12_5_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1",
  // iPadOS, and a real Mac, send this same string; only the touch points tell them apart.
  mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15",
  chromeOnIPhone: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.41 Mobile/15E148 Safari/604.1",
  android: "Mozilla/5.0 (Linux; Android 15; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
  androidTablet: "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  facebookPreview: "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
};

const LIVE = { APP_STORE_ID: "6739000001", PROVIDER_TOKEN: "128734", IOS_LIVE: true, ANDROID_LIVE: true };
const APP_STORE = "https://apps.apple.com/app/id6739000001";
const PLAY = "https://play.google.com/store/apps/details?id=com.goodcompanygames.gospel&referrer=";

// Runs the page's script as a browser would on load, with the config lines swapped for `config`.
function visit({ ua, touch = 0, search = "", config = {} }) {
  let source = script;
  for (const [name, value] of Object.entries(config)) {
    const line = new RegExp(`var ${name} = [^;]*;`);
    assert.match(source, line, `config line for ${name}`);
    source = source.replace(line, `var ${name} = ${JSON.stringify(value)};`);
  }

  const elements = {};
  for (const store of ["ios", "android"]) {
    elements[`${store}-link`] = { hidden: true, href: "" };
    elements[`${store}-soon`] = { hidden: false };
  }
  let redirect = null;
  let ready = null;
  vm.runInNewContext(source, {
    navigator: { userAgent: ua, maxTouchPoints: touch },
    location: { search, replace: (url) => { redirect = url; } },
    document: {
      addEventListener: (type, fn) => { if (type === "DOMContentLoaded") ready = fn; },
      getElementById: (id) => elements[id],
    },
  });
  if (ready) ready();

  const offered = (store) => (elements[`${store}-link`].hidden ? null : elements[`${store}-link`].href);
  const soon = (store) => !elements[`${store}-soon`].hidden;
  return { redirect, ios: offered("ios"), android: offered("android"), iosSoon: soon("ios"), androidSoon: soon("android") };
}

const stays = (result) => assert.equal(result.redirect, null);

test("as shipped, nothing redirects and both stores say coming soon", () => {
  for (const [name, ua] of Object.entries(UA)) {
    for (const touch of [0, 5]) {
      const result = visit({ ua, touch, search: "?c=share" });
      stays(result);
      assert.deepEqual(
        [result.ios, result.android, result.iosSoon, result.androidSoon],
        [null, null, true, true],
        name,
      );
    }
  }
});

test("iPhone, iPod and iPad go to the App Store with the campaign", () => {
  const expected = `${APP_STORE}?pt=128734&ct=share`;
  assert.equal(visit({ ua: UA.iPhone, touch: 5, search: "?c=share", config: LIVE }).redirect, expected);
  assert.equal(visit({ ua: UA.chromeOnIPhone, touch: 5, search: "?c=share", config: LIVE }).redirect, expected);
  assert.equal(visit({ ua: UA.iPod, touch: 5, search: "?c=share", config: LIVE }).redirect, expected);
  assert.equal(visit({ ua: UA.iPadOld, touch: 5, search: "?c=share", config: LIVE }).redirect, expected);
  // iPadOS 13 and later: a Mac user agent with a touchscreen.
  assert.equal(visit({ ua: UA.mac, touch: 5, search: "?c=share", config: LIVE }).redirect, expected);
});

test("Android phones and tablets go to Google Play with the campaign in the referrer", () => {
  const expected = PLAY + "utm_source%3Dgospel_link%26utm_medium%3Dshare%26utm_campaign%3Dstreak";
  assert.equal(visit({ ua: UA.android, touch: 5, search: "?c=streak", config: LIVE }).redirect, expected);
  assert.equal(visit({ ua: UA.androidTablet, touch: 10, search: "?c=streak", config: LIVE }).redirect, expected);
});

test("a computer, or a link-preview crawler, stays and is offered both stores", () => {
  for (const ua of [UA.mac, UA.windows, UA.facebookPreview]) {
    const result = visit({ ua, search: "?c=friend", config: LIVE });
    stays(result);
    assert.equal(result.ios, `${APP_STORE}?pt=128734&ct=friend`);
    assert.equal(result.android, PLAY + "utm_source%3Dgospel_link%26utm_medium%3Dshare%26utm_campaign%3Dfriend");
    assert.equal(result.iosSoon, false);
    assert.equal(result.androidSoon, false);
  }
});

test("a store that isn't live keeps its phones here and says coming soon", () => {
  const androidOnly = { ...LIVE, IOS_LIVE: false };
  const iPhone = visit({ ua: UA.iPhone, touch: 5, search: "?c=act", config: androidOnly });
  stays(iPhone);
  assert.equal(iPhone.ios, null);
  assert.equal(iPhone.iosSoon, true);
  assert.equal(iPhone.android, PLAY + "utm_source%3Dgospel_link%26utm_medium%3Dshare%26utm_campaign%3Dact");
  assert.match(visit({ ua: UA.android, search: "?c=act", config: androidOnly }).redirect, /^https:\/\/play\.google\.com\//);

  const iosOnly = { ...LIVE, ANDROID_LIVE: false };
  const android = visit({ ua: UA.android, touch: 5, search: "?c=act", config: iosOnly });
  stays(android);
  assert.equal(android.android, null);
  assert.equal(android.androidSoon, true);
  assert.equal(android.ios, `${APP_STORE}?pt=128734&ct=act`);
  assert.equal(visit({ ua: UA.iPhone, search: "?c=act", config: iosOnly }).redirect, `${APP_STORE}?pt=128734&ct=act`);
});

test("iOS is not treated as live without an App Store ID", () => {
  const result = visit({ ua: UA.iPhone, touch: 5, search: "?c=share", config: { ...LIVE, APP_STORE_ID: "" } });
  stays(result);
  assert.equal(result.iosSoon, true);
});

test("pt and ct are each left out when there is nothing to send", () => {
  const go = (config, search) => visit({ ua: UA.iPhone, touch: 5, search, config: { ...LIVE, ...config } }).redirect;
  assert.equal(go({ PROVIDER_TOKEN: "" }, ""), APP_STORE);
  assert.equal(go({ PROVIDER_TOKEN: "" }, "?c=share"), `${APP_STORE}?ct=share`);
  assert.equal(go({}, ""), `${APP_STORE}?pt=128734`);
  assert.equal(
    visit({ ua: UA.android, search: "", config: LIVE }).redirect,
    PLAY + "utm_source%3Dgospel_link%26utm_medium%3Dshare",
  );
});

test("the campaign is cut down to letters, digits and hyphens, 30 at most", () => {
  const campaign = (search) => {
    const url = visit({ ua: UA.windows, search, config: LIVE }).ios;
    return new URL(url).searchParams.get("ct");
  };
  assert.equal(campaign("?c=church-St_Marys!"), "church-StMarys");
  assert.equal(campaign("?c=%3Cscript%3Ealert(1)%3C%2Fscript%3E"), "scriptalert1script");
  assert.equal(campaign("?c=poster%2Dlibrary"), "poster-library");
  assert.equal(campaign("?c=a+b%20c"), "abc");
  assert.equal(campaign("?c=%E0%A4%A"), "E0A4A");
  assert.equal(campaign("?c=" + "x".repeat(50)), "x".repeat(30));
  assert.equal(campaign("?ref=qr&c=lent27"), "lent27");
  assert.equal(campaign("?c=share#top"), "share");
  assert.equal(campaign("?cc=share"), null);
  assert.equal(campaign("?c="), null);
  assert.equal(campaign("?c=%22%3E%26"), null);
});

test("link previews: title, description and a 1200x630 image at an absolute URL", () => {
  const meta = (attr, key) => page.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)">`))?.[1];
  const title = "Gospel — a daily logic puzzle that ends in scripture";
  assert.equal(page.match(/<title>([^<]*)<\/title>/)[1], title);
  assert.equal(meta("property", "og:title"), title);
  assert.equal(meta("name", "twitter:title"), title);
  assert.equal(meta("name", "twitter:card"), "summary_large_image");
  assert.equal(meta("property", "og:url"), "https://goodcompanygames.co/gospel/");
  assert.equal(meta("property", "og:image"), "https://goodcompanygames.co/gospel/og.png");
  assert.equal(meta("name", "twitter:image"), "https://goodcompanygames.co/gospel/og.png");
  assert.ok(meta("property", "og:description").length > 50);
  assert.ok(meta("property", "og:image:alt"));

  const png = readFileSync(new URL("../gospel/og.png", import.meta.url));
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1200, 630]);
});
