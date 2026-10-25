# DerekDesk

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Owner-delegated JavaScript ES modules, Node.js 24.15–24.x, built-in node:sqlite, HTTP and test runner. No external npm dependencies. Local-first self-hosted single-organization server.

## Users

Company administrator approves RU/KK knowledge; operators answer unknown questions; visitors retrieve their own answers by private proof. All current demonstration records are synthetic. No company pilot or demand is confirmed.

## Product Purpose

Connect exact approved text, its source, version and review date with a real employee reply. Botpress is a category reference, not copied code; no competitor defects are confirmed.

## Capabilities and Constraints

27 passing domain, HTTP and snapshot tests. Browser create/approve/ask/handoff/reply/retrieve flows checked; post-review fixes preserve multiple case proofs, original source alongside human resolution, unique queue field labels and translated RU/KK visitor chrome. Admin can disable/re-enable operators: disabling revokes all sessions and login, persists across restart, preserves case history; re-enabling requires fresh login. Operators cannot change access, and the administrator cannot be disabled by this screen. Literal normalized phrase matching, no LLM/semantic retrieval. Operator UI is Russian. Cookie sessions, CSRF/Origin checks, role enforcement and separate visitor access tokens. No password reset UI.

## Evidence on Hand

src/knowledge.js, src/server.js, src/snapshot.js, tests/, public/ and .impeccable/review/ (1440/1280/390 screenshots). Own synthetic data only; actual company materials not loaded. No public server or cloud availability claim; no WhatsApp, voice, payments, multi-tenancy, load test or external security audit.

## Operating Context

Owner authorized separate GitHub repositories and individual honest email proposals with preliminary non-binding estimates on 2026-10-24. Verify sender ashyqhub@gmail.com, source contacts, Sent history and refusals before sending. No new spend or binding contracts authorized. Work is part of the priority20 batch in ../../program/program-state.json.

## Article version conflicts

Authenticated HTTP edits and approvals require expectedVersion matching the displayed content version. Compare and update are inside the same SQLite write transaction. Stale calls return409 without changing articles,cases or events;invalid/missing precondition returns400. Current edits increment version/reset approval;fresh explicit approval accepts that version. Old form input remains visible for manual reconciliation. Direct trusted KnowledgeDesk callers retain optional precondition compatibility. Approval itself does not increment content version,no automatic merge or full article version archive. Previous case source snapshots remain unchanged. Evidence:docs/edit-verification.json,27 tests.
