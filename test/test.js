'use strict';

import path from 'path';
import TestBattery from '../TestBattery.js';

const getResults = function(test, fails, expectedFails, done) {

  if (done === undefined) {
    if (expectedFails instanceof Function) {
      done = expectedFails;
      expectedFails = undefined;
    } else if (expectedFails === undefined) {
      done = fails;
      fails = undefined;
    }
  }

  return Promise.all([
    new Promise(resolve => {
      test.done(function(d) {
        if (d !== 'undefined') {
          resolve(d);
        };
        resolve();
      })
    }),
    new Promise((r, j) => {
      if (fails) {
        fails.done(function(d) { 
          if (d === 'undefined') {
            r(d);
          } else {
            expectedFails || (expectedFails = fails.testsCompleted);
            if (d.errors.length !== expectedFails) {
              r(d);
            } else {
              r();
            }
          }
        });
      } else {
        r();
      }
    })
  ])
  .then(() => {
    done();
  })
  .catch((reason) => {
    console.error(reason);
    done({battery: this, reason});
  })
}

describe('Simple Form', function() {

  it('array', function (done) {
    let test = new TestBattery();
    test.isArray([], 'empty array');
    test.isArray([1,2,3], 'integer array');
    test.isArray(new Array(), 'empty array object');
    test.isArray(['this', 'string', 'array'], 'string array');

    let fails = new TestBattery();
    fails.isArray(1, 'integer');
    fails.isArray('string', 'string');
    fails.isArray(null, 'null');

    getResults(test, fails, done);
  });

  it('boolean', function (done) {
    let test = new TestBattery();
    test.isBoolean(true, 'true');
    test.isBoolean(false, 'false');
    test.isBoolean(new Boolean(), 'object');
    test.isBoolean(new Boolean(true), 'object true');
    test.isBoolean(new Boolean(false), 'object false');

    let fails = new TestBattery();
    fails.isBoolean(null, 'null');
    fails.isBoolean(0, 'zero');
    fails.isBoolean(undefined, 'undefined');
    fails.isBoolean('', 'empty string');
    fails.isBoolean({}, 'empty object');
    fails.isBoolean(1, '1');
    fails.isBoolean('string', 'non-empty string');
    fails.isBoolean(NaN, 'NaN');
    
    getResults(test, fails, done);
  });

  it('directory', function (done) {
    let test = new TestBattery();
    test.isDirectory(path.join(process.cwd()), 'path string');
    test.isDirectory([process.cwd(), '.'], 'path array');

    let fails = new TestBattery();
    fails.isDirectory([process.cwd(), 'TestBattery.jsxx'], 'regular file');
    fails.isDirectory([process.cwd(), 'hello'], 'non-existant directory');
    fails.isDirectory(12, 'not a string');
    
    getResults(test, fails, done);
  });

  it('empty array', function (done) {
    let test = new TestBattery();
    test.isEmptyArray([], 'empty array literal');
    test.isEmptyArray(new Array(), 'empty array object');

    let fails = new TestBattery();
    fails.isEmptyArray([1], 'array literal');
    fails.isEmptyArray(new Array(21), 'array object');
    fails.isEmptyArray({}, 'empty object');
    fails.isEmptyArray(null, 'null');
    fails.isEmptyArray('', 'empty string');
    
    getResults(test, fails, done);
  });

  it('empty object', function (done) {
    let test = new TestBattery();
    test.isEmptyObject({}, 'empty object literal');
    test.isEmptyObject(new Object(), 'empty object object');

    let fails = new TestBattery();
    fails.isEmptyObject({data: {}}, 'object literal');
    fails.isEmptyObject(new Object({data: {}}), 'object object');
    fails.isEmptyObject([], 'empty array');
    //fails.isEmptyObject(null, 'null');
    fails.isEmptyObject('', 'empty string');
    
    getResults(test, fails, done);
  });

  it('empty string', function (done) {
    let test = new TestBattery();
    test.isEmptyString('', 'empty string literal');
    test.isEmptyString(new String(), 'empty string object');

    let fails = new TestBattery();
    fails.isEmptyString('hi', 'string literal');
    fails.isEmptyString(new String('hi'), 'string object');
    fails.isEmptyString({}, 'empty object');
    fails.isEmptyString(null, 'null');
    fails.isEmptyString([], 'empty array');
    
    getResults(test, fails, done);
  });

  it('equal', function (done) {
    let test = new TestBattery();
    test.isEqual(1, 1, 'equal integers');
    test.isEqual(1, '1', 'equal ones');
    test.isEqual('1', '1', 'equal strings');
    test.isEqual(
      'it was the worst of times it was the best of times',
      'it was the worst of times it was the best of times',
      'equal longer strings');
    test.isEqual(true, true, 'equal booleans');
    test.isEqual(true, 1, 'equal truths');

    let fails = new TestBattery();
    fails.isEqual(1, 2, 'unequal integers');
    fails.isEqual(1, '2', 'unequal ones');
    fails.isEqual('1', '2', 'unequal strings');
    fails.isEqual(
      'it was the worst of times it was the best of times',
      'Tt was the worst of times, it was the best of times',
      'unequal longer strings');
    fails.isEqual(true, false, 'unequal booleans');
    fails.isEqual(true, '2', 'unequal truths');
    
    getResults(test, fails, done);
  });

  it('false', function (done) {
    let test = new TestBattery();
    test.isFalse(false, 'false literal');
    test.isFalse(new Boolean(false), 'false object');

    let fails = new TestBattery();
    fails.isFalse('true', 'string literal');
    fails.isFalse(new Boolean(true), 'true object');
    fails.isFalse({}, 'empty object');
    fails.isFalse(null, 'null');
    fails.isFalse([], 'empty array');
    fails.isFalse(0, 'zero');
    
    getResults(test, fails, done);
  });

  it('falsey', function (done) {
    let test = new TestBattery();
    test.isFalsey(false, 'false literal');
    test.isFalsey(null, 'null');
    test.isFalsey(0, 'zero');

    let fails = new TestBattery();
    fails.isFalsey(new Boolean(false), 'false object');
    fails.isFalsey('true', 'string literal');
    fails.isFalsey(new Boolean(true), 'string object');
    fails.isFalsey({}, 'empty object');
    fails.isFalsey([], 'empty array');
    fails.isFalsey(1, 'one');
    
    getResults(test, fails, done);
  });

  it('file', function (done) {
    let test = new TestBattery();
    test.isFile(path.join(process.cwd(), 'TestBattery.js'), 'path string');
    test.isFile([process.cwd(), 'TestBattery.js'], 'path array');

    let fails = new TestBattery();
    fails.isFile([process.cwd(), 'TestBattery.jsxx'], 'non-existant file');
    fails.isFile(process.cwd(), 'directory');
    fails.isFile(12, 'not a string');
    
    getResults(test, fails, done);
  });

  it('nil', function (done) {
    let test = new TestBattery();
    test.isNil(null, 'null');
    test.isNil(undefined, 'undefined');

    let fails = new TestBattery();
    fails.isNil('', 'empty string literal');
    fails.isNil(0, 'zero');
    
    getResults(test, fails, done);
  });

  it('null', function (done) {
    let test = new TestBattery();
    test.isNull(null, 'null');

    let fails = new TestBattery();
    fails.isNull(undefined, 'undefined');
    fails.isNull('', 'empty string literal');
    fails.isNull(0, 'zero');
    
    getResults(test, fails, done);
  });

  it('strictly equal', function (done) {
    let test = new TestBattery();
    test.isStrictlyEqual(1, 1, 'equal integers');
    test.isStrictlyEqual('1', '1', 'equal strings');
    test.isStrictlyEqual(true, true, 'equal booleans');

    let fails = new TestBattery();
    fails.isStrictlyEqual(1, 2, 'unequal integers');
    fails.isStrictlyEqual(1, '1', 'equal (not strictly) ones');
    fails.isStrictlyEqual(1, '2', 'unequal ones');
    fails.isStrictlyEqual('1', '2', 'unequal strings');
    fails.isStrictlyEqual(true, false, 'unequal booleans');
    fails.isStrictlyEqual(true, '2', 'unequal truths');
    fails.isStrictlyEqual(true, 1, 'equal (not strictly) truths');
    
    getResults(test, fails, done);
  });

  it('true', function (done) {
    let test = new TestBattery();
    test.isTrue(true, 'true literal');
    test.isTrue(new Boolean(true), 'true object');

    let fails = new TestBattery();
    fails.isTrue('true', 'string literal');
    fails.isTrue(new Boolean(false), 'false object');
    fails.isTrue({}, 'empty object');
    fails.isTrue(null, 'null');
    fails.isTrue([], 'empty array');
    fails.isTrue(0, 'zero');
    
    getResults(test, fails, done);
  });

  it('truthy', function (done) {
    let test = new TestBattery();
    test.isTruthy(true, 'true literal');
    test.isTruthy(!null, 'null');
    test.isTruthy(1, 'one');
    test.isTruthy({}, 'empty object');
    test.isTruthy([], 'empty array');
    test.isTruthy(new Boolean(false), 'false object');
    test.isTruthy('true', 'string literal');
    test.isTruthy(new Boolean(true), 'true object');

    let fails = new TestBattery();
    fails.isTruthy('', 'empty string');
    fails.isTruthy(0, 'zero');
    
    getResults(test, fails, done);
  });

  it('undefined', function (done) {
    let test = new TestBattery();
    test.isUndefined(undefined, 'undefined');

    let fails = new TestBattery();
    fails.isUndefined(null, 'null');
    fails.isUndefined('', 'empty string literal');
    fails.isUndefined(0, 'zero');
    
    getResults(test, fails, done);
  });
});

