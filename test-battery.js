'use strict';
import { format } from 'util';
import fs from 'fs';
import path from 'path';
import { types } from 'util';
;
export function isTestErrors(value) {
    if (value.testsRefused !== undefined) {
        if (!Array.isArray(value.testsRefused)) {
            return false;
        }
        if (value.testsRefused.some((v) => typeof v !== 'string')) {
            return false;
        }
    }
    if (value.errors !== undefined) {
        if (!Array.isArray(value.errors)) {
            return false;
        }
        if (value.errors.some((v) => typeof v !== 'string')) {
            return false;
        }
    }
    // test if there are any other properties that are not `testsRefused`,
    // `errors`, or `exception`
    const validKeys = ['testsRefused', 'errors', 'exception'];
    const keys = Object.keys(value);
    if (keys.some((k) => !validKeys.includes(k))) {
        return false;
    }
    return true;
}
;
function get(object, path, defaultValue) {
    let result = object;
    for (let key of path) {
        if (result == null) {
            return defaultValue;
        }
        result = result[key];
    }
    return result === undefined ? defaultValue : result;
}
function inList(term, list, strict) {
    if (!['string', 'number'].includes(typeof term)) {
        throw new Error('`in` and `inStrict` can only validate strings or ' +
            `numbers, got ${typeof term}`);
    }
    for (let listItem of list) {
        if (listItem instanceof Array) {
            if (inList(term, listItem, strict)) {
                return true;
            }
        }
        else {
            if (strict) {
                if (term === listItem) {
                    return true;
                }
            }
            else {
                if (term == listItem) {
                    return true;
                }
            }
        }
    }
    return false;
}
class Test {
    done;
    message;
    values;
    negative;
    operator;
    isComplete;
    options;
    constructor(done, message, options = {}) {
        this.done = done;
        this.message = message;
        // if defined, test will complete when this number reaches zero
        this.values = [];
        this.negative = false;
        this.isComplete = false;
        const testOptions = {
            dummy: options.dummy || false,
            expectedToPass: (options.expectedToPass === false) ? false : true,
            allowEmptyValueSet: (options.allowEmptyValueSet === false) ? false : true
        };
        this.options = testOptions;
    }
    /* ** ** **
      Constructed-form operators start here. These are the operators that are
      defined as properties of the test object. They are defined as getters, so
      they can be called as properties of the test object.
     */
    get array() {
        this.#verifyOperator(values => {
            return values.every((v) => Array.isArray(v.v));
        }, 0);
        return this;
    }
    get boolean() {
        this.#verifyOperator(values => {
            return values.every(v => typeof v.v === 'boolean');
        }, 0);
        return this;
    }
    #fileTest(paths, test) {
        const pathQueue = [...paths.map(p => {
                return Array.isArray(p) ? path.join(...p) : p;
            })];
        let maxInFlight = 10;
        let numTestsInFlight = 0;
        const testPromises = [];
        let isCanceled = false;
        return new Promise((resolve, reject) => {
            const addToQueue = () => {
                if (isCanceled) {
                    return;
                }
                else if (pathQueue.length === 0 && numTestsInFlight === 0) {
                    Promise.all(testPromises).then((ba) => {
                        resolve(ba.every(b => b));
                    });
                }
                else {
                    while (numTestsInFlight < maxInFlight && pathQueue.length) {
                        testPromises.push(test(pathQueue.shift()).then((result) => {
                            addToQueue();
                            return result;
                        }));
                    }
                }
            };
            addToQueue();
        });
    }
    async fileStatTest(paths, test) {
        return this.#fileTest(paths, async (pathname) => {
            if (typeof pathname !== 'string') {
                return false;
            }
            try {
                const stat = await fs.promises.stat(pathname);
                return test(stat);
            }
            catch (error) {
                if (error.code === 'ENOENT') {
                    return false; // file or directory does not exist
                }
                else {
                    throw error; // rethrow other errors
                }
            }
        });
    }
    get directory() {
        this.#verifyOperator(values => {
            return this.fileStatTest(values.map(v => v.v), stat => stat.isDirectory());
        }, 0);
        return this;
    }
    get empty() {
        this.#verifyOperator(values => {
            return values.every(v => {
                let result = false;
                if (Array.isArray(v.v)) {
                    result = (v.v.length === 0);
                }
                else if (typeof v.v === 'string') {
                    result = (v.v === '');
                }
                else if (typeof v.v === 'object' && v.v !== null) {
                    result = (Object.keys(v.v).length === 0);
                }
                // everything not an array, object, or string is false, including
                // `null` and `undefined` stays false
                return result;
            });
        }, 0);
        return this;
    }
    get equal() {
        this.#verifyOperator(values => {
            let a = values[0].v;
            return values.slice(1).every(v => a == v.v);
        }, 0, 2);
        return this;
    }
    get false() {
        this.#verifyOperator(values => {
            return values.every(v => v.v === false);
        }, 1);
        return this;
    }
    get falsey() {
        this.#verifyOperator(values => {
            return values.every(v => !(v.v));
        }, 1);
        return this;
    }
    get fail() {
        this.#verifyOperator(() => {
            return false;
        });
        return this;
    }
    get file() {
        this.#verifyOperator(values => {
            return this.fileStatTest(values.map(v => v.v), stat => stat.isFile());
        }, 0);
        return this;
    }
    get in() {
        this.#verifyOperator(values => {
            let result = inList(values[0].v, values.slice(1).map(v => v.v), false);
            return result;
        }, 2);
        return this;
    }
    get inStrict() {
        this.#verifyOperator(values => {
            let result = inList(values[0].v, values.slice(1).map(v => v.v), true);
            return result;
        }, 2);
        return this;
    }
    get nil() {
        this.#verifyOperator(values => {
            return values.filter(v => v.v !== null && v.v !== undefined).length === 0;
        }, 0);
        return this;
    }
    get null() {
        this.#verifyOperator(values => {
            return values.filter(v => v.v !== null).length === 0;
        }, 0);
        return this;
    }
    get strictlyEqual() {
        this.#verifyOperator(values => {
            let a = values[0].v;
            return values.slice(1).every(v => a === v.v);
        }, 0, 2);
        return this;
    }
    get string() {
        this.#verifyOperator(values => {
            return values.every(v => typeof v.v === 'string');
        }, 0);
        return this;
    }
    get true() {
        this.#verifyOperator(values => {
            return values.every(v => v.v === true);
        }, 0);
        return this;
    }
    get truthy() {
        this.#verifyOperator(values => {
            return values.every(v => !!v.v);
        }, 0);
        return this;
    }
    get undefined() {
        this.#verifyOperator(values => {
            return values.filter(v => v.v !== undefined).length === 0;
        }, 0);
        return this;
    }
    /*
      End of constructed-form operators
     ** ** */
    /**
     * Verifies the operator and the number of values it has. If the number of
     * values is correct, the test can complete, if not, it can wait for more
     * values to be added.
     * @param operator The operator to verify. This function takes all the
     *  values that have been added to the test so far and returns either a
     *  `boolean` or a `Promise` that resolves to a `boolean`.
     * @param numArgs The minimum number of values the operator expects. If the
     *  operator doesn't expect any values at all, this should be `null`. If the
     *  operator expects an exact number of values, use a negative number.
     *  Example: `2` means minimum of 2 values, `-2` means exactly 2 values, 0
     *  means any number of values is allowed, and `null` means that
     *  no values are permitted. Default it `null`.
     * @param numArgsStrict when allowEmptyValueSet is `false`, this is the
     *  minimum number of values that the operator expects to be present in the
     *  test. Ignored if `numArgs` is negative or `null`. Default is `1`, which
     *  means at least one value is expected.
     * @throws Error if the test has already completed or if the number of values
     *  is not correct for the operator.
     */
    #verifyOperator(operator, numArgs = null, numArgsStrict = 1) {
        this.#testIfComplete();
        this.operator = operator;
        if (this.message === 'unpermitted vacuously true') {
            if (numArgs !== null) {
                if (this.options.allowEmptyValueSet === false) {
                    if (this.values.length < numArgsStrict) {
                        this.#complete(false);
                        return;
                    }
                }
            }
        }
        // if allowEmptyValueSet is false, we need to ensure that
        // there are at least `numArgsStrict` values in the test
        if (numArgs !== null) {
            if (this.options.allowEmptyValueSet === false) {
                if (this.values.length < numArgsStrict) {
                    this.#complete(false);
                }
            }
        }
        if (numArgs === null || numArgs === undefined) {
            if (this.values.length > 0) {
                throw new Error(`Test "${this.message}" does not expect any values`);
            }
        }
        else if (numArgs >= 0) {
            if (this.values.length < numArgs) {
                throw new Error(`Test "${this.message}" expects at least ` +
                    `${numArgs} values, got ${this.values.length}`);
            }
        }
        else if (numArgs < 0) {
            if (this.values.length !== (-numArgs)) {
                throw new Error(`Test "${this.message}" expects exactly ` +
                    `${-numArgs} values, got ${this.values.length}`);
            }
        }
        this.#complete();
    }
    async #complete(predeterminedResult = null) {
        if (predeterminedResult !== null) {
            if (this.options?.expectedToPass !== this.negative) {
                predeterminedResult = !predeterminedResult;
            }
            if (!!predeterminedResult == !!this.options?.expectedToPass) {
                this.done();
            }
            else {
                this.done(this.message);
            }
            return;
        }
        this.isComplete = true;
        const resolvedValues = await Promise.all(this.values);
        let result;
        if (this.operator === undefined) {
            throw new Error('Operator not identified for test');
        }
        else {
            result = await this.operator(resolvedValues);
        }
        if (this.negative) {
            result = !result;
        }
        if (this.done) {
            if (!result === this.options.expectedToPass) {
                this.done(this.message);
            }
            else {
                this.done();
            }
        }
    }
    #testIfComplete() {
        if (this.isComplete) {
            throw new Error('test already complete');
        }
    }
    get a() {
        this.#testIfComplete();
        return this;
    }
    get are() {
        this.#testIfComplete();
        return this;
    }
    get is() {
        this.#testIfComplete();
        return this;
    }
    member(path, defaultValue) {
        this.#testIfComplete();
        let lastValueIdx = this.values.length - 1;
        if (lastValueIdx < 0) {
            throw new Error(`Test \"${this.message}\" member must follow a value`);
        }
        let lastValue = this.values[lastValueIdx];
        if (types.isPromise(lastValue)) {
            this.values[lastValueIdx] =
                lastValue.then(v => get(v, path, defaultValue));
        }
        else {
            this.values[lastValueIdx] = get(lastValue, path, defaultValue);
        }
        return this;
    }
    get not() {
        this.#testIfComplete();
        this.negative = !this.negative;
        return this;
    }
    value(v) {
        this.#testIfComplete();
        if (types.isPromise(v)) {
            this.values.push(v.then(v => { v; }));
        }
        else {
            this.values.push({ v });
        }
        return this;
    }
    v(v) {
        return this.value(v);
    }
}
export class TestBattery {
    #name;
    #errors;
    #promises;
    #testsCompleted;
    #refuseTests;
    #testsRefused;
    #expectedToPass;
    #allowDeprecated;
    #allowEmptyValueSet;
    constructor(name, options) {
        const falseIf = (v) => {
            return v === false ? false : true;
        };
        this.#name = name;
        this.#errors = [];
        this.#promises = [];
        this.#testsCompleted = 0;
        this.#refuseTests = false;
        this.#testsRefused = [];
        this.#expectedToPass = (options?.expectedToPass === false) ? false : true;
        this.#allowDeprecated = (options?.allowDeprecated === false) ? false : true;
        this.#expectedToPass = falseIf(options?.expectedToPass);
        this.#allowDeprecated = falseIf(options?.allowDeprecated);
        this.#allowEmptyValueSet = falseIf(options?.allowEmptyValueSet);
    }
    get name() { return this.#name; }
    set name(name) { this.#name = name; }
    get errors() { return this.#errors; }
    set errors(errors) { this.#errors = errors; }
    get promises() { return this.#promises; }
    set promises(promises) {
        this.#promises = promises;
    }
    get testsCompleted() { return this.#testsCompleted; }
    set testsCompleted(testsCompleted) {
        this.#testsCompleted = testsCompleted;
    }
    get refuseTests() { return this.#refuseTests; }
    set refuseTests(refuseTests) { this.#refuseTests = refuseTests; }
    get testsRefused() { return this.#testsRefused; }
    set testsRefused(testsRefused) {
        this.#testsRefused = testsRefused;
    }
    get expectedToPass() { return this.#expectedToPass; }
    // no setter for expectedToPass, it's set in the constructor
    #allowDeprecatedMethods() {
        if (false === this.#allowDeprecated) {
            throw new Error('Deprecated TestBattery methods are disabled');
        }
    }
    test(should, ...params) {
        let message = format.apply(null, [should].concat(params || []));
        let testOptions = {
            dummy: false,
            allowEmptyValueSet: this.#allowEmptyValueSet
        };
        let testPromiseResolve;
        let testPromiseReject;
        this.promises.push(new Promise((resolve, reject) => {
            testPromiseResolve = resolve;
            testPromiseReject = reject;
        }));
        if (this.refuseTests) {
            this.testsRefused.push(message);
            testOptions.dummy = true;
        }
        if (this.expectedToPass === false) {
            testOptions.expectedToPass = false;
        }
        let result = new Test((error) => {
            if (error) {
                this.errors.push(error);
            }
            testPromiseResolve && testPromiseResolve();
            this.testsCompleted++;
        }, message, testOptions);
        return result;
    }
    /**
     * @method awaitOutstandingTests
     * Returns a promise that resolves when all the current tests have been
     * resolved.
     * @returns {Promise<boolean>} promise that resolves with `true` if there are
     *  no errors when the currently-outstanding promises resolves and `false` if
     *  there are.
     */
    awaitOutstandingTests() {
        return Promise.allSettled(this.promises)
            .then(() => { return !this.errors.length; });
    }
    /**
     * @method done
     * Reports the result of the test battery by calling the provided `done`
     * function with the results. If there are errors or tests have been refused,
     * it'll call the `done` function with an object that lists the errors and
     * refused tests. If there are no errors or refused tests, it calls done
     * without any parameters;
     * @param done
     */
    done(done) {
        const buildErrorsObject = () => {
            if (this.errors.length || this.testsRefused.length) {
                let result = {
                    errors: this.errors
                };
                if (this.refuseTests) {
                    result.testsRefused = [...this.testsRefused];
                }
                return result;
            }
        };
        return Promise.allSettled(this.promises)
            .then(() => {
            const errorsObject = buildErrorsObject();
            done && done(errorsObject);
            return errorsObject;
        })
            .catch((error) => {
            const errorsObject = buildErrorsObject() || {};
            errorsObject.exception = error;
            done && done(errorsObject);
            return errorsObject;
        });
    }
    /**
     * @method doTest
     * Complete the test
     * @private
     * @param {Function} core the test function, return `true` if success,
     *  `false` if failed
     * @param {*} result the result to test. If the result is a Promise, this'll
     *  test the results of the promise
     * @param {string} should the error message to add if there's a failure.
     * @param {...any} params parameters for the error message
     */
    doTest(core, result, should, params) {
        const errorString = () => {
            return format.apply(null, [should].concat(params || []));
        };
        const testCoreResult = (coreResult) => {
            if (types.isPromise(coreResult)) {
                this.promises.push(coreResult);
                coreResult.then(r => {
                    testCoreResult(r);
                });
            }
            else {
                if ((!coreResult) === this.expectedToPass) {
                    this.errors.push(errorString());
                }
                this.testsCompleted++;
            }
        };
        if (this.refuseTests) {
            this.testsRefused.push(errorString());
            return;
        }
        if (types.isPromise(result)) {
            this.promises.push(result);
            result.then(r => {
                this.doTest(core, r, should, params);
            });
        }
        else {
            let coreResult = core(result);
            testCoreResult(coreResult);
        }
    }
    /**
     * @method endIfErrors
     * Call this method to ensure all previous tests have been successful before
     * resuming. If any tests end in error, this battery will refuse all further
     * tests. This method returns a Promise; it cannot guarantee it'll stop tests
     * until this promise has resolved.
     * @return {Promise} promise that resolves when all existing promises have
     *  been resolved, or at least one promise has been rejected.
     */
    endIfErrors() {
        return Promise.all(this.promises)
            .then(() => {
            if (this.errors.length) {
                this.refuseTests = true;
            }
            return;
        });
    }
    /**
     * @method fail
     * Tests that always fails
     * @param {*} [result] the result to test.
     * @param {string} should an error message. Can include parameterizations to
     *  be filled in with `format`.
     * @param  {...any} [params] parameters for the error message
     */
    fail(should, ...params) {
        this.doTest(function () {
            return false;
        }, undefined, should, params);
    }
    /**
     * @method isArray
     * @deprecated
     * Tests if `result` is an array.
     * @param {*} result the result to test. If `result` is a promise, it'll test
     *  the value that the promise resolves with.
     * @param {string} should an error message. Can include parameterizations to
     *  be filled in with `format`.
     * @param  {...any} [params] parameters for the error message
     */
    isArray(result, should, ...params) {
        this.#allowDeprecatedMethods();
        this.doTest(function (result) {
            return Array.isArray(result);
        }, result, should, params);
    }
    /**
     * @method isBoolean
     * @deprecated
     * Tests if `result` is an boolean. Accepts both primitive booleans and
     * Boolean objects.
     * @param {*} result the result to test. If `result` is a promise, it'll test
     *  the value that the promise resolves with.
     * @param {string} should an error message. Can include parameterizations to
     *  be filled in with `format`.
     * @param  {...any} [params] parameters for the error message
     */
    isBoolean(result, should, ...params) {
        this.#allowDeprecatedMethods();
        this.doTest(function (result) {
            return (typeof (result) === 'boolean' || types.isBooleanObject(result));
        }, result, should, params);
    }
    /**
     * @method isDirectory
     * @deprecated
     * Tests if `result` is the path of a directory. Accepts a `string` or an
     * array of `string`s; it it's an array, it'll join the array before testing
     * it. All other types will always fail the test.
     * @param {*} result the result to test. If `result` is a promise, it'll test
     *  the value that the promise resolves with.
     * @param {string} should an error message. Can include parameterizations to
     *  be filled in with `format`.
     * @param  {...any} [params] parameters for the error message
     */
    isDirectory(result, should, ...params) {
        this.#allowDeprecatedMethods();
        this.doTest(function (result) {
            if (Array.isArray(result)) {
                result = path.join.apply(null, result);
            }
            if (typeof (result) !== 'string') {
                return false;
            }
            return fs.promises.stat(result)
                .then((stat) => {
                return stat.isDirectory();
            })
                .catch(() => {
                return false;
            });
        }, result, should, params);
    }
    /**
     * @method isEmptyArray
     * Tests if `result` is an empty array.
     * @param {*} result the result to test. If `result` is a promise, it'll test
     *  the value that the promise resolves with.
     * @param {string} should an error message. Can include parameterizations to
     *  be filled in with `format`.
     * @param  {...any} [params] parameters for the error message
     */
    isEmptyArray(result, should, ...params) {
        this.#allowDeprecatedMethods();
        this.doTest(function (result) {
            return Array.isArray(result) && result.length === 0;
        }, result, should, params);
    }
    /**
     * @method isEmptyObject
     * @deprecated
     * Tests if `result` is an empty object that is not an array.
     * @param {*} result the result to test. If `result` is a promise, it'll test
     *  the value that the promise resolves with.
     * @param {string} should an error message. Can include parameterizations to
     *  be filled in with `format`.
     * @param  {...any} [params] parameters for the error message
     */
    isEmptyObject(result, should, ...params) {
        this.#allowDeprecatedMethods();
        this.doTest(function (result) {
            return (typeof result === 'object') && (!Array.isArray(result)) &&
                ((Object.keys(result)).length === 0);
        }, result, should, params);
    }
    /**
     * @method isEmptyString
     * @deprecated
     * Tests if `result` is an empty string. Accepts both string primitives and
     * String objects.
     * @param {*} result the result to test. If `result` is a promise, it'll test
     *  the value that the promise resolves with.
     * @param {string} should an error message. Can include parameterizations to
     *  be filled in with `format`.
     * @param  {...any} [params] parameters for the error message
     */
    isEmptyString(result, should, ...params) {
        this.#allowDeprecatedMethods();
        this.doTest(function (result) {
            return (typeof (result) === 'string' || types.isStringObject(result))
                && result.length === 0;
        }, result, should, params);
    }
    /**
     * @method isEqual
     * @deprecated
     * Tests if two values are equal. This uses the `==` operator. For strict
     * equality (`===`), use `isStrictlyEqual`.
     * @param {*} a the first value to test. If `result` is a promise, it'll test
     *  the value that the promise resolves with.
     * @param {*} a the second value to test. If `result` is a promise, it'll test
     *  the value that the promise resolves with.
     * @param {string} should an error message. Can include parameterizations to
     *  be filled in with `format`.
     * @param  {...any} [params] parameters for the error message
     */
    isEqual(a, b, should, ...params) {
        this.#allowDeprecatedMethods();
        this.doTest(function (result) {
            return result[0] == result[1];
        }, Promise.all([a, b]), should, params);
    }
    /**
     * @method isFalse
     * @deprecated
     * Tests if `result` is equal to false. Accepts both boolean primitives and
     * Boolean objects. Note this must equal `false` or `new Boolean(false)`, not
     * just evaluate to false.
     * @param {*} result the result to test. If `result` is a promise, it'll test
     *  the value that the promise resolves with.
     * @param {string} should an error message. Can include parameterizations to
     *  be filled in with `format`.
     * @param  {...any} [params] parameters for the error message
     */
    isFalse(result, should, ...params) {
        this.#allowDeprecatedMethods();
        this.doTest(function (result) {
            return (result === false ||
                (result && result.valueOf && result.valueOf(result) === false));
        }, result, should, params);
    }
    /**
     * @method isFalsey
     * @deprecated
     * Tests if `result` is falsey, that is, any value that would be `true` if you
     * added a bang to it. (e.g. !null === true)
     * @param {*} result the result to test. If `result` is a promise, it'll test
     *  the value that the promise resolves with.
     * @param {string} should an error message. Can include parameterizations to
     *  be filled in with `format`.
     * @param  {...any} [params] parameters for the error message
     */
    isFalsey(result, should, ...params) {
        this.#allowDeprecatedMethods();
        this.doTest(function (result) {
            return (!result);
        }, result, should, params);
    }
    /**
     * @method isFile
     * @deprecated
     * Tests if `result` is the path of a regular file. Accepts a `string` or an
     * array of `string`s; it it's an array, it'll join the array before testing
     * it. All other types will always fail the test.
     * @param {*} result the result to test. If `result` is a promise, it'll test
     *  the value that the promise resolves with.
     * @param {string} should an error message. Can include parameterizations to
     *  be filled in with `format`.
     * @param  {...any} [params] parameters for the error message
     */
    isFile(result, should, ...params) {
        this.#allowDeprecatedMethods();
        this.doTest(function (result) {
            if (Array.isArray(result)) {
                result = path.join.apply(null, result);
            }
            if (typeof (result) !== 'string') {
                return false;
            }
            return fs.promises.stat(result)
                .then((stat) => {
                return stat.isFile();
            })
                .catch(() => {
                return false;
            });
        }, result, should, params);
    }
    /**
     * @method isNil
     * @deprecated
     * Tests if `result` is `null` or `undefined`.
     * @param {*} result the result to test. If `result` is a promise, it'll test
     *  the value that the promise resolves with.
     * @param {string} should an error message. Can include parameterizations to
     *  be filled in with `format`.
     * @param  {...any} [params] parameters for the error message
     */
    isNil(result, should, ...params) {
        this.#allowDeprecatedMethods();
        this.doTest(function (result) {
            return (result === null || result === undefined);
        }, result, should, params);
    }
    /**
     * @method isNull
     * @deprecated
     * Tests if `result` is `null`.
     * @param {*} result the result to test. If `result` is a promise, it'll test
     *  the value that the promise resolves with.
     * @param {string} should an error message. Can include parameterizations to
     *  be filled in with `format`.
     * @param  {...any} [params] parameters for the error message
     */
    isNull(result, should, ...params) {
        this.#allowDeprecatedMethods();
        this.doTest(function (result) {
            return result === null;
        }, result, should, params);
    }
    /**
     * @method isStrictlyEqual
     * @deprecated
     * Tests if two values are equal. This uses the `===` operator. For non-strict
     * equality (`===`), use `isEqual`.
     * @param {*} a the first value to test. If `result` is a promise, it'll test
     *  the value that the promise resolves with.
     * @param {*} a the second value to test. If `result` is a promise, it'll test
     *  the value that the promise resolves with.
     * @param {string} should an error message. Can include parameterizations to
     *  be filled in with `format`.
     * @param  {...any} [params] parameters for the error message
     */
    isStrictlyEqual(a, b, should, ...params) {
        this.#allowDeprecatedMethods();
        this.doTest(function (result) {
            return result[0] === result[1];
        }, Promise.all([a, b]), should, params);
    }
    /**
     * @method isString
     * @deprecated
     * Tests if `result` is a string. Accepts both primitive strings and String
     * objects.
     * @param {*} result the result to test. If `result` is a promise, it'll test
     *  the value that the promise resolves with.
     * @param {string} should an error message. Can include parameterizations to
     *  be filled in with `format`.
     * @param  {...any} [params] parameters for the error message
     */
    isString(result, should, ...params) {
        this.#allowDeprecatedMethods();
        this.doTest(function (result) {
            return typeof (result) === 'string' || types.isStringObject(result);
        }, result, should, params);
    }
    /**
     * @method isTrue
     * @deprecated
     * Tests if `result` is equal to true. Accepts both boolean primitives and
     * Boolean objects. Note this must equal `true` or `new Boolean(true)`, not
     * just evaluate to true.
     * @param {*} result the result to test. If `result` is a promise, it'll test
     *  the value that the promise resolves with.
     * @param {string} should an error message. Can include parameterizations to
     *  be filled in with `format`.
     * @param  {...any} [params] parameters for the error message
     */
    isTrue(result, should, ...params) {
        this.#allowDeprecatedMethods();
        this.doTest(function (result) {
            return (result === true ||
                (result && result.valueOf && result.valueOf(result) === true));
        }, result, should, params);
    }
    /**
     * @method isTruthy
     * @deprecated
     * Tests if `result` is truthy, that is, any value that would be `true` if you
     * added a double bang to it. (e.g. !!'hi' === true)
     * @param {*} result the result to test. If `result` is a promise, it'll test
     *  the value that the promise resolves with.
     * @param {string} should an error message. Can include parameterizations to
     *  be filled in with `format`.
     * @param  {...any} [params] parameters for the error message
     */
    isTruthy(result, should, ...params) {
        this.#allowDeprecatedMethods();
        this.doTest(function (result) {
            return (!!result);
        }, result, should, params);
    }
    /**
     * @method isUndefined
     * @deprecated
     * Tests if `result` is an `undefined`.
     * @param {*} result the result to test. If `result` is a promise, it'll test
     *  the value that the promise resolves with.
     * @param {string} should an error message. Can include parameterizations to
     *  be filled in with `format`.
     * @param  {...any} [params] parameters for the error message
     */
    isUndefined(result, should, ...params) {
        this.#allowDeprecatedMethods();
        this.doTest(function (result) {
            return result === undefined;
        }, result, should, params);
    }
}
export default TestBattery;
//# sourceMappingURL=test-battery.js.map