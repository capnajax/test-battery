'use strict';

import expect from 'expect.js';
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
    new Promise((r, j) => {
      test.done(function(d) {
        try {
          expect(d).to.be(undefined);
          r();
        } catch(reason) {
          j(d);
        }
      })
    }),
    new Promise((r, j) => {
      if (fails) {
        fails.done(function(d) { 
          try {
            expect(d).to.not.be(undefined);
            expectedFails || (expectedFails = fails.testsCompleted);
            expect(d.errors.length).to.equal(expectedFails);
            r();
          } catch(reason) {
            j({reason, result: d});
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
    done({battery: this, reason});
  })
}

describe('Test Types', function() {

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
      expect(result.errors.length).to.be(1);
      expect(result.testsRefused.length).to.be(1);
    });
    return;
  });

  it ('batteries with promises', async function() {
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
      expect(result.errors.length).to.be(1);
      expect(result.testsRefused.length).to.be(1);
    });
    return;
  });

});