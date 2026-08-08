/**
 * Posts a short summary of this run's newly-scraped polls (data/newPolls.json,
 * written by fetch-polls.ts) to Telegram, Bluesky, and X. Skips whichever
 * platform is missing its credentials, and does nothing at all if there are
 * no new polls this run.
 *
 * Run with: npm run post-social
 */
import { createHmac, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { installDevProxyIfPresent } from "../lib/wikiPollScraper";
import { PARTIES } from "../lib/parties";
import type { Poll } from "../lib/types";

const NEW_POLLS_PATH = new URL("../data/newPolls.json", import.meta.url);
const SITE_URL = "https://nzpolls.vercel.app";
const LINK_LABEL = "See all polls here";
const HASHTAGS = "#NZPoll #NZ2026 #NZElections #NZPol";
const BLUESKY_MAX_LENGTH = 300;
const X_MAX_LENGTH = 280;

function formatPartyLine(poll: Poll): string {
  return PARTIES.filter((p) => p.code !== "OTH")
    .map((p) => (poll.results[p.code] !== undefined ? `${p.code} ${poll.results[p.code]}%` : null))
    .filter((v): v is string => v !== null)
    .join(", ");
}

function messageBody(newPolls: Poll[]): string {
  if (newPolls.length === 1) {
    const p = newPolls[0];
    return `New NZ poll: ${p.pollster} (${p.dateLabel})\n${formatPartyLine(p)}`;
  }
  const names = newPolls.map((p) => `${p.pollster} (${p.dateLabel})`).join(", ");
  return `${newPolls.length} new NZ polls added: ${names}`;
}

function buildMessage(newPolls: Poll[]): string {
  return `${messageBody(newPolls)}\n${LINK_LABEL}\n${SITE_URL}\n${HASHTAGS}`;
}

// The link line and hashtags are the part every post must keep -- only the
// poll details in between get trimmed to fit a platform's char cap (300 for
// Bluesky, 280 for X).
function truncateMessage(newPolls: Poll[], maxLength: number): string {
  const tail = `\n${LINK_LABEL}\n${SITE_URL}\n${HASHTAGS}`;
  const body = messageBody(newPolls);
  if ((body + tail).length <= maxLength) return body + tail;
  const budget = maxLength - tail.length - 1; // 1 char for the ellipsis
  return `${body.slice(0, budget)}…${tail}`;
}

async function postToTelegram(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.log("Skipping Telegram post: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set.");
    return;
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message }),
  });
  if (!res.ok) {
    throw new Error(`Telegram post failed: ${res.status} ${await res.text()}`);
  }
  console.log("Posted to Telegram.");
}

interface BlueskyFacet {
  index: { byteStart: number; byteEnd: number };
  features: Array<{ $type: string; uri?: string; tag?: string }>;
}

function utf8Length(text: string): number {
  return new TextEncoder().encode(text).length;
}

