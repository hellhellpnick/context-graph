import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractRubyImports,
  extractRubySymbolLines,
} from '../dist/source-extract/index.js';

const SAMPLE = `require 'rails'
require_relative './models/user'

class UsersController < ApplicationController
  def index
    render json: User.all
  end

  def show
    head :not_found unless @user
  end
end

module Admin
  def self.enabled?
    true
  end
end
`;

describe('extractRubySymbolLines', () => {
  it('captures class, def, and module', () => {
    const syms = extractRubySymbolLines(SAMPLE);
    assert.ok(syms.some(s => s.includes('class UsersController')));
    assert.ok(syms.some(s => s.startsWith('def index')));
    assert.ok(syms.some(s => s.includes('module Admin')));
  });
});

describe('extractRubyImports', () => {
  it('parses require and require_relative', () => {
    const paths = extractRubyImports(SAMPLE);
    assert.ok(paths.includes('rails'));
    assert.ok(paths.includes('./models/user'));
  });
});