describe('Contructed form', function() {

  it('array', function (done) {
    let test = new TestBattery();
    test.test('empty array').value([]).is.array;
    test.test('integer array').value([1,2,3]).is.array;
    test.test('empty array object').value(new Array()).is.array;
    test.test('string array').value(['this', 'string', 'array']).is.array;

    let fails = new TestBattery();
    fails.test('integer').value(1).is.array;
    fails.test('string').value('string').is.array;
    fails.test('null').value(null).is.array;

    getResults(test, fails, done);
  });

  it('boolean', function (done) {
    let test = new TestBattery();
    test.test('true').value(true).is.boolean;
    test.test('false').value(false).is.boolean;
    test.test('object').value(new Boolean()).is.boolean;
    test.test('object true').value(new Boolean(true)).is.boolean;
    test.test('object false').value(new Boolean(false)).is.boolean;

    let fails = new TestBattery();
    fails.test('null').value(null).is.boolean;
    fails.test('zero').value(0).is.boolean;
    fails.test('undefined').value(undefined).is.boolean;
    fails.test('empty string').value('').is.boolean;
    fails.test('empty object').value({}).is.boolean;
    fails.test('1').value(1).is.boolean;
    fails.test('non-empty string').value('string').is.boolean;
    fails.test('NaN').value(NaN).is.boolean;
    
    getResults(test, fails, done);'string'
  });

  it('directory', function (done) {
    let test = new TestBattery();
    test.test('path string').value(path.join(process.cwd())).is.a.directory;
    test.test('path array').value([process.cwd(), 'test']).is.a.directory;

    let fails = new TestBattery();
    fails.test('non-existant file').value([process.cwd(), 'TestBattery.jsxx']).is.a.directory;
    fails.test('not a directory').value(path.join(process.cwd(), 'TestBattery.js')).is.a.directory;
    fails.test('not a string').value(12).is.a.directory;
    
    getResults(test, fails, done);
  });

  it('empty', function (done) {
    let test = new TestBattery();
    test.test('empty array literal').value([]).is.empty;
    test.test('empty array object').value(new Array()).is.empty;
    test.test('empty object literal').value({}).is.empty;
    test.test('empty object object').value(new Object()).is.empty;
    test.test('empty string literal').value('').is.empty;
    test.test('empty string object').value(new String()).is.empty;

    let fails = new TestBattery();
    fails.test('array literal').value([1]).is.empty;
    fails.test('array object').value(new Array(21)).is.empty;
    fails.test('null').value(null).is.empty;
    fails.test('object literal').value({data: {}}).is.empty;
    fails.test('object object').value(new Object({data: {}})).is.empty;
    fails.test('string literal').value('hi').is.empty;
    fails.test('string object').value(new String('hi')).is.empty;
    fails.test('undefined').value(undefined).is.empty;
    fails.test('integer').value(1).is.empty;

    getResults(test, fails, done);
  });
  
  it('equal', function(done) {
    let test = new TestBattery();
    test.test('equal integers').value(1).value(1).equal;
    test.test('equivalent value comparison').value('1').value(1).equal;
    test.test('equal strings').value('1').value('1').equal;
    test.test('not unequal').value('1').value('1').not.equal;
    test.test('all equal').value(1).value(1).value(1).equal;

    let fails = new TestBattery();
    fails.test('not equal integers').value(1).value(1).not.equal;
    fails.test('unequal integers').value(1).value(2).equal;
    fails.test('unequivalent values').value('1').value(2).equal;
    fails.test('unequal strings').value('1').value('2').equal;
    fails.test('one unequal equal').value(1).value(1).value(2).equal;

    getResults(test, fails, done);
  });

  it('in', function(done) {
    let test = new TestBattery();
    test.test('integers').value(2).value(1).in;
    test.test('strings').value('2').value(1).in;
    test.test('non-strict equality').value('2').value(1).in;
    test.test('first value').value(1).value(1).in;
    test.test('last value').value(3).value(1).in;
    test.test('first array parameters').value(2).value([1,2,3]).value([4,5,6]).in;
    test.test('second array parameters').value(6).value([1,2,3]).value([4,5,6]).in;

    let fails = new TestBattery();
    fails.test('not in').value(2).value(1).not.in;
    fails.test('no equal integers').value(1).value(2).in;
    fails.test('no equal strings').value(1).value(2).in;
    fails.test('empty list').value('1').value(2).in;

    getResults(test, fails, done);
  });

  it('inStrict', function(done) {
    let test = new TestBattery();
    test.test('integers').value(2).value(1).inStrict;
    test.test('strings').value('2').value(1).inStrict;
    test.test('first value').value(1).value(1).inStrict;
    test.test('last value').value(3).value(1).inStrict;
    test.test('first array parameters').value(2).value([1,2,3]).value([4,5,6]).inStrict;
    test.test('second array parameters').value(6).value([1,2,3]).value([4,5,6]).inStrict;

    let fails = new TestBattery();
    fails.test('not in').value(2).value(1).not.inStrict;
    fails.test('no equal integers').value(1).value(2).inStrict;
    fails.test('no equal strings').value(1).value(2).inStrict;
    fails.test('strict equality').value('1').value(1).inStrict;
    fails.test('empty list').value('1').value(2).inStrict;

    getResults(test, fails, done);
  });
  
  it('false', function (done) {
    let test = new TestBattery();
    test.test('false literal').value(false).is.false;
    test.test('false object').value(new Boolean(false)).is.false;

    let fails = new TestBattery();
    fails.test('true literal').value(true).is.false;
    fails.test('true object').value(new Boolean(true)).is.false;
    fails.test('empty object').value({}).is.false;
    fails.test('null').value(null).is.false;
    fails.test('empty array').value([]).is.false;
    fails.test('zero').value(0).is.false;
    
    getResults(test, fails, done);
  });

  it('falsey', function (done) {
    let test = new TestBattery();
    test.test('false literal').value(false).is.falsey;
    test.test('null').value(null).is.falsey;
    test.test('zero').value(0).is.falsey;

    let fails = new TestBattery();
    fails.test('false object').value(new Boolean(false)).is.falsey;
    fails.test('true string literal').value(true).is.falsey;
    fails.test('string object').value(new Boolean(true)).is.falsey;
    fails.test('empty object').value({}).is.falsey;
    fails.test('empty array').value([]).is.falsey;
    fails.test('one').value(1).is.falsey;
    
    getResults(test, fails, done);
  });

  it('file', function (done) {
    let test = new TestBattery();
    test.test('path string').value(path.join(process.cwd(), 'TestBattery.js')).is.a.file;
    test.test('path array').value([process.cwd(), 'TestBattery.js']).is.a.file;

    let fails = new TestBattery();
    fails.test('non-existant file').value([process.cwd(), 'TestBattery.jsxx']).is.a.file;
    fails.test('not a regular file').value(process.cwd()).is.a.file;
    fails.test('not a string').value(12).is.a.file;
    
    getResults(test, fails, done);
  });

  it('nil', function (done) {
    let test = new TestBattery();
    test.test('null').value(null).is.nil;
    test.test('undefined').value(undefined).is.nil;

    let fails = new TestBattery();
    fails.test('empty string literal').value('').is.nil;
    fails.test('zero').value(0).is.nil;
    
    getResults(test, fails, done);
  });

  it('null', function (done) {
    let test = new TestBattery();
    test.test('null').value(null).is.null;

    let fails = new TestBattery();
    fails.test('undefined').value(undefined).is.null;
    fails.test('empty string literal').value('').is.null;
    fails.test('zero').value(0).is.null;
    
    getResults(test, fails, done);
  });

  it('strictly equal', function (done) {
    let test = new TestBattery();
    test.test('equal integers').value(1).value(1).is.strictlyEqual;
    test.test('equal strings').value('1').value('1').is.strictlyEqual;
    test.test('equal booleans').value(true).value(true).is.strictlyEqual;

    let fails = new TestBattery();
    fails.test('unequal integers').value(1).value(2).is.strictlyEqual;
    fails.test('equal (not strictly) ones').value(1).value('1').is.strictlyEqual;
    fails.test('unequal ones').value(1).value('2').is.strictlyEqual;
    fails.test('unequal strings').value('1').value('2').is.strictlyEqual;
    fails.test('unequal booleans').value(true).value(false).is.strictlyEqual;
    fails.test('unequal truths').value(true).value('2').is.strictlyEqual;
    fails.test('equal (not strictly) truths').value(true).value(1).is.strictlyEqual;
    
    getResults(test, fails, done);
  });

  it('true', function (done) {
    let test = new TestBattery();
    test.test('true literal').value(true).is.true;
    test.test('true object').value(new Boolean(true)).is.true;

    let fails = new TestBattery();
    fails.test('string literal').value('true').is.true;
    fails.test('false object').value(new Boolean(false)).is.true;
    fails.test('empty object').value({}).is.true;
    fails.test('null').value(null).is.true;
    fails.test('empty array').value([]).is.true;
    fails.test('zero').value(0).is.true;
    
    getResults(test, fails, done);
  });

  it('truthy', function (done) {
    let test = new TestBattery();
    test.test('true literal').value(true).is.truthy;
    test.test('null').value(!null).is.truthy;
    test.test('one').value(1).is.truthy;
    test.test('empty object').value({}).is.truthy;
    test.test('empty array').value([]).is.truthy;
    test.test('false object').value(new Boolean(false)).is.truthy;
    test.test('string literal').value('true').is.truthy;
    test.test('true object').value(new Boolean(true)).is.truthy;

    let fails = new TestBattery();
    fails.test('empty string').value('').is.truthy;
    fails.test('zero').value(0).is.truthy;
    
    getResults(test, fails, done);
  });

  it('undefined', function (done) {
    let test = new TestBattery();
    test.test('undefined').value(undefined).is.undefined;

    let fails = new TestBattery();
    fails.test('null').value(null).is.undefined;
    fails.test('empty string literal').value('').is.undefined;
    fails.test('zero').value(0).is.undefined;
    
    getResults(test, fails, done);
  });

});

