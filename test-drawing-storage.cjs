const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');

function loadTypeScript(file, modules = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports, crypto,
    require: (name) => modules[name] ?? require(name),
  });
  return module.exports;
}

const model = loadTypeScript('drawing-model.ts');
const storageApi = loadTypeScript('drawing-storage.ts', { './drawing-model': model });
const { DRAWINGS_KEY, readDrawings, storeDrawing, removeDrawing, setDrawingOnBoard } = storageApi;
const map = new Map();
const storage = {
  getItem: (key) => map.get(key) ?? null,
  setItem: (key, value) => map.set(key, value),
};
const strokes = [{ color: '#2563EB', width: 12, points: [{ x: 25, y: 35 }, { x: 100, y: 120 }] }];
assert.equal(readDrawings(storage).length, 0);
assert.throws(() => storeDrawing(storage, []), /ارسم/);
assert.throws(() => storeDrawing(storage, [{ ...strokes[0], color: '#000000' }]), /غير صالح/);
const first = storeDrawing(storage, strokes);
const second = storeDrawing(storage, strokes);
assert.equal(readDrawings(storage)[0].showOnBoard, false);
setDrawingOnBoard(storage, first.id, true);
assert.equal(readDrawings(storage)[0].showOnBoard, true);
assert.equal(readDrawings(storage)[1].showOnBoard, false);
assert.equal(readDrawings(storage).length, 2);
const beforeFullAttempt = map.get(DRAWINGS_KEY);
assert.throws(() => storeDrawing(storage, strokes), /رسمتين/);
assert.equal(map.get(DRAWINGS_KEY), beforeFullAttempt);
const updated = [{ ...strokes[0], color: '#EF4444' }];
storeDrawing(storage, updated, first.id);
assert.equal(readDrawings(storage)[0].showOnBoard, true);
setDrawingOnBoard(storage, first.id, false);
assert.equal(readDrawings(storage)[0].showOnBoard, false);
assert.equal(readDrawings(storage).length, 2);
const legacy = JSON.parse(map.get(DRAWINGS_KEY));
legacy.drawings.forEach((drawing) => delete drawing.showOnBoard);
map.set(DRAWINGS_KEY, JSON.stringify(legacy));
assert.equal(readDrawings(storage).length, 2);
setDrawingOnBoard(storage, first.id, true);
assert.equal(readDrawings(storage)[0].showOnBoard, true);
assert.equal(readDrawings(storage).length, 2);
assert.equal(readDrawings(storage)[0].strokes[0].color, '#EF4444');
assert.equal(readDrawings(storage)[1].id, second.id);
removeDrawing(storage, second.id);
assert.equal(readDrawings(storage).length, 1);
storeDrawing(storage, strokes);
assert.equal(readDrawings(storage).length, 2);
const beforeFailure = map.get(DRAWINGS_KEY);
assert.throws(() => storeDrawing({
  getItem: storage.getItem,
  setItem: () => { throw new Error('quota'); },
}, updated, first.id), /quota/);
assert.equal(map.get(DRAWINGS_KEY), beforeFailure);
map.set(DRAWINGS_KEY, 'invalid JSON');
assert.throws(() => storeDrawing(storage, strokes), /لم يتم حذفها/);
assert.equal(map.get(DRAWINGS_KEY), 'invalid JSON');
console.log('Drawing storage checks passed: persistence, two-slot limit, update, delete, quota failure, corrupt-data protection.');