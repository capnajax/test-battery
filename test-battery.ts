'use strict';

import { format } from 'util';
import fs from 'fs';
import path from 'path';
import { types } from 'util';

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

interface EvaluationOperatorFunction { (a:any):boolean|Promise<boolean>; }
interface EvaluationOperatorProtoObject {
  fn:EvaluationOperatorFunction,
  minArgs?:number,
  name?:string,
  numArgs?:number
}
interface EvaluationOperator {
  fn:EvaluationOperatorFunction,
  minArgs?:number,
  name:string,
  numArgs?:number
}

const operators = (() => {
  const ops:Record<string, EvaluationOperatorFunction|EvaluationOperatorProtoObject> = {
    // operators can just be a function, or an object with `fn` and `minArgs` or
    // `numArgs`
    array: Array.isArray,
    boolean: a => {
      return !!( 
        typeof(a) === 'boolean' || 
        types.isBooleanObject(a)
      );
    },
    directory: a => {
      let dir = Array.isArray(a)
        ? path.join.apply(null, a)
        : a
      if (typeof(dir) !== 'string') {
        return false;
      }
      return fs.promises.stat(dir)
        .then(stat => {
          return stat.isDirectory();
        })
        .catch(() => {
          return false;
        });
    },
    empty: a => {
      let result = false;
      if (Array.isArray(a)) {
        result = (a.length === 0)
      } else if (typeof a === 'string') {
        result = (a === '');
      } else if (typeof a === 'object' && a !== null) {
        result = (Object.keys(a).length === 0)
      }
      // everything not an array, object, or string is false, including 
      // `null` and `undefined` stays false
      return result;
    },
    equal: { 
      fn: (a, ...b) => {
        let result = true;
        for (let i of b) {
          if (a != i) {
            result = false;
            break;
          }
        }
        return result;
      },
      minArgs: 2
    },
    false: a => { return (a === false ||
      ( a && a.valueOf && a.valueOf(a) === false) )
    },
    falsey: a => !a,
    fail: () => false,
    file: a => {
      let file = Array.isArray(a)
        ? path.join.apply(null, a)
        : a;
      if (typeof file !== 'string') {
        return false;
      }
      return fs.promises.stat(file)
        .then(stat => {
          return stat.isFile();
        })
        .catch(() => {
          return false;
        });
    },
    in: {
      fn: (a, ...b) => {
        let result = inList(a, b, false);
        return result;
      },
      minArgs: 1
    },
    inStrict: {
      fn: (a, ...b) => {
        let result = inList(a, b, true);
        return result;
      },
      minArgs: 1
    },
    nil: a => {
      return ( a === null || a === undefined )
    },
    null: a => a === null,
    strictlyEqual: {
      fn: (a, ...b) => {
        let result = true;
        for (let i of b) {
          if (a !== i) {
            result = false;
            break;
          }
        }
        return result;
      },
      minArgs: 2
    },
    isString: a => (typeof a === 'string' || types.isStringObject(a)),
    true: a => { return (a === true ||
      ( a && a.valueOf && a.valueOf(a) === true) )
    },
    truthy: a => !!a,
    undefined: a => a === undefined
  };
  for (let k of Object.keys(ops)) {
    let o = ops[k];
    if (typeof o === 'function') {
      o = { fn: o, numArgs: o.length };
      ops[k] = o;
    } else if (o.numArgs !== undefined && o.minArgs === undefined) {
      o.numArgs = o.fn.length;
    }
    o.name = k;
  }
  return ops as Record<string, EvaluationOperator>;
})();

class Test {
  
  done:Function;
  message:string;
  expectedOperands:number;
  values:Array<any>;
  negative:boolean;
  operator:EvaluationOperator|undefined;
  isComplete:boolean;
  options:Record<string, any>;

  constructor(done:Function, message:string, options:Record<string, any>) {
    this.done = done;
    this.message = message;
    // if defined, test will complete when this number reaches zero
    this.expectedOperands = 0;
    this.values = [];
    this.negative = false;
    this.operator;
    this.isComplete = false;
    this.options = options;

    for (let k of Object.keys(operators)) {
      Object.defineProperty(this, k, 
        (() => {
          return {
            get: () => {
              this.#testIfComplete();
              let op = operators[k];
              let tvl = this.values.length;
              this.operator = op;
              if (op?.numArgs !== undefined) {
                if (tvl === op.numArgs) {
                  return this.#complete();
                } else if (tvl < op.numArgs) {
                  this.expectedOperands = op.numArgs - tvl;
                  return this;
                } else {
                  throw new Error(`too many values for operator \"${k}\"`)
                }
              } else if (op?.minArgs !== undefined) {
                if (tvl >= op.minArgs) {
                  return this.#complete();
                } else {
                  this.expectedOperands = op.numArgs as unknown as number - tvl;
                  return this;
                }
              }
            }
          }
        })()
      );
    }
  }

