import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { escapeXml, render } from './render.mts';

describe('render', () => {
    it('inserts values', () => {
        assert.equal(render('Hello <%= name %>!', { name: 'World' }), 'Hello World!');
        assert.equal(render('<%=name%>-<%= other  %>', { name: 'a', other: 'b' }), 'a-b');
    });

    it('escapes values like EJS', () => {
        assert.equal(render('<%= v %>', { v: `Tom's & "Jerry" <b>` }), 'Tom&#39;s &amp; &#34;Jerry&#34; &lt;b&gt;');
    });

    it('inserts raw values', () => {
        assert.equal(render('const a = <%- list %>;', { list: `["a", 'b' & <c>]` }), `const a = ["a", 'b' & <c>];`);
        assert.equal(render('[<%-  empty %>]', { empty: undefined }), '[]');
    });

    it('renders undefined as empty and booleans as text', () => {
        assert.equal(render('[<%= a %>][<%= b %>]', { a: undefined, b: true }), '[][true]');
    });

    it('if / else blocks', () => {
        const template = 'a<% if (flag) { %>b<% } else { %>c<% } %>d';
        assert.equal(render(template, { flag: true }), 'abd');
        assert.equal(render(template, { flag: false }), 'acd');
        assert.equal(render(template, { flag: '' }), 'acd');
        assert.equal(render(template, { flag: 'x' }), 'abd');
    });

    it('nested blocks', () => {
        const template = '<% if (a) { %>A<% if (b) { %>B<% } else { %>b<% } %><% } else { %>-<% } %>';
        assert.equal(render(template, { a: true, b: true }), 'AB');
        assert.equal(render(template, { a: true, b: false }), 'Ab');
        assert.equal(render(template, { a: false, b: true }), '-');
    });

    it('removes lines that hold only a block tag, also across lines', () => {
        const template = '{\n    <% if (a) { %>\n    "a": 1\n    <%\n    } %>\n}\n';
        assert.equal(render(template, { a: true }), '{\n    "a": 1\n}\n');
        assert.equal(render(template, { a: false }), '{\n}\n');
        assert.equal(render('a\r\n<% if (b) { %>\r\nb\r\n<% } %>\r\nc', { b: true }), 'a\r\nb\r\nc');
        assert.equal(render('a\n<% if (b) { %>\nb\n<% } %>', { b: false }), 'a\n');
    });

    it('keeps the text around block tags that share a line', () => {
        const template = 'x <% if (a) { %>A<% } %> y\n// <% if (a) { %>\nz\n// <% } %>\n';
        assert.equal(render(template, { a: true }), 'x A y\n// \nz\n// \n');
        assert.equal(render(template, { a: false }), 'x  y\n// \n');
    });

    it('keeps lines that hold only a value tag', () => {
        assert.equal(render('a\n<%= v %>\nb', { v: '' }), 'a\n\nb');
    });

    it('rejects unknown values and unsupported tags', () => {
        assert.throws(() => render('<%= missing %>', {}), /Unknown template value: missing/);
        assert.throws(() => render('<%= a + b %>', { a: '', b: '' }), /Unsupported template expression/);
        assert.throws(() => render('<% for (const x of y) { %>', {}), /Unsupported template tag/);
        assert.throws(() => render('<%- a.b %>', { a: '' }), /Unsupported template expression/);
        assert.throws(() => render('<%# comment %>', {}), /Unsupported template tag/);
    });

    it('rejects unbalanced blocks', () => {
        assert.throws(() => render('<% if (a) { %>', { a: true }), /Unclosed if block/);
        assert.throws(() => render('<% } %>', {}), /Unexpected end of block/);
        assert.throws(() => render('<% } else { %>', {}), /Unexpected else/);
        assert.throws(
            () => render('<% if (a) { %><% } else { %><% } else { %><% } %>', { a: true }),
            /Unexpected else/,
        );
    });
});

describe('escapeXml', () => {
    it('leaves plain text alone', () => {
        assert.equal(escapeXml('plain text'), 'plain text');
    });
});
