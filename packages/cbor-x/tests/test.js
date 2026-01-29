import * as vm from 'node:vm';
import chai from 'chai';
import { readFileSync } from 'fs';
import * as CBOR from '../node-index.js';

const sampleData = JSON.parse(
  readFileSync(new URL('./example4.json', import.meta.url))
);

const senmlData = [
  { bn: '/3303/0/5700', bt: 1278887, v: 35.5 },
  { t: 10, v: 34 },
  { t: 20, v: 33 },
  { t: 30, v: 32 },
  { t: 40, v: 31 },
  { t: 50, v: 30 },
];

const senmlKeys = {
  bs: -6,
  bv: -5,
  bu: -4,
  bt: -3,
  bn: -2,
  n: 0,
  u: 1,
  v: 2,
  vs: 3,
  t: 6,
  ut: 7,
  vd: 8,
};

//import inspector from 'inspector'; inspector.open(9229, null, true); debugger
function tryRequire(module) {
  try {
    return require(module);
  } catch (error) {
    return {};
  }
}
var assert = chai.assert;

var Encoder = CBOR.Encoder;
var EncoderStream = CBOR.EncoderStream;
var DecoderStream = CBOR.DecoderStream;
var decode = CBOR.decode;
var encode = CBOR.encode;
var encodeAsIterable = CBOR.encodeAsIterable;
var encodeAsAsyncIterable = CBOR.encodeAsAsyncIterable;
var DECIMAL_FIT = CBOR.DECIMAL_FIT;

var addExtension = CBOR.addExtension;

var zlib = tryRequire('zlib');
var deflateSync = zlib.deflateSync;
var inflateSync = zlib.inflateSync;
var deflateSync = zlib.brotliCompressSync;
var inflateSync = zlib.brotliDecompressSync;
var constants = zlib.constants;
try {
  //	var { decode, encode } = require('msgencode-lite')
} catch (error) {}

var ITERATIONS = 4000;

