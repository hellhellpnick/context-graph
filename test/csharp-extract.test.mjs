import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractCSharpImports,
  extractCSharpSymbolLines,
} from '../dist/source-extract/index.js';

const SAMPLE = `using System;
using static System.Console;
global using MyApp.Models;

namespace MyApp.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ItemsController : ControllerBase
{
    [HttpGet]
    public IActionResult List() => Ok();
}
`;

describe('extractCSharpSymbolLines', () => {
  it('captures class, attributes, and methods', () => {
    const syms = extractCSharpSymbolLines(SAMPLE);
    assert.ok(syms.some(s => s.includes('class ItemsController')));
    assert.ok(syms.some(s => s.includes('[HttpGet]')));
    assert.ok(syms.some(s => s.includes('public IActionResult List')));
    assert.equal(syms.some(s => s.startsWith('using ')), false);
  });
});

describe('extractCSharpImports', () => {
  it('parses using, static using, and global using', () => {
    const imports = extractCSharpImports(SAMPLE);
    assert.ok(imports.includes('System'));
    assert.ok(imports.includes('System.Console'));
    assert.ok(imports.includes('MyApp.Models'));
  });
});