describe('Promise handling', function() {

  it ('batteries without promises', function(done) {
    let test = new TestBattery();
    for (let i = 0; i < 10; i++) {
      test.isTrue(true, 'true %s', i);
    }
    let fails = new TestBattery();
    for (let i = 0; i < 10; i++) {
      fails.isTrue((i !== 6), 'true %s', i);
    }
    getResults(test, fails, 1, done);
  });

  it ('batteries with promises', function(done) {
    let test = new TestBattery();
    let makeTest = function(n, succeed = true) {
      return new Promise(r => {
        setTimeout(() => {r(succeed);}, 10+n);
      });
    }
    for (let i = 0; i < 10; i++) {
      test.isTrue(makeTest(i), 'true %s', i);
    }
    let fails = new TestBattery();
    for (let i = 0; i < 10; i++) {
      fails.isTrue(makeTest(i, (i !== 6)), 'true %s', i);
    }
    getResults(test, fails, 1, done);
  });

  it ('batteries with a stop but without promises', async function() {
    let test = new TestBattery();
    for (let i = 0; i < 10; i++) {
      if (i % 2 === 0) {
        await test.endIfErrors();
      }
      test.isTrue((i !== 6 && i !== 8), 'true %s', i);
    }
    test.done(result => {
      if (result.errors.length !== 1 || result.testsRefused !== 1) {
        throw new Error();
      }
    });
    return;
  });

  it ('batteries with stops and promises', async function() {
    let test = new TestBattery();
    let makeTest = function(n, succeed = true) {
      return new Promise(r => {
        setTimeout(() => {r(succeed);}, 5+n);
      });
    }
    for (let i = 0; i < 10; i++) {
      if (i % 2 === 0) {
        await test.endIfErrors();
      }
      test.isTrue(makeTest(i, (i !== 6 && i !== 8)), 'true %s', i);
    }
    test.done(result => {
      if (result.errors.length !== 1 || result.testsRefused !== 1) {
        throw new Error();
      }
    });
    return;
  });

  it ('batteries with stops and promises, constructed form', async function() {
    let test = new TestBattery();
    let makeTest = function(n, succeed = true) {
      return new Promise(r => {
        setTimeout(() => {r(succeed);}, 5+n);
      });
    }
    for (let i = 0; i < 10; i++) {
      if (i % 2 === 0) {
        await test.endIfErrors();
      }
      test.test('equals %s == %s', i, i).value(i).value(i).equal;
      test.isTrue(makeTest(i, (i !== 6 && i !== 8)), 'true %s', i);
    }
    test.done(result => {
      if (result.errors.length !== 1 || result.testsRefused !== 1) {
        throw new Error();
      }
    });
    return;
  });

});
