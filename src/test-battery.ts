'use strict';

import { format } from 'util';
import fs from 'fs';
import path, { resolve } from 'path';
import { types } from 'util';

export interface TestErrors {
  testsRefused?: Array<string>;
  errors?: Array<string>;
  // only if there is a promise rejection
  exception?: any;
};
export function isTestErrors(value:any): value is TestErrors {
  if (value.testsRefused !== undefined) {
    if (!Array.isArray(value.testsRefused)) {
      return false;
    }
    if (value.testsRefused.some((v:any) => typeof v !== 'string')) {
      return false;
    }
  }
  if (value.errors !== undefined) {
    if (!Array.isArray(value.errors)) {
      return false;
    }
    if (value.errors.some((v:any) => typeof v !== 'string')) {
      return false;
    }
  }
  // test if there are any other properties that are not `testsRefused`,
  // `errors`, or `exception`
  const validKeys = ['testsRefused', 'errors', 'exception'];
  const keys = Object.keys(value);
  if (keys.some((k:any) => !validKeys.includes(k))) {
    return false;
  }

  return true;
}
export interface TestValue {
  v: any;
};
export type TestDoneCallback = (errors?:TestErrors)=>void;

interface TestOptions {
  allowEmptyValueSet?: boolean;
  dummy: boolean;
  expectedToPass?: boolean;
}

type TestOperatorFn = (v:TestValue[])=>boolean|Promise<boolean>;

function get<TObject, TValue>(
  object: TObject,
  path: Array<string | number>,
  defaultValue?: TValue
): TValue | undefined {
  let result: any = object;

  for (let key of path) {
      if (result == null) {
          return defaultValue;
      }
      result = result[key];
  }

  return result === undefined ? defaultValue : result;
}

function inList(term:string|number, list:Array<any>, strict:boolean):boolean {
  if (!['string', 'number'].includes(typeof term)) {
    throw new Error('`in` and `inStrict` can only validate strings or ' +
      `numbers, got ${typeof term}`);
  }
  for (let listItem of list) {
    if (listItem instanceof Array) {
      if (inList(term, listItem, strict)) {
        return true;
      }
    } else {
      if (strict) {
        if (term === listItem) {
          return true;
        }
      } else {
        if (term == listItem) {
          return true;
        }
      }
    }
  }
  return false;
}

class Test {

  done:Function;
  message:string;
  values:Array<TestValue|Promise<any>>;
  negative:boolean;
  operator:TestOperatorFn|undefined;
  isComplete:boolean;
  options:TestOptions;

  constructor(
    done:Function,
    message:string,
    options:Partial<TestOptions> = {}
  ) {
    this.done = done;
    this.message = message;
    // if defined, test will complete when this number reaches zero
    this.values = [];
    this.negative = false;
    this.isComplete = false;

    const testOptions:TestOptions = {
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

  /**
   * Succeeds if all the values in the test are arrays, fails if any of the
   * values provided is not an array.
   */
  get array():Test {
    this.#verifyOperator(values => {
      return values.every((v:TestValue) => Array.isArray(v.v));
    }, 0);
    return this;
  }

