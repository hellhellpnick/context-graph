import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractRustImports,
  extractRustSymbolLines,
} from '../dist/source-extract/index.js';

const SAMPLE = `use std::io;
use axum::{Router, routing::get};

mod handlers;

pub struct AppState {
    db: String,
}

pub async fn health() -> &'static str {
    "ok"
}

#[get("/api")]
async fn list_items() -> Vec<String> {
    vec![]
}
`;

describe('extractRustSymbolLines', () => {
  it('captures struct, fn, and route attributes', () => {
    const syms = extractRustSymbolLines(SAMPLE);
    assert.ok(syms.some(s => s.includes('struct AppState')));
    assert.ok(syms.some(s => s.includes('async fn health')));
    assert.ok(syms.some(s => /#\[get/.test(s)));
  });
});

describe('extractRustImports', () => {
  it('parses use and mod', () => {
    const paths = extractRustImports(SAMPLE);
    assert.ok(paths.some(p => p.startsWith('std')));
    assert.ok(paths.includes('axum'));
    assert.ok(paths.includes('handlers'));
  });
});
