import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractPythonImports,
  extractPythonSymbolLines,
} from '../dist/source-extract/index.js';

const SAMPLE = `from fastapi import APIRouter
import os

router = APIRouter()

@router.get("/items")
async def list_items():
    pass

class ItemService:
    def run(self):
        pass
`;

describe('extractPythonSymbolLines', () => {
  it('captures def, class, and dotted route decorators', () => {
    const syms = extractPythonSymbolLines(SAMPLE);
    assert.ok(syms.some(s => s.includes('async def list_items')));
    assert.ok(syms.some(s => s.startsWith('class ItemService')));
    assert.ok(syms.some(s => s.includes('@router.get')));
    assert.equal(syms.some(s => s.startsWith('from ')), false);
    assert.equal(syms.some(s => s.startsWith('import ')), false);
  });
});

describe('extractPythonImports', () => {
  it('parses from and import lines', () => {
    assert.deepEqual(extractPythonImports(SAMPLE), ['fastapi', 'os']);
  });
});