  /**
   * Succeeds if all the values in the test are booleans, fails if any of the
   * values provided is not a boolean.
   * 
   * Since version 3.0.0, this operator only accepts primitive booleans, not
   * Boolean objects.
   */
  get boolean():Test {
    this.#verifyOperator(values => {
      return values.every(v => typeof v.v === 'boolean');
    }, 0);
    return this;
  }

  /**
   * Succeeds if all the values in the test are directories, fails if any of
   * the values provided is not a directory. Accepts a `string` or an
   * array of `string`s; if it's an array, it'll join the array before
   * testing it. All other types will always fail the test.
   */
  get directory():Test {
    this.#verifyOperator(values => {
      return this.#fileStatTest(
        values.map(v => v.v),
        stat => stat.isDirectory()
      )
    }, 0);
    return this;
  }

  /**
   * Succeeds if all the values in the test are empty arrays, empty objects,
   * or empty strings. Fails if any of the values provided is not an
   * empty array, empty object, or empty string.
   */
  get empty():Test {
    this.#verifyOperator(values => {
      return values.every(v => {
        let result = false;
        if (Array.isArray(v.v)) {
          result = (v.v.length === 0)
        } else if (typeof v.v === 'string') {
          result = (v.v === '');
        } else if (typeof v.v === 'object' && v.v !== null) {
          result = (Object.keys(v.v).length === 0)
        }
        // everything not an array, object, or string is false, including
        // `null` and `undefined` stays false
        return result;
      });
    }, 0);
    return this;
  }

  /**
   * Succeeds if all the values in the test are equal to each other, fails if
   * any two of the values provided are not equal. This uses loose equality,
   * i.e. the `==` operator. Use `strictlyEqual` for strict equality.
   * 
   * If `allowEmptyValueSet` is `false`, this will fail if there are fewer than
   * two values in the test. If `allowEmptyValueSet` is `true`, this will
   * succeed as vacuously true if there are no values in the test.
   */
  get equal():Test {
    this.#verifyOperator(values => {
      if (!values.length) {
        // allowEmptySet is tested by #verifyOperator
        return true;
      }
      let a = values[0].v;
      return values.slice(1).every(v => a == v.v);
    }, 0, 2);
    return this;
  }

  /**
   * Succeeds if all the values in the test are strictly equal `false`. Fails
   * if any of the values provided is not strictly equal to `false`.
   */
  get false():Test {
    this.#verifyOperator(values => {
      return values.every(v => v.v === false);
    }, 1);
    return this;
  }

  /**
   * Succeeds if all the values in the test are falsey, i.e. `false`, `null`,
   * `undefined`, `0`, `NaN`, or an empty string. Fails if any of the
   * values provided is not falsey.
   */
  get falsey():Test {
    this.#verifyOperator(values => {
      return values.every(v => !(v.v));
    }, 1);
    return this;
  }

  /**
   * Always fails the test. This is useful for testing error conditions.
   */
  get fail():Test {
    this.#verifyOperator(() => {
      return false;
    });
    return this;
  }

  /**
   * Succeeds if all the values in the test are regular files, fails if any of
   * the values provided is not a regular file. Accepts a `string` or an
   * array of `string`s; if it's an array, it'll join the array before
   * testing it. All other types will always fail the test.
   */
  get file():Test {
    this.#verifyOperator(values => {
      return this.#fileStatTest(
        values.map(v => v.v),
        stat => stat.isFile()
      )
    }, 0);
    return this;
  }

  /**
   * Succeeds if the first value is in any of the lists provided in subsequent
   * values. The lists can be arrays or strings, and the first value can be a
   * `string` or a `number`. This uses loose equality, i.e. the `==`
   * operator. Use `inStrict` for strict equality.
   */
  get in():Test {
    this.#verifyOperator(values => {
      let result = inList(values[0].v, values.slice(1).map(v=>v.v), false);
      return result;
    }, 2);
    return this;
  }

  /**
   * Succeeds if the first value is in any of the lists provided in subsequent
   * values. The lists can be arrays or strings, and the first value can be a
   * `string` or a `number`. This uses strict equality, i.e. the `===`
   * operator. Use `in` for loose equality.
   */
  get inStrict():Test {
    this.#verifyOperator(values => {
      let result = inList(values[0].v, values.slice(1).map(v=>v.v), true);
      return result;
    }, 2);
    return this;
  }

  /**
   * Succeeds if all the values in the test are either `null` or `undefined`,
   * fails if any of the values provided is not `null` or `undefined`.
   */
  get nil():Test {
    this.#verifyOperator(values => {
      return values.filter(v => v.v !== null && v.v !== undefined).length === 0;
    }, 0);
    return this;
  }

  /**
   * Succeeds if all the values in the test are `null`, fails if any of
   * the values provided is not `null`. This is different from `nil`, which
   * succeeds if all the values are either `null` or `undefined`.
   */
  get null():Test {
    this.#verifyOperator(values => {
      return values.filter(v => v.v !== null).length === 0;
    }, 0);
    return this;
  }

  /**
   * Succeeds if all the values in the test are equal to each other, fails if
   * any two of the values provided are not equal. This uses strict equality,
   * i.e. the `===` operator. Use `equal` for loose equality.
   * 
   * If `allowEmptyValueSet` is `false`, this will fail if there are fewer than
   * two values in the test. If `allowEmptyValueSet` is `true`, this will
   * succeed as vacuously true if there are no values in the test.
   */
  get strictlyEqual():Test {
    this.#verifyOperator(values => {
      let a = values[0].v;
      return values.slice(1).every(v => a === v.v);
    }, 0, 2);
    return this;
  }

  /**
   * Succeeds if all the values in the test are strings, fails if any of
   * the values provided is not a string. This does not accept
   * `String` objects, only primitive strings.
   * 
   * Since version 3.0.0, this operator only accepts primitive strings, not
   * `String` objects.
   */
  get string():Test {
    this.#verifyOperator(values => {
      return values.every(v => typeof v.v === 'string')
    }, 0);
    return this;
  }

  /**
   * Succeeds if all the values are strictly `true`, fails if any of
   * the values provided is not strictly `true`.
   * 
   * Since version 3.0.0, this operator only accepts primitive booleans, not
   * Boolean objects.
   */
  get true():Test {
    this.#verifyOperator(values => {
      return values.every(v => v.v === true);
    }, 0);
    return this;
  }

  /**
   * Succeeds if all the values in the test are truthy, i.e. not
   * `false`, `null`, `undefined`, `0`, `NaN`, or an empty string.
   * Fails if any of the values provided is not truthy. This is different from
   * `true`, which succeeds if all the values are strictly `true`.
   */
  get truthy():Test {
    this.#verifyOperator(values => {
      return values.every(v => !!v.v);
    }, 0);
    return this;
  }

  /**
   * Succeeds if all the values in the test are `undefined`, fails if
   * any of the values provided is not `undefined`.
   */
  get undefined():Test {
    this.#verifyOperator(values => {
      return values.filter(v => v.v !== undefined).length === 0;
    }, 0);
    return this;
  }

  /*
    End of constructed-form operators
   ** ** */

  #fileTest(
    paths:(string|string[])[],
    test:(pathname:string)=>Promise<boolean>
  ):Promise<boolean> {
    const pathQueue = [...(paths.map(p => {
      return Array.isArray(p) ? path.join(...p) : p
    }) as unknown as string)] as string[];
    let maxInFlight = 10;
    let numTestsInFlight = 0;
    const testPromises:Promise<boolean>[] = [];
    let isCanceled = false;

    return new Promise<boolean>((resolve, reject) => {

      const addToQueue = ():void => {
        if (isCanceled) {
          return;
        } else if (pathQueue.length === 0 && numTestsInFlight === 0) {
          Promise.all(testPromises).then((ba:boolean[]) => {
            resolve(ba.every(b => b));
          });
        } else {
          while (numTestsInFlight < maxInFlight && pathQueue.length) {
            testPromises.push(
              test(pathQueue.shift() as string).then((result:boolean) => {
                  addToQueue();
                  return result;
                })
            );
          }
        }
      };
      addToQueue();
    });
  }

  async #fileStatTest(
    paths:(string|string[])[],
    test:(stat:fs.Stats)=>boolean|Promise<boolean>
  ):Promise<boolean> {
    return this.#fileTest(
      paths,
      async (pathname:string) => {
        if (typeof pathname !== 'string') {
          return false;
        }
        try {
          const stat:fs.Stats = await fs.promises.stat(pathname);
          return test(stat);
        } catch (error:any) {
          if (error.code === 'ENOENT') {
            return false; // file or directory does not exist
          } else {
            throw error; // rethrow other errors
          }
        }
      }
    );
  }

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
  #verifyOperator(
    operator:TestOperatorFn,
    numArgs:number|null = null,
    numArgsStrict:number = 1
  ):void {
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
    } else if (numArgs >= 0) {
      if (this.values.length < numArgs) {
        throw new Error(`Test "${this.message}" expects at least ` +
          `${numArgs} values, got ${this.values.length}`);
      }
    } else if (numArgs < 0) {
      if (this.values.length !== (-numArgs)) {
        throw new Error(`Test "${this.message}" expects exactly ` +
          `${-numArgs} values, got ${this.values.length}`);
      }
    }

    this.#complete();
  }

  async #complete(predeterminedResult:boolean|null = null) {

    if (predeterminedResult !== null) {
      if (this.options?.expectedToPass !== this.negative) {
        predeterminedResult = !predeterminedResult;
      }
      if (!!predeterminedResult == !!this.options?.expectedToPass) {
        this.done();
      } else {
        this.done(this.message);
      }
      return;
    }

    this.isComplete = true;
    const resolvedValues = await Promise.all(this.values);
    let result:boolean;

    if (this.operator === undefined) {
      throw new Error('Operator not identified for test');
    } else {
      result = await this.operator(resolvedValues);
    }

    if (this.negative) {
      result = !result;
    }
    if (this.done) {

      if (!result === this.options.expectedToPass) {
        this.done(this.message);
      } else {
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

  member(path:(string|number)[], defaultValue?:any) {
    this.#testIfComplete();
    let lastValueIdx = this.values.length - 1;
    if (lastValueIdx < 0) {
      throw new Error(`Test \"${this.message}\" member must follow a value`);
    }
    let lastValue = this.values[lastValueIdx];
    if (types.isPromise(lastValue)) {
      this.values[lastValueIdx] =
        lastValue.then(v => get(v, path, defaultValue));
    } else {
      this.values[lastValueIdx] = get(lastValue, path, defaultValue);
    }
    return this;
  }

  get not() {
    this.#testIfComplete();
    this.negative = !this.negative;
    return this;
  }

  value(v:any) {
    this.#testIfComplete();
    if (types.isPromise(v)) {
      this.values.push(v.then(v=>{v}));
    } else {
      this.values.push({v});
    }
    return this;
  }
  v(v:any) {
    return this.value(v);
  }
}

export interface TestBatteryOptions {
  /**
   * Set to `false` to force an exception to be thrown if any tests in
   * this battery use the deprecated simple-form test methods. This is mainly
   * used for automating the test battery itself. Default is `true`, which
   * allows the deprecated methods to be used.
   */
  allowDeprecated?:boolean;
  /**
   * What to return for tests with no values. For example, if a test is
   * `string`, which would return true if all values are strings, but there
   * are no values, logically this would be true, but it could indicate a
   * bug in the test. If this is set to `false`, the test will return `false`
   * if there are no values. Default is `true`
   */
  allowEmptyValueSet?:boolean;
  /**
   * What the result of all tests in this battery is expected to be. By default,
   * this is `true`, meaning all tests are expected to pass. If set to `false`,
   * all tests in this battery are expected to fail. This is useful for
   * testing error conditions.
   * @property {boolean} resultsExpected
   */
  expectedToPass?:boolean;
}

export class TestBattery {

  #name:string;
  #errors:Array<string>;
  #promises:Array<Promise<any>>;
  #testsCompleted:number;
  #refuseTests:boolean;
  #testsRefused:Array<string>;
  #expectedToPass:boolean;
  #allowDeprecated:boolean;
  #allowEmptyValueSet:boolean;

  constructor(name:string, options?:TestBatteryOptions) {
    const falseIf = (v: any):boolean => {
      return v === false ? false : true;
    }
    this.#name = name
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

  get name(): string { return this.#name; }
  private set name(name: string) { this.#name = name; }

  get errors(): Array<string> { return this.#errors; }
  private set errors(errors: Array<string>) { this.#errors = errors; }

  private get promises(): Array<Promise<any>> { return this.#promises; }
  private set promises(promises: Array<Promise<any>>) {
    this.#promises = promises;
  }

  get testsCompleted(): number { return this.#testsCompleted; }
  private set testsCompleted(testsCompleted: number) {
    this.#testsCompleted = testsCompleted;
  }

  get refuseTests(): boolean { return this.#refuseTests; }
  private set refuseTests(refuseTests: boolean) { this.#refuseTests = refuseTests; }

  get testsRefused(): Array<string> { return this.#testsRefused; }
  private set testsRefused(testsRefused: Array<string>) {
    this.#testsRefused = testsRefused;
  }

  get expectedToPass(): boolean { return this.#expectedToPass; }
  // no setter for expectedToPass, it's set in the constructor

  #allowDeprecatedMethods() {
    if (false === this.#allowDeprecated) {
      throw new Error('Deprecated TestBattery methods are disabled');
    }
  }

  test(should:string, ...params:any[]) {
    let message = format.apply(null, [should].concat(params || []));
    let testOptions:TestOptions = {
      dummy: false,
      allowEmptyValueSet: this.#allowEmptyValueSet
    };

    let testPromiseResolve:undefined|((value?:any)=>void);
    let testPromiseReject:undefined|((reason?:any)=>void);
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

    let result = new Test(
      (error:string) => {
        if (error) {
          this.errors.push(error);
        }
        testPromiseResolve && testPromiseResolve();
        this.testsCompleted++
      },
      message,
      testOptions
    );

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
  done(done?:(errors?:TestErrors)=>void):Promise<TestErrors|undefined> {
    const buildErrorsObject = ():TestErrors|undefined => {
      if (this.errors.length || this.testsRefused.length) {
        let result:Record<string,any> = {
          errors: this.errors
        };
        if (this.refuseTests) {
          result.testsRefused = [...this.testsRefused];
        }
        return result;
      }
    }
    return Promise.allSettled(this.promises)
      .then(() => {
        const errorsObject = buildErrorsObject();
        done && done(errorsObject);
        return errorsObject;
      })
      .catch((error:any) => {
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
  doTest(core:Function, result:any, should:string, params:any[]) {

    const errorString = () => {
      return format.apply(null, [should].concat(params || []));
    }
    const testCoreResult = (coreResult:any) => {
      if (types.isPromise(coreResult)) {
        this.promises.push(coreResult);
        coreResult.then(r => {
          testCoreResult(r);
        });
      } else {
        if ((!coreResult) === this.expectedToPass) {
          this.errors.push(errorString());
        }
        this.testsCompleted++;
      }
    }

    if (this.refuseTests) {
      this.testsRefused.push(errorString());
      return;
    }
    if (types.isPromise(result)) {
      this.promises.push(result);
      result.then(r => {
        this.doTest(core, r, should, params);
      });
    } else {
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
  fail(should:string, ...params:any[]) {
    this.doTest(function() {
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
  isArray(result:any, should:string, ...params:any[]) {
    this.#allowDeprecatedMethods();
    this.doTest(function(result:any) {
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
  isBoolean(result:any, should:string, ...params:any[]) {
    this.#allowDeprecatedMethods();
    this.doTest(function(result:any) {
      return ( typeof(result) === 'boolean' || types.isBooleanObject(result) );
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
   isDirectory(result:any, should:string, ...params:any[]) {
    this.#allowDeprecatedMethods();
    this.doTest(function(result:any) {
      if (Array.isArray(result)) {
        result = path.join.apply(null, result);
      }
      if (typeof(result) !== 'string') {
        return false;
      }
      return fs.promises.stat(result)
        .then((stat:fs.Stats) => {
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
  isEmptyArray(result:any, should:string, ...params:any[]) {
    this.#allowDeprecatedMethods();
    this.doTest(function(result:any) {
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
   isEmptyObject(result:any, should:string, ...params:any[]) {
    this.#allowDeprecatedMethods();
    this.doTest(function(result:any) {
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
  isEmptyString(result:any, should:string, ...params:any[]) {
    this.#allowDeprecatedMethods();
    this.doTest(function(result:any) {
      return ( typeof(result) === 'string'  || types.isStringObject(result) )
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
  isEqual(a:any, b:any, should:string, ...params:any[]) {
    this.#allowDeprecatedMethods();
    this.doTest(function(result:any) {
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
  isFalse(result:any, should:string, ...params:any[]) {
    this.#allowDeprecatedMethods();
    this.doTest(function(result:any) {
      return (result === false ||
        ( result && result.valueOf && result.valueOf(result) === false) );
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
  isFalsey(result:any, should:string, ...params:any[]) {
    this.#allowDeprecatedMethods();
    this.doTest(function(result:any) {
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
  isFile(result:any, should:string, ...params:any[]) {
    this.#allowDeprecatedMethods();
    this.doTest(function(result:any) {
      if (Array.isArray(result)) {
        result = path.join.apply(null, result);
      }
      if (typeof(result) !== 'string') {
        return false;
      }
      return fs.promises.stat(result)
        .then((stat:fs.Stats) => {
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
  isNil(result:any, should:string, ...params:any[]) {
    this.#allowDeprecatedMethods();
    this.doTest(function(result:any) {
      return ( result === null || result === undefined );
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
  isNull(result:any, should:string, ...params:any[]) {
    this.#allowDeprecatedMethods();
    this.doTest(function(result:any) {
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
   isStrictlyEqual(a:any, b:any, should:string, ...params:any[]) {
    this.#allowDeprecatedMethods();
    this.doTest(function(result:any) {
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
  isString(result:any, should:string, ...params:any[]) {
    this.#allowDeprecatedMethods();
    this.doTest(function(result:any) {
      return typeof(result) === 'string' || types.isStringObject(result);
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
  isTrue(result:any, should:string, ...params:any[]) {
    this.#allowDeprecatedMethods();
    this.doTest(function(result:any) {
      return (result === true ||
        ( result && result.valueOf && result.valueOf(result) === true) );
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
  isTruthy(result:any, should:string, ...params:any[]) {
    this.#allowDeprecatedMethods();
    this.doTest(function(result:any) {
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
  isUndefined(result:any, should:string, ...params:any[]) {
    this.#allowDeprecatedMethods();
    this.doTest(function(result:any) {
      return result === undefined;
    }, result, should, params);
  }
}

export default TestBattery;
