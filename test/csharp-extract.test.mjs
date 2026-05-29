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

const WINUI_MAIN_WINDOW = `namespace AutoDarkModeApp;

public sealed partial class MainWindow : Window
{
    public MainWindow()
    {
        ApplySystemThemeToCaptionButtons();
    }

    private void NavViewTitleBar_BackRequested(Microsoft.UI.Xaml.Controls.TitleBar sender, object args)
    {
    }

    private void ApplySystemThemeToCaptionButtons()
    {
    }

    private async void MainWindow_Closed(object sender, WindowEventArgs args)
    {
    }
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

  it('captures WinUI partial class and methods with brace on next line', () => {
    const syms = extractCSharpSymbolLines(WINUI_MAIN_WINDOW);
    assert.ok(syms.some(s => s.includes('partial class MainWindow')));
    assert.ok(syms.some(s => s.includes('ApplySystemThemeToCaptionButtons')));
    assert.ok(syms.some(s => s.includes('MainWindow_Closed')));
    assert.ok(syms.length >= 4);
  });
});

const SHELL_PROGRAM = `#region copyright
// license header
#endregion
namespace AutoDarkModeComms;

class Program
{
    public const string QuitShell = "QuitShell";

    static void Main(string[] args)
    {
    }

    public static string GetExecutionPathService()
    {
    }
}
`;

describe('extractCSharpSymbolLines (shell Program)', () => {
  it('captures default-internal class, Main, consts, and public methods', () => {
    const syms = extractCSharpSymbolLines(SHELL_PROGRAM);
    assert.ok(syms.some(s => /\bclass Program\b/.test(s)));
    assert.ok(syms.some(s => s.includes('static void Main')));
    assert.ok(syms.some(s => s.includes('QuitShell')));
    assert.ok(syms.some(s => s.includes('GetExecutionPathService')));
    assert.ok(syms.length >= 4);
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
