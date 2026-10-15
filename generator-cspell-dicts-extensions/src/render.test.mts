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

    it('keeps whitespace and allows tags across lines', () => {
        const template = '{\n    <% if (a) { %>\n    "a": 1\n    <%\n    } %>\n}\n';
        assert.equal(render(template, { a: true }), '{\n    \n    "a": 1\n    \n}\n');
        assert.equal(render(template, { a: false }), '{\n    \n}\n');
    });

    it('rejects unknown values and unsupported tags', () => {
        assert.throws(() => render('<%= missing %>', {}), /Unknown template value: missing/);
        assert.throws(() => render('<%= a + b %>', { a: '', b: '' }), /Unsupported template expression/);
        assert.throws(() => render('<% for (const x of y) { %>', {}), /Unsupported template tag/);
        assert.throws(() => render('<%- raw %>', { raw: '' }), /Unsupported template tag/);
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