suite('CBOR basic tests', () => {
  test('encode/decode with keyMaps (basic)', () => {
    var data = senmlData;
    const cborSenml = new Encoder({ useRecords: false, keyMap: senmlKeys });
    const cborBasic = new Encoder();
    var serialized = cborSenml.encode(data);
    var deserialized = cborSenml.decode(serialized);
    assert(serialized.length < cborBasic.encode(data).length);
    assert.deepEqual(deserialized, data);
  });

  test('encode/decode with keyMaps and Records)', () => {
    var data = senmlData;
    const cborSenml = new Encoder({ useRecords: true, keyMap: senmlKeys });
    const cborBasic = new Encoder();
    var serialized = cborSenml.encode(data);
    var deserialized = cborSenml.decode(serialized);
    assert(serialized.length < cborBasic.encode(data).length);
    assert.deepEqual(deserialized, data);
  });

  test('encode/decode data', () => {
    var data = {
      data: [
        { a: 1, name: 'one', type: 'odd', isOdd: true },
        { a: 2, name: 'two', type: 'even' },
        { a: 3, name: 'three', type: 'odd', isOdd: true },
        { a: 4, name: 'four', type: 'even' },
        { a: 5, name: 'five', type: 'odd', isOdd: true },
        { a: 6, name: 'six', type: 'even', isOdd: null },
      ],
      description: 'some names',
      types: ['odd', 'even'],
      convertEnumToNum: [
        { prop: 'test' },
        { prop: 'test' },
        { prop: 'test' },
        { prop: 1 },
        { prop: 2 },
        { prop: [undefined] },
        { prop: null },
      ],
    };
    const structures = [];
    const encoder = new Encoder({ structures });
    var serialized = encoder.encode(data);
    serialized = encoder.encode(data);
    var deserialized = encoder.decode(serialized);
    assert.deepEqual(deserialized, data);
  });

  test('mixed structures, shared', () => {
    const data1 = { a: 1, b: 2, c: 3 };
    const data2 = { a: 1, b: 2, d: 4 };
    const data3 = { a: 1, b: 2, e: 5 };
    const structures = [];
    const encoder = new Encoder({ structures });
    var serialized = encoder.encode(data1);
    var deserialized = encoder.decode(serialized);
    assert.deepEqual(deserialized, data1);
    var serialized = encoder.encode(data2);
    var deserialized = encoder.decode(serialized);
    assert.deepEqual(deserialized, data2);
    var serialized = encoder.encode(data3);
    var deserialized = encoder.decode(serialized);
    assert.deepEqual(deserialized, data3);
  });

  test('mixed structures, unshared', () => {
    const data = [];
    const encoder = new Encoder({});
    for (let i = 0; i < 1000; i++) {
      data.push({ a: 1, ['test' + i]: i });
    }
    var serialized = encoder.encode(data);
    var deserialized = encoder.decode(serialized);
    assert.deepEqual(deserialized, data);
    serialized = encoder.encode(data);
    deserialized = encoder.decode(serialized);
    assert.deepEqual(deserialized, data);
  });

  test('mixed array', () => {
    var data = [
      'one',
      'two',
      'one',
      10,
      11,
      null,
      true,
      'three',
      'three',
      'one',
      [3, -5, -50, -400, 1.3, -5.3, true],
    ];
    const structures = [];
    const encoder = new Encoder({ structures });
    var serialized = encoder.encode(data);
    var deserialized = encoder.decode(serialized);
    assert.deepEqual(deserialized, data);
  });

  test('255 chars', () => {
    const data =
      'RRZG9A6I7xupPeOZhxcOcioFsuhszGOdyDUcbRf4Zef2kdPIfC9RaLO4jTM5JhuZvTsF09fbRHMGtqk7YAgu3vespeTe9l61ziZ6VrMnYu2CamK96wCkmz0VUXyqaiUoTPgzk414LS9yYrd5uh7w18ksJF5SlC2e91rukWvNqAZJjYN3jpkqHNOFchCwFrhbxq2Lrv1kSJPYCx9blRg2hGmYqTbElLTZHv20iNqwZeQbRMgSBPT6vnbCBPnOh1W';
    var serialized = CBOR.encode(data);
    var deserialized = CBOR.decode(serialized);
    assert.equal(deserialized, data);
  });

  test('encode/decode sample data', () => {
    var data = sampleData;
    var serialized = CBOR.encode(data);
    var deserialized = CBOR.decode(serialized);
    assert.deepEqual(deserialized, data);
    var serialized = CBOR.encode(data);
    var deserialized = CBOR.decode(serialized);
    assert.deepEqual(deserialized, data);
  });
  test('encode/decode sample data with records', () => {
    var data = sampleData;
    let sharedSerialized;
    let encoder = new Encoder({
      getStructures() {
        return;
      },
      saveStructures(shared) {
        sharedSerialized = encode(shared);
      },
      useRecords: true,
    });
    var serialized = encoder.encode(data);
    encoder = new Encoder({
      getStructures() {
        return decode(sharedSerialized);
      },
      saveStructures(shared) {
        sharedSerialized = encode(shared);
      },
      useRecords: true,
    });
    var deserialized = encoder.decode(serialized);
    assert.deepEqual(deserialized, data);
  });
  test('encode/decode sample data with packing', () => {
    var data = sampleData;
    const encoder = new Encoder({ pack: true, useRecords: false });
    var serialized = encoder.encode(data);
    var deserialized = encoder.decode(serialized);
    assert.deepEqual(deserialized, data);
  });
  test('encode/decode sample data with packing and records', () => {
    var data = sampleData;
    const structures = [];
    const encoder = new Encoder({ useStringRefs: true });
    var serialized = encoder.encode(data);
    var deserialized = encoder.decode(serialized);
    assert.deepEqual(deserialized, data);
  });
  test('encode/decode sample data with shared packing and records', () => {
    const encoder = new Encoder({ useRecords: true });
    const finishPack = encoder.findCommonStringsToPack();
    for (let i = 0; i < 20; i++) {
      const data = {
        shouldShare: 'same each time',
        shouldShare2: 'same each time 2',
        shouldntShare: 'different each time ' + i,
      };
      if (i == 10) finishPack({});
      var serialized = encoder.encode(data);
      var deserialized = encoder.decode(serialized);
      assert.deepEqual(deserialized, data);
    }
  });
  test('encode/decode sample data with individual packing, shared packing and records', () => {
    const encoder = new Encoder({ pack: true, useRecords: true });
    const finishPack = encoder.findCommonStringsToPack();
    for (let i = 0; i < 20; i++) {
      const data = {
        shouldShare: 'same each time',
        shouldShare2: 'same each time',
        shouldntShare: 'different each time ' + i,
        shouldntShare2: 'different each time ' + i,
        noPack: 'no packing ' + i,
      };
      if (i == 10) finishPack({ threshold: 5 });
      var serialized = encoder.encode(data);
      var deserialized = encoder.decode(serialized);
      assert.deepEqual(deserialized, data);
    }
  });
  test('pack/unpack sample data with bundled strings', () => {
    var data = sampleData;
    const encoder = new Encoder({
      /*structures,*/ useRecords: false,
      bundleStrings: true,
    });
    var serialized = encoder.encode(data);
    var deserialized = encoder.decode(serialized);
    assert.deepEqual(deserialized, data);
  });
  test('pack/unpack sample data with self-descriptive header', () => {
    var data = sampleData;
    const encoder = new Encoder({ useSelfDescribedHeader: true });
    var serialized = encoder.encode(data);
    var deserialized = encoder.decode(serialized);
    assert.deepEqual(deserialized, data);
    assert.equal(serialized[0], 0xd9);
    assert.equal(serialized[1], 0xd9);
    assert.equal(serialized[2], 0xf7);
  });
  if (typeof Buffer != 'undefined')
    test('replace data', () => {
      var data1 = {
        data: [
          { a: 1, name: 'one', type: 'odd', isOdd: true, a: '13 characters' },
          { a: 2, name: 'two', type: 'even', a: '11 characte' },
          { a: 3, name: 'three', type: 'odd', isOdd: true, a: '12 character' },
          { a: 4, name: 'four', type: 'even', a: '9 charact' },
          { a: 5, name: 'five', type: 'odd', isOdd: true, a: '14 characters!' },
          { a: 6, name: 'six', type: 'even', isOdd: null },
        ],
      };
      var data2 = {
        data: [
          { foo: 7, name: 'one', type: 'odd', isOdd: true },
          { foo: 8, name: 'two', type: 'even' },
          { foo: 9, name: 'three', type: 'odd', isOdd: true },
          { foo: 10, name: 'four', type: 'even' },
          { foo: 11, name: 'five', type: 'odd', isOdd: true },
          { foo: 12, name: 'six', type: 'even', isOdd: null },
        ],
      };
      var serialized1 = encode(data1);
      var serialized2 = encode(data2);
      var b = Buffer.alloc(8000);
      serialized1.copy(b);
      var deserialized1 = decode(b, serialized1.length);
      serialized2.copy(b);
      var deserialized2 = decode(b, serialized2.length);
      assert.deepEqual(deserialized1, data1);
      assert.deepEqual(deserialized2, data2);
    });
  test('extended class encode/decode', () => {
    function Extended() {}

    Extended.prototype.getDouble = function () {
      return this.value * 2;
    };
    var instance = new Extended();
    instance.value = 4;
    instance.string = 'decode this: ᾜ';
    var data = {
      prop1: 'has multi-byte: ᾜ',
      extendedInstance: instance,
      prop2: 'more string',
      num: 3,
    };
    const encoder = new Encoder();
    addExtension({
      Class: Extended,
      tag: 300,
      decode: (data) => {
        const e = new Extended();
        e.value = data[0];
        e.string = data[1];
        return e;
      },
      encode: (instance) => encoder.encode([instance.value, instance.string]),
    });
  });
  test('extended class encode/decode with self reference in structered clone', () => {
    function Extended() {}
    addExtension({
      Class: Extended,
      tag: 301,
      decode: (data) => {
        const e = new Extended();
        e.value = data[0];
        e.string = data[1];
        return e;
      },
      encode: (instance, encode) => encode([instance.value, instance.string]),
    });
    var instance = new Extended();
    instance.value = instance;
    instance.string = 'hi';
    const data = {
      extended: instance,
    };
    const encoder = new Encoder({
      structuredClone: true,
    });
    const serialized = encoder.encode(data);
    const deserialized = encoder.decode(serialized);
    assert(data.extended.value.value === data.extended);
    assert(data.extended instanceof Extended);
  });

  test('addExtension with map', () => {
    function Extended() {}
    var instance = new Extended();
    instance.value = 4;
    instance.map = new Map();
    instance.map.set('key', 'value');
    var data = {
      extendedInstance: instance,
    };
    const encoder = new Encoder();
    addExtension({
      Class: Extended,
      tag: 301,
      decode: (data) => {
        const e = new Extended();
        e.value = data[0];
        e.map = data[1];
        return e;
      },
      encode: (instance, encode) => encode([instance.value, instance.map]),
    });
    var serialized = encoder.encode(data);
    var deserialized = encoder.decode(serialized);
    assert.deepEqual(data, deserialized);
  });

  test.skip('text decoder', () => {
    const td = new TextDecoder('ISO-8859-15');
    const b = Buffer.alloc(3);
    let total = 0;
    for (var i = 0; i < 256; i++) {
      b[0] = i;
      b[1] = 0;
      b[2] = 0;
      const s = td.decode(b);
      if (!require('cbor-extract').isOneByte(s)) {
        console.log(i.toString(16), s.length);
        total++;
      }
    }
  });

  test('structured cloning: self reference', () => {
    const object = {
      test: 'string',
      children: [{ name: 'child' }],
    };
    object.self = object;
    object.children[1] = object;
    object.children[2] = object.children[0];
    object.childrenAgain = object.children;
    const encoder = new Encoder({
      structuredClone: true,
    });
    var serialized = encoder.encode(object);
    var deserialized = encoder.decode(serialized);
    assert.equal(deserialized.self, deserialized);
    assert.equal(deserialized.children[0].name, 'child');
    assert.equal(deserialized.children[1], deserialized);
    assert.equal(deserialized.children[0], deserialized.children[2]);
    assert.equal(deserialized.children, deserialized.childrenAgain);
  });
  test('nested same key', () => {
    const encoder = new Encoder();
    const r_key = 'key';
    const d_key = 'key';
    const data = { [r_key]: { [d_key]: 'foo' } };
    const enc = encoder.encode(data);
    const dec = encoder.decode(enc);
    assert.deepEqual(dec, data);
  });
  test('decode float 16', () => {
    assert.equal(decode(new Uint8Array([0xf9, 0x4a, 0x60])), 12.75);
    assert.equal(decode(new Uint8Array([0xf9, 0xc4, 0x80])), -4.5);
    assert.equal(decode(new Uint8Array([0xf9, 0x5a, 0xf9])), 223.125);
    assert.equal(decode(new Uint8Array([0xf9, 0x45, 0x80])), 5.5);
    assert.equal(decode(new Uint8Array([0xf9, 0x7c, 0])), Infinity);
    assert.equal(decode(new Uint8Array([0xf9, 0xfc, 0])), -Infinity);
    assert.isNaN(decode(new Uint8Array([0xf9, 0x7e, 0])));
  });
  test('structured cloning: types', () => {
    const b =
      typeof Buffer != 'undefined' ? Buffer.alloc(20) : new Uint8Array(20);
    const fa = new Float32Array(b.buffer, 8, 2);
    fa[0] = 2.25;
    fa[1] = 6;
    const f64a = new Float64Array([2.3, 4.7]);
    const map = new Map();
    map.set('key', 'value');
    const object = {
      error: new Error('test'),
      set: new Set(['a', 'b']),
      regexp: /test/gi,
      map,
      float32Array: fa,
      float64Array: f64a,
      uint16Array: new Uint16Array([3, 4]),
    };
    const encoder = new Encoder({
      structuredClone: true,
    });
    var serialized = encoder.encode(object);
    var deserialized = encoder.decode(serialized);
    assert.deepEqual(Array.from(deserialized.set), Array.from(object.set));
    assert.equal(deserialized.map.get('key'), 'value');
    assert.equal(deserialized.error.message, object.error.message);
    assert.equal(deserialized.regexp.test('TEST'), true);
    assert.equal(deserialized.float32Array.constructor.name, 'Float32Array');
    assert.equal(deserialized.float32Array[0], 2.25);
    assert.equal(deserialized.float32Array[1], 6);
    assert.equal(deserialized.float64Array[0], 2.3);
    assert.equal(deserialized.float64Array[1], 4.7);
    assert.equal(deserialized.uint16Array.constructor.name, 'Uint16Array');
    assert.equal(deserialized.uint16Array[0], 3);
    assert.equal(deserialized.uint16Array[1], 4);
  });

  test('explicit maps and sets', () => {
    const map = new Map();
    map.set('key', { inside: 'value' });
    const object = {
      set: new Set(['a', 'b']),
      map,
    };
    var serialized = encode(object); // default encoder
    var deserialized = decode(serialized);
    assert.deepEqual(Array.from(deserialized.set), Array.from(object.set));
    assert.equal(deserialized.map.get('key').inside, 'value');
  });

  test('object without prototype', () => {
    var data = Object.create(null);
    data.test = 3;
    var serialized = encode(data);
    var deserialized = decode(serialized);
    assert.deepEqual(deserialized, data);
  });
  test('object with __proto__', () => {
    const data = { foo: 'bar', __proto__: { isAdmin: true } };
    var serialized = encode(data);
    var deserialized = decode(serialized);
    assert.deepEqual(deserialized, { foo: 'bar' });
  });

  test('big buffer', () => {
    var size = 100000000;
    var data = new Uint8Array(size).fill(1);
    var encoded = encode(data);
    var decoded = decode(encoded);
    assert.equal(decoded.length, size);
  });
  test('little buffer', () => {
    var data =
      typeof Buffer == 'undefined' ? new Uint8Array(0) : Buffer.alloc(0);
    var encoded = encode(data);
    assert.equal(encoded.length, 1); // make sure to use canonical form
    var decoded = decode(encoded);
    assert.equal(decoded.length, 0);
  });

  test('random strings', () => {
    var data = [];
    for (var i = 0; i < 2000; i++) {
      var str = 'test';
      while (Math.random() < 0.7 && str.length < 0x100000) {
        str = str + String.fromCharCode(90 / (Math.random() + 0.01)) + str;
      }
      data.push(str);
    }
    var serialized = encode(data);
    var deserialized = decode(serialized);
    assert.deepEqual(deserialized, data);
  });

  test('map/date', () => {
    var map = new Map();
    map.set(4, 'four');
    map.set('three', 3);
    const year2039 = new Date('2039-07-05T16:22:35.792Z');
    const year2038 = new Date('2038-08-06T00:19:02.911Z');

    var data = {
      map: map,
      date: new Date(1532219539733),
      farFutureDate: new Date(3532219539133),
      ancient: new Date(-3532219539133),
      year2038,
      year2039,
      invalidDate: new Date('invalid'),
    };
    const encoder = new Encoder();
    var serialized = encoder.encode(data);
    var deserialized = encoder.decode(serialized);
    assert.equal(deserialized.map.get(4), 'four');
    assert.equal(deserialized.map.get('three'), 3);
    assert.equal(deserialized.date.getTime(), 1532219539733);
    assert.equal(deserialized.farFutureDate.getTime(), 3532219539133);
    assert.equal(deserialized.ancient.getTime(), -3532219539133);
    assert.equal(deserialized.year2038.getTime(), year2038.getTime());
    assert.equal(deserialized.year2039.getTime(), year2039.getTime());
    assert.equal(deserialized.invalidDate.toString(), 'Invalid Date');
  });
  test('map/date with options', () => {
    var map = new Map();
    map.set(4, 'four');
    map.set('three', 3);
    var data = {
      map: map,
      date: new Date(1532219539011),
      invalidDate: new Date('invalid'),
    };
    const encoder = new Encoder({
      mapsAsObjects: true,
      useTimestamp32: true,
      useTag259ForMaps: false,
    });
    var serialized = encoder.encode(data);
    var deserialized = encoder.decode(serialized);
    assert.equal(deserialized.map[4], 'four');
    assert.equal(deserialized.map.three, 3);
    assert.equal(deserialized.date.getTime(), 1532219539000);
    assert.isTrue(isNaN(deserialized.invalidDate.getTime()));
  });
  test('key caching', () => {
    var data = {
      foo: 2,
      bar: 'test',
      four: 4,
      seven: 7,
      foz: 3,
    };
    var serialized = CBOR.encode(data);
    var deserialized = CBOR.decode(serialized);
    assert.deepEqual(deserialized, data);
    // do multiple times to test caching
    var serialized = CBOR.encode(data);
    var deserialized = CBOR.decode(serialized);
    assert.deepEqual(deserialized, data);
    var serialized = CBOR.encode(data);
    var deserialized = CBOR.decode(serialized);
    assert.deepEqual(deserialized, data);
  });
  test('strings', () => {
    var data = [''];
    var serialized = encode(data);
    var deserialized = decode(serialized);
    assert.deepEqual(deserialized, data);
    // do multiple times
    var serialized = encode(data);
    var deserialized = decode(serialized);
    assert.deepEqual(deserialized, data);
    data = 'decode this: ᾜ';
    var serialized = encode(data);
    var deserialized = decode(serialized);
    assert.deepEqual(deserialized, data);
    data = 'decode this that is longer but without any non-latin characters';
    var serialized = encode(data);
    var deserialized = decode(serialized);
    assert.deepEqual(deserialized, data);
  });
  test('decimal float32', () => {
    var data = {
      a: 2.526,
      b: 0.0035235,
      c: 0.00000000000352501,
      d: 3252.77,
    };
    const encoder = new Encoder({
      useFloat32: DECIMAL_FIT,
    });
    var serialized = encoder.encode(data);
    assert.equal(serialized.length, 36);
    var deserialized = encoder.decode(serialized);
    assert.deepEqual(deserialized, data);
  });
  test('decimal alwaysUseFloat', () => {
    var data = 123;
    const encoder = new Encoder({
      alwaysUseFloat: true,
    });
    var serialized = encoder.encode(data);
    assert.equal(serialized.length, 9);
    var deserialized = encoder.decode(serialized);
    assert.equal(deserialized, data);
  });
  test('bigint to float', () => {
    var data = {
      a: 325283295382932843n,
    };
    const encoder = new Encoder({
      int64AsNumber: true,
    });
    var serialized = encoder.encode(data);
    var deserialized = encoder.decode(serialized);
    assert.deepEqual(deserialized.a, 325283295382932843);
  });
  test('numbers', () => {
    var data = {
      bigEncodable: 48978578104322,
      dateEpoch: 1530886513200,
      realBig: 3432235352353255323,
      decimal: 32.55234,
      negative: -34.11,
      exponential: 0.234e123,
      tiny: 3.233e-120,
      zero: 0,
      //negativeZero: -0,
      Infinity: Infinity,
    };
    var serialized = encode(data);
    var deserialized = decode(serialized);
    assert.deepEqual(deserialized, data);
  });
  test('numbers are compact', () => {
    assert.equal(encode(-256).length, 2);
    const encoding = encode(-4294967296);
    assert.equal(encoding.length, 5);
    assert.equal(decode(encoding), -4294967296);
  });
  test('encode ArrayBuffer', () => {
    const ua = new Uint8Array([3, 4, 5]);
    const encoded = encode(ua.buffer);
    const decoded = decode(encoded);
    assert.equal(decoded[0], 3);
    assert.equal(decoded[0], 3);
    assert.equal(decoded[1], 4);
    assert.equal(decoded[2], 5);
    assert.equal(decoded.byteLength, 3);
  });

  test('iterator/indefinite length array', () => {
    class NotArray {}
    const data = ['a', 'b', 'c', ['d']]; // iterable
    data.constructor = NotArray;
    var serialized = encode(data);
    var deserialized = decode(serialized);
    assert.deepEqual(deserialized, data);
  });
  test('bigint', () => {
    var data = {
      bigintSmall: 352n,
      bigintSmallNegative: -333335252n,
      bigintBig: 2n ** 64n - 1n, // biggest 64-bit possible
      bigintBigNegative: -(2n ** 63n), // largest negative
      mixedWithNormal: 44,
    };
    var serialized = encode(data);
    var deserialized = decode(serialized);
    assert.deepEqual(deserialized, data);
    var evenBiggerInt = {
      big: 2n ** 66n,
      bigger: 53285732853728573289573289573289573289583725892358732859532n,
      negBig: -93025879203578903275903285903285903289502n,
    };
    var serialized = encode(evenBiggerInt);
    var deserialized = decode(serialized);
    assert.deepEqual(deserialized, evenBiggerInt);
    const encoder = new Encoder({
      largeBigIntToFloat: true,
    });
    serialized = encoder.encode(evenBiggerInt);
    deserialized = decode(serialized);
    assert.isTrue(deserialized.bigger > 2n ** 65n);
  });

  test('buffers', () => {
    var data = {
      buffer1: new Uint8Array([2, 3, 4]),
      buffer2: new Uint8Array(encode(sampleData)),
    };
    var serialized = encode(data);
    var deserialized = decode(serialized);
    assert.deepEqual(deserialized, data);
    let encoder = new Encoder({ tagUint8Array: true });
    serialized = encoder.encode(new Uint8Array([2, 3, 4]));
    assert.equal(serialized[0], 0xd8);
    encoder = new Encoder({ tagUint8Array: false });
    serialized = encoder.encode(new Uint8Array([2, 3, 4]));
    assert.equal(serialized[0], 0x43);
  });

  test('noteencode test', () => {
    const data = {
      foo: 1,
      bar: [1, 2, 3, 4, 'abc', 'def'],
      foobar: {
        foo: true,
        bar: -2147483649,
        foobar: {
          foo: new Uint8Array([1, 2, 3, 4, 5]),
          bar: 1.5,
          foobar: [true, false, 'abcdefghijkmonpqrstuvwxyz'],
        },
      },
    };
    var serialized = encode(data);
    var deserialized = decode(serialized);
    var deserialized = decode(serialized);
    var deserialized = decode(serialized);
    assert.deepEqual(deserialized, data);
  });

  test('utf16 causing expansion', function () {
    this.timeout(10000);
    const data = {
      fixstr: 'ᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝ',
      str8: 'ᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝ',
    };
    var serialized = encode(data);
    var deserialized = decode(serialized);
    assert.deepEqual(deserialized, data);
  });
  test('decodeMultiple', () => {
    let values = CBOR.decodeMultiple(new Uint8Array([1, 2, 3, 4]));
    assert.deepEqual(values, [1, 2, 3, 4]);
    values = [];
    CBOR.decodeMultiple(new Uint8Array([1, 2, 3, 4]), (value) =>
      values.push(value)
    );
    assert.deepEqual(values, [1, 2, 3, 4]);
  });
  test('skipFunction', () => {
    var data = {
      a: 325283295382932843n,
      f: () => {},
    };
    const encoder = new Encoder({
      int64AsNumber: true,
      skipFunction: true,
    });
    var serialized = encoder.encode(data);
    var deserialized = encoder.decode(serialized);
    assert.deepEqual(deserialized.a, 325283295382932843);
    assert.equal(Object.hasOwn(deserialized, 'f'), false);
  });
  test('bad input', () => {
    const badInput = Buffer.from(
      '7b2273657269616c6e6f223a2265343a30222c226970223a223139322e3136382e312e3335222c226b6579223a226770735f736563726574227d',
      'hex'
    );
    assert.throws(() => {
      decode(badInput);
    }); // should throw, not crash
  });
  test('buffer key', () => {
    const encoder = new Encoder({ mapsAsObjects: false });
    const test = encoder.decode(
      Buffer.from('D87982A1446E616D654361626301', 'hex')
    );
    console.log(test);
  });
  test('encode as iterator', () => {
    const hasIterables = {
      a: 1,
      iterator: (function* () {
        yield 2;
        yield {
          b: (function* () {
            yield 3;
          })(),
        };
      })(),
    };
    const encodedIterable = encodeAsIterable(hasIterables);
    let result = [...encodedIterable];
    result = Buffer.concat(result);
    const deserialized = decode(result);
    const expectedResult = {
      a: 1,
      iterator: [2, { b: [3] }],
    };
    assert.deepEqual(deserialized, expectedResult);
  });
  if (typeof Blob !== 'undefined')
    test('encode as iterator with async/blob parts', () => {
      const blob = new Blob([Buffer.from([4, 5])]);
      const hasIterables = {
        a: 1,
        iterator: (async function* () {
          yield 2;
          yield {
            b: (function* () {
              yield 3;
            })(),
          };
        })(),
        blob,
      };
      const encodedIterable = encodeAsIterable(hasIterables);
      const result = [...encodedIterable];
      assert.equal(result[result.length - 1].constructor, Blob);
    });
  if (typeof Blob !== 'undefined')
    test('encode as async iterator with async/blob parts', async () => {
      const blob = new Blob([Buffer.from([4, 5])]);
      const hasIterables = {
        a: 1,
        iterator: (async function* () {
          yield 2;
          yield {
            b: (function* () {
              yield 3;
            })(),
          };
        })(),
        blob,
      };
      const encodedIterable = encodeAsAsyncIterable(hasIterables);
      const result = [];
      for await (const encodedPart of encodedIterable) {
        result.push(encodedPart);
      }
      const deserialized = decode(Buffer.concat(result));
      const expectedResult = {
        a: 1,
        iterator: [2, { b: [3] }],
        blob: Buffer.from([4, 5]),
      };
      assert.deepEqual(deserialized, expectedResult);
    });
  test.skip('encode as iterator performance', async () => {
    function* iterator() {
      for (let i = 0; i < 1000; i++) {
        yield {
          a: 1,
          b: 'hello, world',
          c: true,
          sub: {
            d: 'inside',
            e: 3,
          },
        };
      }
    }
    let result;
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      const encodedIterable = encodeAsIterable(iterator());
      result = [...encodedIterable];
    }
    const deserialized = decode(Buffer.concat(result));
    console.log(performance.now() - start, result.length);
  });

  test('little-endian typed array with aligned data', () => {
    // array[1] { uint32-little-endian-typed-array { bytes <00 00 00 00> } }
    const data = new Uint8Array([129, 216, 70, 68, 0, 0, 0, 0]);
    assert.deepEqual(decode(data), [new Uint32Array([0])]);

    const value = { x: new Float32Array([1, 2, 3]) };
    assert.deepEqual(decode(encode(value)), value);
  });
});
suite('CBOR performance tests', () => {
  test('performance JSON.parse', function () {
    var data = sampleData;
    this.timeout(10000);
    const structures = [];
    var serialized = JSON.stringify(data);
    console.log('JSON size', serialized.length);
    for (var i = 0; i < ITERATIONS; i++) {
      var deserialized = JSON.parse(serialized);
    }
  });
  test('performance JSON.stringify', function () {
    var data = sampleData;
    this.timeout(10000);
    for (var i = 0; i < ITERATIONS; i++) {
      var serialized = JSON.stringify(data);
    }
  });
  test('performance decode', function () {
    var data = sampleData;
    this.timeout(10000);
    const structures = [];
    var serialized = encode(data);
    console.log('CBOR size', serialized.length);
    const encoder = new Encoder({ structures, bundleStrings: true });
    var serialized = encoder.encode(data);
    console.log('CBOR w/ record ext size', serialized.length);
    for (var i = 0; i < ITERATIONS; i++) {
      var deserialized = encoder.decode(serialized);
    }
  });
  test('performance encode', function () {
    var data = sampleData;
    this.timeout(10000);
    const structures = [];
    const encoder = new Encoder({ structures, bundleStrings: true });
    const buffer =
      typeof Buffer != 'undefined'
        ? Buffer.alloc(0x10000)
        : new Uint8Array(0x10000);

    for (var i = 0; i < ITERATIONS; i++) {
      //serialized = encode(data, { shared: sharedStructure })
      encoder.useBuffer(buffer);
      var serialized = encoder.encode(data);
      //var serializedGzip = deflateSync(serialized)
    }
    //console.log('serialized', serialized.length, global.propertyComparisons)
  });
});
suite('CBOR global scope and extensions tests', () => {
  test('instance extensions with predicate functions', () => {
    // Create a custom class that we want to serialize with a predicate
    function isMySpecialObject(value) {
      return value && typeof value === 'object' && value._special === true;
    }

    const encoder = new Encoder({
      extensions: [
        {
          Class: isMySpecialObject,
          tag: 1000,
          encode(value, encode) {
            encode(value.data);
          },
          decode(data) {
            return { _special: true, data };
          },
        },
      ],
    });

    const obj = { _special: true, data: 'hello' };
    const encoded = encoder.encode(obj);
    const decoded = encoder.decode(encoded);

    assert.deepEqual(decoded, obj);
  });

  test('instance extensions with constructor class', () => {
    class MyClass {
      constructor(value) {
        this.value = value;
      }
    }

    const encoder = new Encoder({
      extensions: [
        {
          Class: MyClass,
          tag: 1001,
          encode(value, encode) {
            encode(value.value);
          },
          decode(data) {
            return new MyClass(data);
          },
        },
      ],
    });

    const obj = new MyClass(42);
    const encoded = encoder.encode(obj);
    const decoded = encoder.decode(encoded);

    assert(decoded instanceof MyClass);
    assert.equal(decoded.value, 42);
  });

  test('instance extensions override global extensions', () => {
    class OverrideClass {
      constructor(value) {
        this.value = value;
      }
    }

    // Register global extension
    addExtension({
      Class: OverrideClass,
      tag: 1002,
      encode(value, encode) {
        encode('global:' + value.value);
      },
      decode(data) {
        return new OverrideClass(data.replace('global:', ''));
      },
    });

    // Create encoder with instance extension that overrides
    const encoder = new Encoder({
      extensions: [
        {
          Class: OverrideClass,
          tag: 1003,
          encode(value, encode) {
            encode('instance:' + value.value);
          },
          decode(data) {
            return new OverrideClass(data.replace('instance:', ''));
          },
        },
      ],
    });

    const obj = new OverrideClass('test');
    const encoded = encoder.encode(obj);
    const decoded = encoder.decode(encoded);

    // Should use instance extension, not global
    assert.equal(decoded.value, 'test');
  });

  test('global option affects type construction with VM context', () => {
    // Use node:vm to create a separate context with different constructors
    const vmContext = vm.createContext({});
    const vmGlobal = vm.runInContext('globalThis', vmContext);

    // Encode a Date in the parent context
    const regularEncoder = new Encoder();
    const originalDate = new Date('2024-01-15T12:00:00Z');
    const encoded = regularEncoder.encode(originalDate);

    // Decode with VM global - should create VM's Date, not parent's Date
    const decoder = new CBOR.Decoder({ global: vmGlobal });
    const decoded = decoder.decode(encoded);

    // The decoded date should NOT be instanceof the parent's Date
    assert(
      !(decoded instanceof Date),
      'decoded should not be instanceof parent Date'
    );
    // But it should be instanceof the VM's Date
    assert(
      decoded instanceof vmGlobal.Date,
      'decoded should be instanceof VM Date'
    );
    // Verify instanceof check inside the VM context itself
    vmContext.testValue = decoded;
    assert(
      vm.runInContext('testValue instanceof Date', vmContext),
      'decoded should pass instanceof Date inside VM context'
    );
    // And it should have the correct time
    assert.equal(decoded.getTime(), originalDate.getTime());
  });

  test('global option for encoding objects from VM context', () => {
    // Use node:vm to create objects that fail instanceof checks in parent context
    const vmContext = vm.createContext({});
    const vmGlobal = vm.runInContext('globalThis', vmContext);

    // Create objects in the VM context
    const vmObject = vm.runInContext('({ a: 1, b: [1, 2, 3] })', vmContext);
    const vmArray = vm.runInContext('[1, 2, 3]', vmContext);
    const vmMap = vm.runInContext('new Map([["a", 1], ["b", 2]])', vmContext);

    // These should NOT be instanceof parent constructors
    assert(
      !(vmObject instanceof Object),
      'vmObject should not be instanceof parent Object'
    );
    assert(
      !(vmArray instanceof Array),
      'vmArray should not be instanceof parent Array'
    );
    assert(
      !(vmMap instanceof Map),
      'vmMap should not be instanceof parent Map'
    );

    // But with the global option, encoding should still work
    const encoder = new Encoder({ global: vmGlobal, mapsAsObjects: false });

    const encodedObj = encoder.encode(vmObject);
    const encodedArr = encoder.encode(vmArray);
    const encodedMap = encoder.encode(vmMap);

    // Decode and verify
    const decodedObj = encoder.decode(encodedObj);
    const decodedArr = encoder.decode(encodedArr);
    const decodedMap = encoder.decode(encodedMap);

    assert.deepEqual(decodedObj, { a: 1, b: [1, 2, 3] });
    assert.deepEqual(decodedArr, [1, 2, 3]);
    assert.equal(decodedMap.get('a'), 1);
    assert.equal(decodedMap.get('b'), 2);
  });

  test('extensions with no tag (tagless encoding)', () => {
    function isTagless(value) {
      return value && value._tagless === true;
    }

    const encoder = new Encoder({
      extensions: [
        {
          Class: isTagless,
          // No tag specified - should encode without tag
          encode(value, encode) {
            encode({ wrapped: value.data });
          },
          decode(data) {
            return { _tagless: true, data: data.wrapped };
          },
        },
      ],
    });

    const obj = { _tagless: true, data: 'test' };
    const encoded = encoder.encode(obj);
    const decoded = encoder.decode(encoded);

    // Since there's no tag, we just get the wrapped object back
    assert.deepEqual(decoded, { wrapped: 'test' });
  });

  test('multiple instance extensions', () => {
    function isTypeA(v) {
      return v && v.type === 'A';
    }
    function isTypeB(v) {
      return v && v.type === 'B';
    }

    const encoder = new Encoder({
      extensions: [
        {
          Class: isTypeA,
          tag: 2000,
          encode(value, encode) {
            encode(['A', value.data]);
          },
          decode(data) {
            return { type: 'A', data: data[1] };
          },
        },
        {
          Class: isTypeB,
          tag: 2001,
          encode(value, encode) {
            encode(['B', value.data]);
          },
          decode(data) {
            return { type: 'B', data: data[1] };
          },
        },
      ],
    });

    const objA = { type: 'A', data: 'hello' };
    const objB = { type: 'B', data: 'world' };

    const encodedA = encoder.encode(objA);
    const encodedB = encoder.encode(objB);

    const decodedA = encoder.decode(encodedA);
    const decodedB = encoder.decode(encodedB);

    assert.deepEqual(decodedA, objA);
    assert.deepEqual(decodedB, objB);
  });

  test('global option for Set construction with VM context', () => {
    const vmContext = vm.createContext({});
    const vmGlobal = vm.runInContext('globalThis', vmContext);

    // Use instance extension for encoding (so we don't pollute global extensions)
    const encoder = new Encoder({
      extensions: [
        {
          Class: Set,
          tag: 258,
          encode(set, encode) {
            encode([...set]);
          },
        },
      ],
    });

    const decoder = new CBOR.Decoder({ global: vmGlobal });

    const originalSet = new Set([1, 2, 3]);
    const encoded = encoder.encode(originalSet);

    // Decode with VM global - should create VM's Set
    const decoded = decoder.decode(encoded);

    // Should NOT be instanceof parent Set
    assert(
      !(decoded instanceof Set),
      'decoded should not be instanceof parent Set'
    );
    // Should be instanceof VM's Set
    assert(
      decoded instanceof vmGlobal.Set,
      'decoded should be instanceof VM Set'
    );
    // Verify instanceof check inside the VM context itself
    vmContext.testValue = decoded;
    assert(
      vm.runInContext('testValue instanceof Set', vmContext),
      'decoded should pass instanceof Set inside VM context'
    );
    assert.deepEqual([...decoded], [1, 2, 3]);
  });

  test('global option for Map construction with VM context', () => {
    const vmContext = vm.createContext({});
    const vmGlobal = vm.runInContext('globalThis', vmContext);

    // Create a regular Map and encode it
    const regularEncoder = new Encoder({ mapsAsObjects: false });
    const originalMap = new Map([
      ['a', 1],
      ['b', 2],
    ]);
    const encoded = regularEncoder.encode(originalMap);

    // Decode with VM global - should create VM's Map
    const decoder = new CBOR.Decoder({
      mapsAsObjects: false,
      global: vmGlobal,
    });
    const decoded = decoder.decode(encoded);

    // Should NOT be instanceof parent Map
    assert(
      !(decoded instanceof Map),
      'decoded should not be instanceof parent Map'
    );
    // Should be instanceof VM's Map
    assert(
      decoded instanceof vmGlobal.Map,
      'decoded should be instanceof VM Map'
    );
    // Verify instanceof check inside the VM context itself
    vmContext.testValue = decoded;
    assert(
      vm.runInContext('testValue instanceof Map', vmContext),
      'decoded should pass instanceof Map inside VM context'
    );
    assert.equal(decoded.get('a'), 1);
    assert.equal(decoded.get('b'), 2);
  });

  test('encode Set from VM context with global option', () => {
    const vmContext = vm.createContext({});
    const vmGlobal = vm.runInContext('globalThis', vmContext);

    // Create a Set in the VM context
    const vmSet = vm.runInContext('new Set([1, 2, 3])', vmContext);

    // This should NOT be instanceof parent Set
    assert(
      !(vmSet instanceof Set),
      'vmSet should not be instanceof parent Set'
    );

    // Use instance extension with VM's Set constructor for matching
    const encoder = new Encoder({
      global: vmGlobal,
      extensions: [
        {
          Class: vmGlobal.Set,
          tag: 258,
          encode(set, encode) {
            encode([...set]);
          },
        },
      ],
    });

    const encoded = encoder.encode(vmSet);
    const decoded = encoder.decode(encoded);

    assert.deepEqual([...decoded], [1, 2, 3]);
  });
});
