import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractJavaKotlinImports,
  extractJavaKotlinSymbolLines,
} from '../dist/source-extract/index.js';

const JAVA = `package com.example.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {
    @GetMapping("/hello")
    public String hello() {
        return "hi";
    }
}
`;

const KOTLIN = `package com.example.api

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class HelloController {
    @GetMapping("/hello")
    fun hello(): String = "hi"
}
`;

describe('extractJavaKotlinSymbolLines', () => {
  it('captures Java class and mapping', () => {
    const syms = extractJavaKotlinSymbolLines(JAVA);
    assert.ok(syms.some(s => s.includes('class HelloController')));
    assert.ok(syms.some(s => /@GetMapping/.test(s)));
  });

  it('captures Kotlin fun', () => {
    const syms = extractJavaKotlinSymbolLines(KOTLIN);
    assert.ok(syms.some(s => s.includes('class HelloController')));
    assert.ok(syms.some(s => s.startsWith('fun hello')));
  });
});

describe('extractJavaKotlinImports', () => {
  it('parses package and import', () => {
    const paths = extractJavaKotlinImports(JAVA);
    assert.ok(paths.includes('com.example.api'));
    assert.ok(paths.some(p => p.includes('springframework')));
  });
});
