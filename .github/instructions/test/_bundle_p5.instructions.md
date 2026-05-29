---
description: "Mirror — `test/` (2 files, part 5/5)"
applyTo: "test/**"
priority: "P2"
last_updated: "2026-05-29"
---

## When to Read
- editing or refactoring `ruby-extract.test.mjs`
- editing or refactoring `rust-extract.test.mjs`

## Overview
- `test/ruby-extract.test.mjs` (44 lines) — Mirror — `test/` (2 files, part 5/5)
- `test/rust-extract.test.mjs` (44 lines) — Mirror — `test/` (2 files, part 5/5)

## Graph
```mermaid
graph LR
  Test[Test]
  Test --> index[index]
```

## Signatures

```typescript
// ── test/ruby-extract.test.mjs ──
// ── skeleton ──
const SAMPLE = `require 'rails' require_relative './models/user' class UsersController < ApplicationController def index render json: User.all end def show head :not_found unless @user end end module…

// ── test/rust-extract.test.mjs ──
// ── skeleton ──
const SAMPLE = `use std::io; use axum::{Router, routing::get}; mod handlers; pub struct AppState { db: String, } pub async fn health() -> &'static str { "ok" } #[get("/api")] async fn list_items() ->…

```

## Dependencies
**Internal:**
- `dist/source-extract/index`
