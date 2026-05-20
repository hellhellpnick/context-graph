import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractGoImports,
  extractGoSymbolLines,
} from '../dist/source-extract/index.js';

const SAMPLE = `package api

import (
    "fmt"
    alias "example.com/lib"
)

type Reader interface {
    Read([]byte) (int, error)
}

type Server struct {
    Host string
}

func (s *Server) Listen() error {
    return fmt.Errorf("fail")
}

func Hello() {}
`;

describe('extractGoSymbolLines', () => {
  it('captures package, types, methods, and funcs', () => {
    const syms = extractGoSymbolLines(SAMPLE);
    assert.ok(syms.some(s => s.startsWith('package api')));
    assert.ok(syms.some(s => s.includes('type Reader interface')));
    assert.ok(syms.some(s => s.startsWith('type Server struct')));
    assert.ok(syms.some(s => s.includes('func (s *Server) Listen')));
    assert.ok(syms.some(s => s.startsWith('func Hello')));
  });
});

describe('extractGoImports', () => {
  it('parses single and block imports', () => {
    const paths = extractGoImports(SAMPLE);
    assert.ok(paths.includes('fmt'));
    assert.ok(paths.includes('example.com/lib'));
  });
});
