import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../apps/web/app/page.tsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../apps/web/app/globals.css", import.meta.url), "utf8");

test("public landing page presents the core Crestovia AI value proposition", () => {
  assert.match(page, /Less busywork/);
  assert.match(page, /More forward/);
  assert.match(page, /Crestovai AI/i);
  assert.match(page, /human-approved actions/i);
});

test("landing page links into the existing sign-in flow", () => {
  assert.match(page, /href="\/login"/);
  assert.match(page, /href="#capabilities"/);
});

test("landing page includes all three capability cards", () => {
  assert.match(page, /Meet Crestovai AI, your AI partner/);
  assert.match(page, /One home for every department/);
  assert.match(page, /Voice, chat, and trusted actions/);
});

test("landing page styling supports responsive layouts and reduced motion", () => {
  assert.match(styles, /\.landing-hero/);
  assert.match(styles, /@media\s*\(max-width:\s*640px\)/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
});
