
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PAGE_SIZE, getPageWindow, PaginatedTableBody, PaginatedList } from '../src/components/Pagination';

assert.equal(PAGE_SIZE, 10);
assert.deepEqual(getPageWindow(25, 0), { page: 0, pages: 3, start: 0, end: 10 });
assert.deepEqual(getPageWindow(25, 1), { page: 1, pages: 3, start: 10, end: 20 });
assert.deepEqual(getPageWindow(25, 2), { page: 2, pages: 3, start: 20, end: 25 });
assert.deepEqual(getPageWindow(3, 8), { page: 0, pages: 1, start: 0, end: 3 });
assert.deepEqual(getPageWindow(0, -1), { page: 0, pages: 1, start: 0, end: 0 });
const records = Array.from({ length: 25 }, (_, id) => ({ id }));
const table = renderToStaticMarkup(<table><PaginatedTableBody>{records.map(record => <tr key={record.id} data-record={record.id}><td>{record.id}</td></tr>)}</PaginatedTableBody></table>);
assert.equal((table.match(/data-record=/g) || []).length, 10);
assert.ok(table.includes('Trang 1/3'));
assert.ok(!table.includes('data-record="10"'));
const list = renderToStaticMarkup(<PaginatedList>{records.map(record => <article key={record.id} data-record={record.id}>{record.id}</article>)}</PaginatedList>);
assert.equal((list.match(/data-record=/g) || []).length, 10);
const short = renderToStaticMarkup(<PaginatedList><article key="single">Single</article></PaginatedList>);
assert.ok(!short.includes('<nav'));
console.log('Passed: ten record limit, table/card rendering, page bounds and empty/small lists.');