  #complete() {
    this.isComplete = true;
    return Promise.all(this.values)
        .then(async resolvedValues => {
          let result = await (this.operator as unknown as EvaluationOperator)
            // @ts-ignore 
            .fn.apply(this, resolvedValues.map(v=>v.v));
          if (this.negative) {
            result = !result;
          }
          if (this.done) {
            if (!result) {
              this.done(this.message);
            } else {
              this.done();
            }
          }
        });
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
    this.negative = true;
    return this;
  }

  value(v:any) {
    this.#testIfComplete();
    if (types.isPromise(v)) {
      this.values.push(v.then(v=>{v}));
    } else {
      this.values.push({v});
    }
    if (this.expectedOperands !== null && this.expectedOperands !== undefined) {
      this.expectedOperands--;
      if (this.expectedOperands === 0) {
        this.#complete();
      }
    }
    return this;
  }
  v(v:any) {
    return this.value(v);
  }
}

class TestBattery {

  name:string;
  errors:Array<string>;
  promises:Array<Promise<any>>;
  testsCompleted:number;
  refuseTests:boolean;
  testsRefused:Array<string>;

  constructor(name:string) {
    this.name = name
    this.errors = [];
    this.promises = [];
    this.testsCompleted = 0;
    this.refuseTests = false;
    this.testsRefused = [];
  }