// Bluesky doesn't auto-linkify plain text the way Telegram does -- URLs and
// hashtags only render as clickable rich text if the post record explicitly
// marks them up as "facets", indexed by UTF-8 *byte* offset (not JS string
// index, which would be wrong as soon as the text has a multi-byte
// character like the en dash in a poll's date range).
function buildFacets(text: string): BlueskyFacet[] {
  const facets: BlueskyFacet[] = [];

  const urlIndex = text.indexOf(SITE_URL);
  if (urlIndex !== -1) {
    const byteStart = utf8Length(text.slice(0, urlIndex));
    facets.push({
      index: { byteStart, byteEnd: byteStart + utf8Length(SITE_URL) },
      features: [{ $type: "app.bsky.richtext.facet#link", uri: SITE_URL }],
    });
  }

  for (const match of text.matchAll(/#\w+/g)) {
    const byteStart = utf8Length(text.slice(0, match.index));
    facets.push({
      index: { byteStart, byteEnd: byteStart + utf8Length(match[0]) },
      features: [{ $type: "app.bsky.richtext.facet#tag", tag: match[0].slice(1) }],
    });
  }

  return facets;
}

async function postToBluesky(message: string): Promise<void> {
  const identifier = process.env.BLUESKY_IDENTIFIER;
  const password = process.env.BLUESKY_APP_PASSWORD;
  if (!identifier || !password) {
    console.log("Skipping Bluesky post: BLUESKY_IDENTIFIER / BLUESKY_APP_PASSWORD not set.");
    return;
  }

  const sessionRes = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  if (!sessionRes.ok) {
    throw new Error(`Bluesky login failed: ${sessionRes.status} ${await sessionRes.text()}`);
  }
  const session = (await sessionRes.json()) as { accessJwt: string; did: string };

  const postRes = await fetch("https://bsky.social/xrpc/com.atproto.repo.createRecord", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessJwt}`,
    },
    body: JSON.stringify({
      repo: session.did,
      collection: "app.bsky.feed.post",
      record: {
        $type: "app.bsky.feed.post",
        text: message,
        createdAt: new Date().toISOString(),
        facets: buildFacets(message),
      },
    }),
  });
  if (!postRes.ok) {
    throw new Error(`Bluesky post failed: ${postRes.status} ${await postRes.text()}`);
  }
  console.log("Posted to Bluesky.");
}

// RFC 3986 percent-encoding: encodeURIComponent leaves !*'() unescaped,
// which OAuth 1.0a's signature spec requires escaped too.
function oauthEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!*'()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

// X's free API tier only allows posting via OAuth 1.0a user-context (not
// OAuth 2.0 app-only, which is read-only) -- signed by hand here rather than
// pulling in an OAuth client library for four lines of HMAC-SHA1.
function buildXAuthHeader(
  method: string,
  url: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  // Only the OAuth params are signed (this is a JSON body, not form-encoded,
  // so it isn't included in the signature base string) -- sorted for a
  // deterministic base string, per the OAuth 1.0a spec.
  const paramString = Object.keys(oauthParams)
    .sort()
    .map((key) => `${oauthEncode(key)}=${oauthEncode(oauthParams[key])}`)
    .join("&");
  const baseString = `${method.toUpperCase()}&${oauthEncode(url)}&${oauthEncode(paramString)}`;
  const signingKey = `${oauthEncode(consumerSecret)}&${oauthEncode(accessTokenSecret)}`;
  const signature = createHmac("sha1", signingKey).update(baseString).digest("base64");

  const headerParams: Record<string, string> = { ...oauthParams, oauth_signature: signature };
  return `OAuth ${Object.keys(headerParams)
    .sort()
    .map((key) => `${oauthEncode(key)}="${oauthEncode(headerParams[key])}"`)
    .join(", ")}`;
}

async function postToX(message: string): Promise<void> {
  const consumerKey = process.env.X_API_KEY;
  const consumerSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;
  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
    console.log("Skipping X post: X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / X_ACCESS_TOKEN_SECRET not set.");
    return;
  }

  const url = "https://api.twitter.com/2/tweets";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: buildXAuthHeader("POST", url, consumerKey, consumerSecret, accessToken, accessTokenSecret),
    },
    body: JSON.stringify({ text: message }),
  });
  if (!res.ok) {
    throw new Error(`X post failed: ${res.status} ${await res.text()}`);
  }
  console.log("Posted to X.");
}

async function main() {
  await installDevProxyIfPresent();

  const raw = await readFile(NEW_POLLS_PATH, "utf-8");
  const newPolls = JSON.parse(raw) as Poll[];
  if (newPolls.length === 0) {
    console.log("No new polls this run -- nothing to post.");
    return;
  }

  await postToTelegram(buildMessage(newPolls));
  await postToBluesky(truncateMessage(newPolls, BLUESKY_MAX_LENGTH));
  await postToX(truncateMessage(newPolls, X_MAX_LENGTH));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
