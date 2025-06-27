/// <reference types="node" />
import fs from 'fs';
export interface TestErrors {
    testsRefused?: Array<string>;
    errors?: Array<string>;
    exception?: any;
}
export declare function isTestErrors(value: any): value is TestErrors;
export interface TestValue {
    v: any;
}
export type TestDoneCallback = (errors?: TestErrors) => void;
interface TestOptions {
    allowEmptyValueSet?: boolean;
    dummy: boolean;
    expectedToPass?: boolean;
}
type TestOperatorFn = (v: TestValue[]) => boolean | Promise<boolean>;
declare class Test {
    #private;
    done: Function;
    message: string;
    values: Array<TestValue | Promise<any>>;
    negative: boolean;
    operator: TestOperatorFn | undefined;
    isComplete: boolean;
    options: TestOptions;
    constructor(done: Function, message: string, options?: Partial<TestOptions>);
    get array(): Test;
    get boolean(): Test;
    fileStatTest(paths: (string | string[])[], test: (stat: fs.Stats) => boolean | Promise<boolean>): Promise<boolean>;
    get directory(): Test;
    get empty(): Test;
    get equal(): Test;
    get false(): Test;
    get falsey(): Test;
    get fail(): Test;
    get file(): Test;
    get in(): Test;
    get inStrict(): Test;
    get nil(): Test;
    get null(): Test;
    get strictlyEqual(): Test;
    get string(): Test;
    get true(): Test;
    get truthy(): Test;
    get undefined(): Test;
    get a(): this;
    get are(): this;
    get is(): this;
    member(path: (string | number)[], defaultValue?: any): this;
    get not(): this;
    value(v: any): this;
    v(v: any): this;
}
export interface TestBatteryOptions {
    /**
     * Set to `false` to force an exception to be thrown if any tests in
     * this battery use the deprecated simple-form test methods. This is mainly
     * used for automating the test battery itself. Default is `true`, which
     * allows the deprecated methods to be used.
     */
    allowDeprecated?: boolean;
    /**
     * What to return for tests with no values. For example, if a test is
     * `string`, which would return true if all values are strings, but there
     * are no values, logically this would be true, but it could indicate a
     * bug in the test. If this is set to `false`, the test will return `false`
     * if there are no values. Default is `true`
     */
    allowEmptyValueSet?: boolean;
    /**
     * What the result of all tests in this battery is expected to be. By default,
     * this is `true`, meaning all tests are expected to pass. If set to `false`,
     * all tests in this battery are expected to fail. This is useful for
     * testing error conditions.
     * @property {boolean} resultsExpected
     */
    expectedToPass?: boolean;
}
export declare class TestBattery {
    #private;
    constructor(name: string, options?: TestBatteryOptions);
    get name(): string;
    private set name(value);
    get errors(): Array<string>;
    private set errors(value);
    private get promises();
    private set promises(value);
    get testsCompleted(): number;
    private set testsCompleted(value);
    get refuseTests(): boolean;
    private set refuseTests(value);
    get testsRefused(): Array<string>;
    private set testsRefused(value);
    get expectedToPass(): boolean;
    test(should: string, ...params: any[]): Test;
    /**
     * @method awaitOutstandingTests
     * Returns a promise that resolves when all the current tests have been
     * resolved.
     * @returns {Promise<boolean>} promise that resolves with `true` if there are
     *  no errors when the currently-outstanding promises resolves and `false` if
     *  there are.
     */
    awaitOutstandingTests(): Promise<boolean>;
    /**
     * @method done
     * Reports the result of the test battery by calling the provided `done`
     * function with the results. If there are errors or tests have been refused,
     * it'll call the `done` function with an object that lists the errors and
     * refused tests. If there are no errors or refused tests, it calls done
     * without any parameters;
     * @param done
     */
    done(done?: (errors?: TestErrors) => void): Promise<TestErrors | undefined>;
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
    doTest(core: Function, result: any, should: string, params: any[]): void;
    /**
     * @method endIfErrors
     * Call this method to ensure all previous tests have been successful before
     * resuming. If any tests end in error, this battery will refuse all further
     * tests. This method returns a Promise; it cannot guarantee it'll stop tests
     * until this promise has resolved.
     * @return {Promise} promise that resolves when all existing promises have
     *  been resolved, or at least one promise has been rejected.
     */
    endIfErrors(): Promise<void>;
    /**
     * @method fail
     * Tests that always fails
     * @param {*} [result] the result to test.
     * @param {string} should an error message. Can include parameterizations to
     *  be filled in with `format`.
     * @param  {...any} [params] parameters for the error message
     */
    fail(should: string, ...params: any[]): void;
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
    isArray(result: any, should: string, ...params: any[]): void;
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
    isBoolean(result: any, should: string, ...params: any[]): void;
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
    isDirectory(result: any, should: string, ...params: any[]): void;
    /**
     * @method isEmptyArray
     * Tests if `result` is an empty array.
     * @param {*} result the result to test. If `result` is a promise, it'll test
     *  the value that the promise resolves with.
     * @param {string} should an error message. Can include parameterizations to
     *  be filled in with `format`.
     * @param  {...any} [params] parameters for the error message
     */
    isEmptyArray(result: any, should: string, ...params: any[]): void;
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
    isEmptyObject(result: any, should: string, ...params: any[]): void;
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
    isEmptyString(result: any, should: string, ...params: any[]): void;
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
    isEqual(a: any, b: any, should: string, ...params: any[]): void;
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
    isFalse(result: any, should: string, ...params: any[]): void;
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
    isFalsey(result: any, should: string, ...params: any[]): void;
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
    isFile(result: any, should: string, ...params: any[]): void;
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
    isNil(result: any, should: string, ...params: any[]): void;
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
    isNull(result: any, should: string, ...params: any[]): void;
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
    isStrictlyEqual(a: any, b: any, should: string, ...params: any[]): void;
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
    isString(result: any, should: string, ...params: any[]): void;
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
    isTrue(result: any, should: string, ...params: any[]): void;
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
    isTruthy(result: any, should: string, ...params: any[]): void;
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
    isUndefined(result: any, should: string, ...params: any[]): void;
}
export default TestBattery;