  test(should:string, ...params:any[]) {
    let message = format.apply(null, [should].concat(params || []));
    let testOptions = { dummy: false };

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
   * Reports the result of the test battery be calling the provided `done`
   * function with the results. If there are errors or tests have been refused, 
   * it'll call the `done` function with an object that lists the errors and
   * refused tests. If there are no errors or refused tests, it calls done
   * withou any parameters;
   * @param {*} done 
   */
  done(done?:Function) {
    return Promise.allSettled(this.promises)
      .then(() => {
        if (this.errors.length || this.testsRefused.length) {
          let result:Record<string,any> = {
            errors: this.errors
          };
          this.refuseTests && (result.testsRefused = [...this.testsRefused]);
          done && done(result);
          return result;
        } else {
          done && done();
          return
        }
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
   * @param { tring} should the error message to add if there's a failure. 
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
        if (!coreResult) {
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
  fail(result:any, should:string, ...params:any[]) {
    if (!should && typeof result === 'string') {
      should = result;
      result = undefined;
    }
    this.doTest(function() {
      return false;
    }, result, should, params);
  }

  /**
   * @method isArray
   * Tests if `result` is an array.
   * @param {*} result the result to test. If `result` is a promise, it'll test
   *  the value that the promise resolves with.
   * @param {string} should an error message. Can include parameterizations to
   *  be filled in with `format`.
   * @param  {...any} [params] parameters for the error message
   */
  isArray(result:any, should:string, ...params:any[]) {
    this.doTest(function(result:any) {
      return Array.isArray(result);
    }, result, should, params);
  }

  /**
   * @method isBoolean
   * Tests if `result` is an boolean. Accepts both primitive booleans and
   * Boolean objects.
   * @param {*} result the result to test. If `result` is a promise, it'll test
   *  the value that the promise resolves with.
   * @param {string} should an error message. Can include parameterizations to
   *  be filled in with `format`.
   * @param  {...any} [params] parameters for the error message
   */
  isBoolean(result:any, should:string, ...params:any[]) {
    this.doTest(function(result:any) {
      return ( typeof(result) === 'boolean' || types.isBooleanObject(result) );
    }, result, should, params);
  }

  /**
   * @method isDirectory
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
    this.doTest(function(result:any) {
      if (Array.isArray(result)) {
        result = path.join.apply(null, result);
      }
      if (typeof(result) !== 'string') {
        return false;
      }
      return fs.promises.stat(result)
        .then(stat => {
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
    this.doTest(function(result:any) {
      return Array.isArray(result) && result.length === 0;
    }, result, should, params);
  }

  /**
   * @method isEmptyObject
   * Tests if `result` is an empty object that is not an array.
   * @param {*} result the result to test. If `result` is a promise, it'll test
   *  the value that the promise resolves with.
   * @param {string} should an error message. Can include parameterizations to
   *  be filled in with `format`.
   * @param  {...any} [params] parameters for the error message
   */
   isEmptyObject(result:any, should:string, ...params:any[]) {
    this.doTest(function(result:any) {
      return (typeof result === 'object') && (!Array.isArray(result)) &&
        ((Object.keys(result)).length === 0);
    }, result, should, params);
  }

  /**
   * @method isEmptyString
   * Tests if `result` is an empty string. Accepts both string primitives and 
   * String objects.
   * @param {*} result the result to test. If `result` is a promise, it'll test
   *  the value that the promise resolves with.
   * @param {string} should an error message. Can include parameterizations to
   *  be filled in with `format`.
   * @param  {...any} [params] parameters for the error message
   */
  isEmptyString(result:any, should:string, ...params:any[]) {
    this.doTest(function(result:any) {
      return ( typeof(result) === 'string'  || types.isStringObject(result) )
        && result.length === 0;
    }, result, should, params);
  }

  /**
   * @method isEqual
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
    this.doTest(function(result:any) {
      return result[0] == result[1];
    }, Promise.all([a, b]), should, params);
  }

  /**
   * @method isFalse
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
    this.doTest(function(result:any) {
      return (result === false ||
        ( result && result.valueOf && result.valueOf(result) === false) );
    }, result, should, params);
  }

  /**
   * @method isFalsey
   * Tests if `result` is falsey, that is, any value that would be `true` if you
   * added a bang to it. (e.g. !null === true)
   * @param {*} result the result to test. If `result` is a promise, it'll test
   *  the value that the promise resolves with.
   * @param {string} should an error message. Can include parameterizations to
   *  be filled in with `format`.
   * @param  {...any} [params] parameters for the error message
   */
  isFalsey(result:any, should:string, ...params:any[]) {
    this.doTest(function(result:any) {
      return (!result);
    }, result, should, params);
  }

  /**
   * @method isFile
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
    this.doTest(function(result:any) {
      if (Array.isArray(result)) {
        result = path.join.apply(null, result);
      }
      if (typeof(result) !== 'string') {
        return false;
      }
      return fs.promises.stat(result)
        .then(stat => {
          return stat.isFile();
        }) 
        .catch(() => {
          return false;
        });
    }, result, should, params);
  }

  /**
   * @method isNil
   * Tests if `result` is `null` or `undefined`.
   * @param {*} result the result to test. If `result` is a promise, it'll test
   *  the value that the promise resolves with.
   * @param {string} should an error message. Can include parameterizations to
   *  be filled in with `format`.
   * @param  {...any} [params] parameters for the error message
   */
  isNil(result:any, should:string, ...params:any[]) {
    this.doTest(function(result:any) {
      return ( result === null || result === undefined );
    }, result, should, params);
  }

  /**
   * @method isNull
   * Tests if `result` is `null`.
   * @param {*} result the result to test. If `result` is a promise, it'll test
   *  the value that the promise resolves with.
   * @param {string} should an error message. Can include parameterizations to
   *  be filled in with `format`.
   * @param  {...any} [params] parameters for the error message
   */
  isNull(result:any, should:string, ...params:any[]) {
    this.doTest(function(result:any) {
      return result === null;
    }, result, should, params);
  }

  /**
   * @method isStrictlyEqual
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
    this.doTest(function(result:any) {
      return result[0] === result[1];
    }, Promise.all([a, b]), should, params);
  }

  /**
   * @method isString
   * Tests if `result` is a string. Accepts both primitive strings and String
   * objects.
   * @param {*} result the result to test. If `result` is a promise, it'll test
   *  the value that the promise resolves with.
   * @param {string} should an error message. Can include parameterizations to
   *  be filled in with `format`.
   * @param  {...any} [params] parameters for the error message
   */
  isString(result:any, should:string, ...params:any[]) {
    this.doTest(function(result:any) {
      return typeof(result) === 'string' || types.isStringObject(result);
    }, result, should, params);
  }

  /**
   * @method isTrue
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
    this.doTest(function(result:any) {
      return (result === true ||
        ( result && result.valueOf && result.valueOf(result) === true) );
    }, result, should, params);
  }

  /**
   * @method isTruthy
   * Tests if `result` is truthy, that is, any value that would be `true` if you
   * added a double bang to it. (e.g. !!'hi' === true)
   * @param {*} result the result to test. If `result` is a promise, it'll test
   *  the value that the promise resolves with.
   * @param {string} should an error message. Can include parameterizations to
   *  be filled in with `format`.
   * @param  {...any} [params] parameters for the error message
   */
  isTruthy(result:any, should:string, ...params:any[]) {
    this.doTest(function(result:any) {
      return (!!result);
    }, result, should, params);
  }

  /**
   * @method isUndefined
   * Tests if `result` is an `undefined`.
   * @param {*} result the result to test. If `result` is a promise, it'll test
   *  the value that the promise resolves with.
   * @param {string} should an error message. Can include parameterizations to
   *  be filled in with `format`.
   * @param  {...any} [params] parameters for the error message
   */
  isUndefined(result:any, should:string, ...params:any[]) {
    this.doTest(function(result:any) {
      return result === undefined;
    }, result, should, params);
  }
}

export default TestBattery;
