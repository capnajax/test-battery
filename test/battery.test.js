'use strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import 'source-map-support/register.js';
import { TestBattery } from '../test-battery.js';
// add to this array to focus on a specific test, or leave it empty to run all
// tests. If this is not empty, the 'All tests run' test will fail.
const focusTests = [];
function focus(description, test) {
    let runTest = !focusTests || focusTests.length === 0;
    if (focusTests) {
        if (focusTests.includes(description)) {
            runTest = true;
        }
    }
    runTest
        ? it(description, {}, (c, t) => { test(t); })
        : it.skip(description);
}
async function getResults(test, fails, expectedFails, done) {
    let adjustments = `none (done is ${typeof done})`;
    // redistribute arguments based on types
    if (done === undefined) {
        if (typeof expectedFails === 'function') {
            adjustments = 'expectedFailes to done';
            done = expectedFails;
            expectedFails = undefined;
        }
        else if (expectedFails === undefined) {
            adjustments = 'fails to done';
            done = fails;
            fails = undefined;
        }
        else {
            adjustments = 'confused';
        }
    }
    if (fails !== undefined && !(fails instanceof TestBattery)) {
        throw new Error('fails must be a TestBattery instance');
    }
    if (expectedFails !== undefined && !(typeof expectedFails === 'number')) {
        throw new Error(`expectedFails must be a number: adjustments ${adjustments}`);
    }
    let allResults = null;
    const addResults = (observations) => {
        if (observations === undefined) {
            return;
        }
        if (allResults === null) {
            allResults = {};
        }
        if (observations.errors) {
            if (!allResults.errors) {
                allResults.errors = [];
            }
            allResults.errors.push(...observations.errors);
        }
        if (observations.testsRefused) {
            if (!allResults.testsRefused) {
                allResults.testsRefused = [];
            }
            allResults.testsRefused.push(...observations.testsRefused);
        }
        if (observations.exception) {
            allResults.exception = observations.exception;
        }
    };
    if (test) {
        const results = await test.done();
        addResults(results);
    }
    if (fails) {
        const results = await fails.done();
        if (expectedFails === undefined) {
            addResults(results);
        }
        else {
            const failsCount = results?.errors?.length || 0;
            if (failsCount !== expectedFails) {
                addResults({
                    errors: (results?.errors || []).concat([`Expected ${expectedFails} fails, got ${failsCount}`]),
                    testsRefused: results?.testsRefused || [],
                    exception: results?.exception,
                });
            }
        }
    }
    if (done) {
        allResults ? done(allResults) : done();
    }
}
describe('Simple Form (deprecated)', function () {
    focus('simple array', function (done) {
        let test = new TestBattery('array');
        test.isArray([], 'empty array');
        test.isArray([1, 2, 3], 'integer array');
        test.isArray(new Array(), 'empty array object');
        test.isArray(['this', 'string', 'array'], 'string array');
        let fails = new TestBattery('array fails', { expectedToPass: false });
        fails.isArray(1, 'integer');
        fails.isArray('string', 'string');
        fails.isArray(null, 'null');
        getResults(test, fails, done);
    });
    focus('simple boolean', function (done) {
        let test = new TestBattery('boolean');
        test.isBoolean(true, 'true');
        test.isBoolean(false, 'false');
        let fails = new TestBattery('boolean fails', { expectedToPass: false });
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
    focus('simple directory', function (done) {
        let test = new TestBattery('directory');
        test.isDirectory(path.join(process.cwd()), 'path string');
        test.isDirectory([process.cwd(), '.'], 'path array');
        let fails = new TestBattery('directory fails', { expectedToPass: false });
        fails.isDirectory([process.cwd(), 'test-battery.jsxx'], 'regular file');
        fails.isDirectory([process.cwd(), 'hello'], 'non-existant directory');
        fails.isDirectory(12, 'not a string');
        getResults(test, fails, done);
    });
    focus('simple empty array', function (done) {
        let test = new TestBattery('empty array');
        test.isEmptyArray([], 'empty array literal');
        test.isEmptyArray(new Array(), 'empty array object');
        let fails = new TestBattery('empty array fails', { expectedToPass: false });
        fails.isEmptyArray([1], 'array literal');
        fails.isEmptyArray(new Array(21), 'array object');
        fails.isEmptyArray({}, 'empty object');
        fails.isEmptyArray(null, 'null');
        fails.isEmptyArray('', 'empty string');
        getResults(test, fails, done);
    });
    focus('simple empty object', function (done) {
        let test = new TestBattery('empty object');
        test.isEmptyObject({}, 'empty object literal');
        test.isEmptyObject(new Object(), 'empty object object');
        let fails = new TestBattery('empty object fails', { expectedToPass: false });
        fails.isEmptyObject({ data: {} }, 'object literal');
        fails.isEmptyObject(new Object({ data: {} }), 'object object');
        fails.isEmptyObject([], 'empty array');
        //fails.isEmptyObject(null, 'null');
        fails.isEmptyObject('', 'empty string');
        getResults(test, fails, done);
    });
    focus('simple empty string', function (done) {
        let test = new TestBattery('empty string');
        test.isEmptyString('', 'empty string literal');
        test.isEmptyString(new String(), 'empty string object');
        let fails = new TestBattery('empty string fails', { expectedToPass: false });
        fails.isEmptyString('hi', 'string literal');
        fails.isEmptyString(new String('hi'), 'string object');
        fails.isEmptyString({}, 'empty object');
        fails.isEmptyString(null, 'null');
        fails.isEmptyString([], 'empty array');
        getResults(test, fails, done);
    });
    focus('simple equal', function (done) {
        let test = new TestBattery('equal');
        test.isEqual(1, 1, 'equal integers');
        test.isEqual(1, '1', 'equal ones');
        test.isEqual('1', '1', 'equal strings');
        test.isEqual('it was the worst of times it was the best of times', 'it was the worst of times it was the best of times', 'equal longer strings');
        test.isEqual(true, true, 'equal booleans');
        test.isEqual(true, 1, 'equal truths');
        let fails = new TestBattery('equal fails', { expectedToPass: false });
        fails.isEqual(1, 2, 'unequal integers');
        fails.isEqual(1, '2', 'unequal ones');
        fails.isEqual('1', '2', 'unequal strings');
        fails.isEqual('it was the worst of times it was the best of times', 'Tt was the worst of times, it was the best of times', 'unequal longer strings');
        fails.isEqual(true, false, 'unequal booleans');
        fails.isEqual(true, '2', 'unequal truths');
        getResults(test, fails, done);
    });
    focus('simple fail', function (done) {
        let test = new TestBattery('fails');
        let fails = new TestBattery('fails fails', { expectedToPass: false });
        fails.fail('fail');
        getResults(test, fails, done);
    });
    focus('simple false', function (done) {
        let test = new TestBattery('false');
        test.isFalse(false, 'false literal');
        test.isFalse(new Boolean(false), 'false object');
        let fails = new TestBattery('false fails', { expectedToPass: false });
        fails.isFalse('true', 'string literal');
        fails.isFalse(new Boolean(true), 'true object');
        fails.isFalse({}, 'empty object');
        fails.isFalse(null, 'null');
        fails.isFalse([], 'empty array');
        fails.isFalse(0, 'zero');
        getResults(test, fails, done);
    });
    focus('simple falsey', function (done) {
        let test = new TestBattery('falsey');
        test.isFalsey(false, 'false literal');
        test.isFalsey(null, 'null');
        test.isFalsey(0, 'zero');
        let fails = new TestBattery('falsey fails', { expectedToPass: false });
        fails.isFalsey(new Boolean(false), 'false object');
        fails.isFalsey('true', 'string literal');
        fails.isFalsey(new Boolean(true), 'string object');
        fails.isFalsey({}, 'empty object');
        fails.isFalsey([], 'empty array');
        fails.isFalsey(1, 'one');
        getResults(test, fails, done);
    });
    focus('simple file', function (done) {
        let test = new TestBattery('file');
        test.isFile(path.join(process.cwd(), 'test-battery.js'), 'path string');
        test.isFile([process.cwd(), 'test-battery.js'], 'path array');
        let fails = new TestBattery('file fails', { expectedToPass: false });
        fails.isFile([process.cwd(), 'test-battery.jsxx'], 'non-existant file');
        fails.isFile(process.cwd(), 'directory');
        fails.isFile(12, 'not a string');
        getResults(test, fails, done);
    });
    focus('simple nil', function (done) {
        let test = new TestBattery('nil');
        test.isNil(null, 'null');
        test.isNil(undefined, 'undefined');
        let fails = new TestBattery('nil fails', { expectedToPass: false });
        fails.isNil('', 'empty string literal');
        fails.isNil(0, 'zero');
        getResults(test, fails, done);
    });
    focus('simple null', function (done) {
        let test = new TestBattery('null');
        test.isNull(null, 'null');
        let fails = new TestBattery('null fails', { expectedToPass: false });
        fails.isNull(undefined, 'undefined');
        fails.isNull('', 'empty string literal');
        fails.isNull(0, 'zero');
        getResults(test, fails, done);
    });
    focus('simple strictly equal', function (done) {
        let test = new TestBattery('strictly equal');
        test.isStrictlyEqual(1, 1, 'equal integers');
        test.isStrictlyEqual('1', '1', 'equal strings');
        test.isStrictlyEqual(true, true, 'equal booleans');
        let fails = new TestBattery('strictly equal fails', { expectedToPass: false });
        fails.isStrictlyEqual(1, 2, 'unequal integers');
        fails.isStrictlyEqual(1, '1', 'equal (not strictly) ones');
        fails.isStrictlyEqual(1, '2', 'unequal ones');
        fails.isStrictlyEqual('1', '2', 'unequal strings');
        fails.isStrictlyEqual(true, false, 'unequal booleans');
        fails.isStrictlyEqual(true, '2', 'unequal truths');
        fails.isStrictlyEqual(true, 1, 'equal (not strictly) truths');
        getResults(test, fails, done);
    });
    focus('simple true', function (done) {
        let test = new TestBattery('true');
        test.isTrue(true, 'true literal');
        test.isTrue(new Boolean(true), 'true object');
        let fails = new TestBattery('true fails', { expectedToPass: false });
        fails.isTrue('true', 'string literal');
        fails.isTrue(new Boolean(false), 'false object');
        fails.isTrue({}, 'empty object');
        fails.isTrue(null, 'null');
        fails.isTrue([], 'empty array');
        fails.isTrue(0, 'zero');
        getResults(test, fails, done);
    });
    focus('simple truthy', function (done) {
        let test = new TestBattery('truthy');
        test.isTruthy(true, 'true literal');
        // @ts-ignore always falsey
        test.isTruthy(!null, 'null');
        test.isTruthy(1, 'one');
        test.isTruthy({}, 'empty object');
        test.isTruthy([], 'empty array');
        test.isTruthy(new Boolean(false), 'false object');
        test.isTruthy('true', 'string literal');
        test.isTruthy(new Boolean(true), 'true object');
        let fails = new TestBattery('truthy fails', { expectedToPass: false });
        fails.isTruthy('', 'empty string');
        fails.isTruthy(0, 'zero');
        getResults(test, fails, done);
    });
    focus('simple undefined', function (done) {
        let test = new TestBattery('undefined');
        test.isUndefined(undefined, 'undefined');
        let fails = new TestBattery('undefined fails', { expectedToPass: false });
        fails.isUndefined(null, 'null');
        fails.isUndefined('', 'empty string literal');
        fails.isUndefined(0, 'zero');
        getResults(test, fails, done);
    });
});
describe('Constructed form', function () {
    const posOptions = {
        allowDeprecated: false,
        allowEmptyValueSet: true,
        expectedToPass: true,
    };
    const negOptions = {
        allowDeprecated: false,
        allowEmptyValueSet: false,
        expectedToPass: false,
    };
    focus('constructed array', function (done) {
        let test = new TestBattery('array', posOptions);
        test.test('empty array').value([]).is.array;
        test.test('integer array').value([1, 2, 3]).is.array;
        test.test('empty array object').value(new Array()).is.array;
        test.test('string array').value(['this', 'string', 'array']).is.array;
        test.test('vacuously true').is.array;
        test.test('multiple arrays').value([1, 2, 3]).value([4, 5, 6]).is.array;
        let fails = new TestBattery('array fails', negOptions);
        fails.test('integer').value(1).is.array;
        fails.test('string').value('string').is.array;
        fails.test('null').value(null).is.array;
        fails.test('unpermitted vacuously true').is.array;
        fails.test('two arrays and a string')
            .value([1, 2, 3]).value([4, 5, 6]).value('string').is.array;
        getResults(test, fails, done);
    });
    focus('constructed boolean', function (done) {
        let test = new TestBattery('boolean', posOptions);
        test.test('true').value(true).is.boolean;
        test.test('false').value(false).is.boolean;
        let fails = new TestBattery('boolean fails', negOptions);
        fails.test('null').value(null).is.boolean;
        fails.test('zero').value(0).is.boolean;
        fails.test('undefined').value(undefined).is.boolean;
        fails.test('empty string').value('').is.boolean;
        fails.test('empty object').value({}).is.boolean;
        fails.test('1').value(1).is.boolean;
        fails.test('non-empty string').value('string').is.boolean;
        fails.test('NaN').value(NaN).is.boolean;
        fails.test('object').value(new Boolean()).is.boolean;
        fails.test('object true').value(new Boolean(true)).is.boolean;
        fails.test('object false').value(new Boolean(false)).is.boolean;
        getResults(test, fails, done);
        'string';
    });
    focus('constructed directory', function (done) {
        let test = new TestBattery('directory', posOptions);
        test.test('path string').value(path.join(process.cwd())).is.a.directory;
        test.test('path array').value([process.cwd(), 'test']).is.a.directory;
        let fails = new TestBattery('directory fails', negOptions);
        fails.test('non-existant file').value([process.cwd(), 'test-battery.jsxx']).is.a.directory;
        fails.test('not a directory').value(path.join(process.cwd(), 'test-battery.js')).is.a.directory;
        fails.test('not a string').value(12).is.a.directory;
        getResults(test, fails, done);
    });
    focus('constructed empty', function (done) {
        let test = new TestBattery('empty', posOptions);
        test.test('empty array literal').value([]).is.empty;
        test.test('empty array object').value(new Array()).is.empty;
        test.test('empty object literal').value({}).is.empty;
        test.test('empty object object').value(new Object()).is.empty;
        test.test('empty string literal').value('').is.empty;
        test.test('empty string object').value(new String()).is.empty;
        let fails = new TestBattery('empty fails', negOptions);
        fails.test('array literal').value([1]).is.empty;
        fails.test('array object').value(new Array(21)).is.empty;
        fails.test('null').value(null).is.empty;
        fails.test('object literal').value({ data: {} }).is.empty;
        fails.test('object object').value(new Object({ data: {} })).is.empty;
        fails.test('string literal').value('hi').is.empty;
        fails.test('string object').value(new String('hi')).is.empty;
        fails.test('undefined').value(undefined).is.empty;
        fails.test('integer').value(1).is.empty;
        getResults(test, fails, done);
    });
    focus('constructed equal', function (done) {
        let test = new TestBattery('equal', posOptions);
        test.test('equal integers').value(1).value(1).equal;
        test.test('equivalent value comparison').value('1').value(1).equal;
        test.test('equal strings').value('1').value('1').equal;
        test.test('not unequal').value('1').value('2').not.equal;
        test.test('all equal').value(1).value(1).value(1).equal;
        let fails = new TestBattery('equal fails', negOptions);
        fails.test('not equal integers').value(1).value(1).not.equal;
        fails.test('unequal integers').value(1).value(2).equal;
        fails.test('unequivalent values').value('1').value(2).equal;
        fails.test('unequal strings').value('1').value('2').equal;
        fails.test('one unequal equal').value(1).value(1).value(2).equal;
        getResults(test, fails, done);
    });
    focus('constructed in', function (done) {
        let test = new TestBattery('in', posOptions);
        test.test('integers').value(2).value(2).in;
        test.test('strings').value('2').value('2').in;
        test.test('non-strict equality').value('2').value(2).in;
        test.test('first value').value(1).value(1).value(3).in;
        test.test('last value').value(3).value(1).value(3).in;
        test.test('first array parameters').value(2).value([1, 2, 3]).value([4, 5, 6]).in;
        test.test('second array parameters').value(6).value([1, 2, 3]).value([4, 5, 6]).in;
        let fails = new TestBattery('in fails', negOptions);
        fails.test('not in').value(2).value(1).in;
        fails.test('no equal integers').value(1).value([2, 3, 4]).in;
        fails.test('no equal strings').value('1').value(['2', '3', '4']).in;
        fails.test('empty list').value('1').value(2).in;
        getResults(test, fails, done);
    });
    focus('constructed inStrict', function (done) {
        let test = new TestBattery('inStrict', posOptions);
        test.test('integers').value(2).value(2).inStrict;
        test.test('strings').value('2').value('2').inStrict;
        test.test('first value').value(1).value(1).value(3).inStrict;
        test.test('last value').value(3).value(1).value(3).inStrict;
        test.test('first array parameters').value(2).value([1, 2, 3]).value([4, 5, 6]).inStrict;
        test.test('second array parameters').value(6).value([1, 2, 3]).value([4, 5, 6]).inStrict;
        let fails = new TestBattery('inStrict fails', negOptions);
        fails.test('not in').value(2).value(1).inStrict;
        fails.test('no equal integers').value(1).value(2).inStrict;
        fails.test('no equal strings').value(1).value(2).inStrict;
        fails.test('strict equality').value('1').value(1).inStrict;
        fails.test('empty list').value('1').value([]).inStrict;
        getResults(test, fails, done);
    });
    focus('constructed fail', function (done) {
        let test = new TestBattery('fail', posOptions);
        let fails = new TestBattery('fail fails', negOptions);
        fails.test('fail').fail;
        getResults(test, fails, done);
    });
    focus('constructed false', function (done) {
        let test = new TestBattery('false', posOptions);
        test.test('false literal').value(false).is.false;
        let fails = new TestBattery('false fails', negOptions);
        fails.test('true literal').value(true).is.false;
        fails.test('false object').value(new Boolean(false)).is.false;
        fails.test('true object').value(new Boolean(true)).is.false;
        fails.test('empty object').value({}).is.false;
        fails.test('null').value(null).is.false;
        fails.test('empty array').value([]).is.false;
        fails.test('zero').value(0).is.false;
        getResults(test, fails, done);
    });
    focus('constructed falsey', function (done) {
        let test = new TestBattery('falsey', posOptions);
        test.test('false literal').value(false).is.falsey;
        test.test('null').value(null).is.falsey;
        test.test('zero').value(0).is.falsey;
        let fails = new TestBattery('falsey fails', negOptions);
        fails.test('false object').value(new Boolean(false)).is.falsey;
        fails.test('true string literal').value(true).is.falsey;
        fails.test('string object').value(new Boolean(true)).is.falsey;
        fails.test('empty object').value({}).is.falsey;
        fails.test('empty array').value([]).is.falsey;
        fails.test('one').value(1).is.falsey;
        getResults(test, fails, done);
    });
    focus('constructed file', function (done) {
        let test = new TestBattery('file', posOptions);
        test.test('path string').value(path.join(process.cwd(), 'test-battery.js')).is.a.file;
        test.test('path array').value([process.cwd(), 'test-battery.js']).is.a.file;
        let fails = new TestBattery('file fails', negOptions);
        fails.test('non-existant file').value([process.cwd(), 'test-battery.jsxx']).is.a.file;
        fails.test('not a regular file').value(process.cwd()).is.a.file;
        fails.test('not a string').value(12).is.a.file;
        getResults(test, fails, done);
    });
    focus('constructed nil', function (done) {
        let test = new TestBattery('nil', posOptions);
        test.test('null').value(null).is.nil;
        test.test('undefined').value(undefined).is.nil;
        let fails = new TestBattery('nil fails', negOptions);
        fails.test('empty string literal').value('').is.nil;
        fails.test('zero').value(0).is.nil;
        getResults(test, fails, done);
    });
    focus('constructed null', function (done) {
        let test = new TestBattery('null', posOptions);
        test.test('null').value(null).is.null;
        let fails = new TestBattery('null fails', negOptions);
        fails.test('undefined').value(undefined).is.null;
        fails.test('empty string literal').value('').is.null;
        fails.test('zero').value(0).is.null;
        getResults(test, fails, done);
    });
    focus('constructed strictly equal', function (done) {
        let test = new TestBattery('strictly equal', posOptions);
        test.test('equal integers').value(1).value(1).is.strictlyEqual;
        test.test('equal strings').value('1').value('1').is.strictlyEqual;
        test.test('equal booleans').value(true).value(true).is.strictlyEqual;
        let fails = new TestBattery('strictly equal fails', negOptions);
        fails.test('unequal integers').value(1).value(2).is.strictlyEqual;
        fails.test('equal (not strictly) ones').value(1).value('1').is.strictlyEqual;
        fails.test('unequal ones').value(1).value('2').is.strictlyEqual;
        fails.test('unequal strings').value('1').value('2').is.strictlyEqual;
        fails.test('unequal booleans').value(true).value(false).is.strictlyEqual;
        fails.test('unequal truths').value(true).value('2').is.strictlyEqual;
        fails.test('equal (not strictly) truths').value(true).value(1).is.strictlyEqual;
        getResults(test, fails, done);
    });
    focus('constructed true', function (done) {
        let test = new TestBattery('true', posOptions);
        test.test('true literal').value(true).is.true;
        let fails = new TestBattery('true fails', negOptions);
        fails.test('string literal').value('true').is.true;
        fails.test('true object').value(new Boolean(true)).is.true;
        fails.test('false object').value(new Boolean(false)).is.true;
        fails.test('empty object').value({}).is.true;
        fails.test('null').value(null).is.true;
        fails.test('empty array').value([]).is.true;
        fails.test('zero').value(0).is.true;
        getResults(test, fails, done);
    });
    focus('constructed truthy', function (done) {
        let test = new TestBattery('truthy', posOptions);
        test.test('true literal').value(true).is.truthy;
        // @ts-ignore always falsey
        test.test('null').value(!null).is.truthy;
        test.test('one').value(1).is.truthy;
        test.test('empty object').value({}).is.truthy;
        test.test('empty array').value([]).is.truthy;
        test.test('false object').value(new Boolean(false)).is.truthy;
        test.test('string literal').value('true').is.truthy;
        test.test('true object').value(new Boolean(true)).is.truthy;
        let fails = new TestBattery('truthy fails', negOptions);
        fails.test('empty string').value('').is.truthy;
        fails.test('zero').value(0).is.truthy;
        getResults(test, fails, done);
    });
    focus('constructed undefined', function (done) {
        let test = new TestBattery('undefined', posOptions);
        test.test('undefined').value(undefined).is.undefined;
        let fails = new TestBattery('undefined fails', negOptions);
        fails.test('null').value(null).is.undefined;
        fails.test('empty string literal').value('').is.undefined;
        fails.test('zero').value(0).is.undefined;
        getResults(test, fails, done);
    });
});
describe('Promise handling', function () {
    const doit = focusTests?.length ? it.skip : it;
    doit('batteries without promises', function (c, done) {
        let test = new TestBattery('batteries without promises');
        for (let i = 0; i < 10; i++) {
            test.isTrue(true, 'true %s', i);
        }
        let fails = new TestBattery('batteries without promises fails');
        for (let i = 0; i < 10; i++) {
            fails.isTrue((i !== 6), 'true %s', i);
        }
        getResults(test, fails, 1, done);
    });
    doit('batteries with promises', function (c, done) {
        let test = new TestBattery('batteries with promises');
        let makeTest = function (n, succeed = true) {
            return new Promise(r => {
                setTimeout(() => { r(succeed); }, 10 + n);
            });
        };
        for (let i = 0; i < 10; i++) {
            test.isTrue(makeTest(i), 'true %s', i);
        }
        let fails = new TestBattery('batteries with promises fails');
        for (let i = 0; i < 10; i++) {
            fails.isTrue(makeTest(i, (i !== 6)), 'true %s', i);
        }
        getResults(test, fails, 1, done);
    });
    doit('batteries with a stop but without promises', async function () {
        let test = new TestBattery('batteries with a stop but without promises');
        for (let i = 0; i < 10; i++) {
            if (i % 2 === 0) {
                await test.endIfErrors();
            }
            test.isTrue((i !== 6 && i !== 8), 'true %s', i);
        }
        await test.done(result => {
            if (result?.errors?.length !== 1 || result?.testsRefused?.length !== 1) {
                return 'Test did not end with expected errors and refused tests';
            }
        });
        return;
    });
    doit('batteries with stops and promises', async function () {
        let test = new TestBattery('batteries with stops and promises');
        let makeTest = function (n, succeed = true) {
            return new Promise(r => {
                setTimeout(() => { r(succeed); }, 5 + n);
            });
        };
        for (let i = 0; i < 10; i++) {
            if (i % 2 === 0) {
                await test.endIfErrors();
            }
            test.isTrue(makeTest(i, (i !== 6 && i !== 8)), 'true %s', i);
        }
        await test.done(result => {
            if (result?.errors?.length !== 1 || result?.testsRefused?.length !== 1) {
                return 'Test did not end with expected errors and refused tests';
            }
        });
        return;
    });
    doit('batteries with stops and promises, constructed form', async function () {
        let test = new TestBattery('batteries with stops and promises, constructed form');
        let makeTest = function (n, succeed = true) {
            return new Promise(r => {
                setTimeout(() => { r(succeed); }, 5 + n);
            });
        };
        for (let i = 0; i < 10; i++) {
            if (i % 2 === 0) {
                await test.endIfErrors();
            }
            test.test('equals %s == %s', i, i).value(i).value(i).equal;
            test.isTrue(makeTest(i, (i !== 6 && i !== 8)), 'true %s', i);
        }
        test.done(result => {
            if (result?.errors?.length !== 1 || result?.testsRefused?.length !== 1) {
                return 'Test did not end with expected errors and refused tests';
            }
        });
        return;
    });
});
describe('All tests run', function () {
    it('test is not focused', function (c, done) {
        if (focusTests && focusTests.length) {
            done('focusTests is not empty or undefined');
        }
        else {
            done();
        }
    });
});
//# sourceMappingURL=battery.test.js.map