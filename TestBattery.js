'use strict';

import format from 'format';
import { types } from 'util';
import { isPromise } from 'util/types';

class TestBattery {

  constructor() {
    this.errors = [];
    this.promises = [];
    this.testsCompleted = 0;
    this.refuseTests = false;
    this.testsRefused = [];
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
    return Promise.allSettled(_.clone(this.promises))
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
  done(done) {
    Promise.allSettled(this.promises)
    .then(() => {
      if (this.errors.length || this.testsRefused.length) {
        let result = {
          errors: this.errors
        };
        this.refuseTests && (result.testsRefused = this.testsRefused);
        done(result);
      } else {
        done();
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
   * @param {String} error the error message to add if there's a failure. 
   * @param {...any} params parameters for the error message
   */
  doTest(core, result, error, params) {
    const errorString = () => {
      return format.apply(null, [error].concat(params || []));
    }
    if (this.refuseTests) {
      this.testsRefused.push(errorString());
      return;
    }
    if (types.isPromise(result)) {
      this.promises.push(result);
      result.then(r => {
        this.doTest(core, r, error, params);
      });
    } else {
      if (!core(result)) {
        this.errors.push(errorString());
      }
      this.testsCompleted++;
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
   * @method isArray
   * Tests if `result` is an array.
   * @param {*} result the result to test. If `result` is a promise, it'll test
   *  the value that the promise resolves with.
   * @param {string} error an error message. Can include parameterizations to be
   *  filled in with `format`.
   * @param  {...any} [params] parameters for the error message
   */
  isArray(result, error, ...params) {
    this.doTest(function(result) {
      return Array.isArray(result);
    }, result, error, params);
  }

  /**
   * @method isBoolean
   * Tests if `result` is an boolean. Accepts both primitive booleans and
   * Boolean objects.
   * @param {*} result the result to test. If `result` is a promise, it'll test
   *  the value that the promise resolves with.
   * @param {string} error an error message. Can include parameterizations to be
   *  filled in with `format`.
   * @param  {...any} [params] parameters for the error message
   */
  isBoolean(result, error, ...params) {
    this.doTest(function(result) {
      return ( typeof(result) === 'boolean' || types.isBooleanObject(result) );
    }, result, error, params);
  }

  /**
   * @method isEmptyArray
   * Tests if `result` is an empty array.
   * @param {*} result the result to test. If `result` is a promise, it'll test
   *  the value that the promise resolves with.
   * @param {string} error an error message. Can include parameterizations to be
   *  filled in with `format`.
   * @param  {...any} [params] parameters for the error message
   */
  isEmptyArray(result, error, ...params) {
    this.doTest(function(result) {
      return Array.isArray(result) && result.length === 0;
    }, result, error, params);
  }

  /**
   * @method isEmptyString
   * Tests if `result` is an empty string. Accepts both string primitives and 
   * String objects.
   * @param {*} result the result to test. If `result` is a promise, it'll test
   *  the value that the promise resolves with.
   * @param {string} error an error message. Can include parameterizations to be
   *  filled in with `format`.
   * @param  {...any} [params] parameters for the error message
   */
  isEmptyString(result, error, ...params) {
    this.doTest(function(result) {
      return ( typeof(result) === 'string'  || types.isStringObject(result) )
        && result.length === 0;
    }, result, error, params);
  }

  /**
   * @method isFalse
   * Tests if `result` is equal to false. Accepts both boolean primitives and
   * Boolean objects. Note this must equal `false` or `new Boolean(false)`, not
   * just evaluate to false.
   * @param {*} result the result to test. If `result` is a promise, it'll test
   *  the value that the promise resolves with.
   * @param {string} error an error message. Can include parameterizations to be
   *  filled in with `format`.
   * @param  {...any} [params] parameters for the error message
   */
  isFalse(result, error, ...params) {
    this.doTest(function(result) {
      return (result === false ||
        ( result && result.valueOf && result.valueOf(result) === false) );
    }, result, error, params);
  }

  /**
   * @method isFalsey
   * Tests if `result` is falsey, that is, any value that would be `true` if you
   * added a bang to it. (e.g. !null === true)
   * @param {*} result the result to test. If `result` is a promise, it'll test
   *  the value that the promise resolves with.
   * @param {string} error an error message. Can include parameterizations to be
   *  filled in with `format`.
   * @param  {...any} [params] parameters for the error message
   */
  isFalsey(result, error, ...params) {
    this.doTest(function(result) {
      return (!result);
    }, result, error, params);
  }

  /**
   * @method isNil
   * Tests if `result` is `null` or `undefined`.
   * @param {*} result the result to test. If `result` is a promise, it'll test
   *  the value that the promise resolves with.
   * @param {string} error an error message. Can include parameterizations to be
   *  filled in with `format`.
   * @param  {...any} [params] parameters for the error message
   */
  isNil(result, error, ...params) {
    this.doTest(function(result) {
      return ( result === null || result === undefined );
    }, result, error, params);
  }

  /**
   * @method isNull
   * Tests if `result` is `null`.
   * @param {*} result the result to test. If `result` is a promise, it'll test
   *  the value that the promise resolves with.
   * @param {string} error an error message. Can include parameterizations to be
   *  filled in with `format`.
   * @param  {...any} [params] parameters for the error message
   */
  isNull(result, error, ...params) {
    this.doTest(function(result) {
      return result === null;
    }, result, error, params);
  }
  /**
   * @method isString
   * Tests if `result` is a string. Accepts both primitive strings and String
   * objects.
   * @param {*} result the result to test. If `result` is a promise, it'll test
   *  the value that the promise resolves with.
   * @param {string} error an error message. Can include parameterizations to be
   *  filled in with `format`.
   * @param  {...any} [params] parameters for the error message
   */
   isString(result, error, ...params) {
    this.doTest(function(result) {
      return typeof(result) === 'string' || types.isStringObject(result);
    }, result, error, params);
  }
   /**
   * @method isTrue
   * Tests if `result` is equal to true. Accepts both boolean primitives and
   * Boolean objects. Note this must equal `true` or `new Boolean(true)`, not
   * just evaluate to true.
   * @param {*} result the result to test. If `result` is a promise, it'll test
   *  the value that the promise resolves with.
   * @param {string} error an error message. Can include parameterizations to be
   *  filled in with `format`.
   * @param  {...any} [params] parameters for the error message
   */
    isTrue(result, error, ...params) {
    this.doTest(function(result) {
      return (result === true ||
        ( result && result.valueOf && result.valueOf(result) === true) );
    }, result, error, params);
  }
  /**
   * @method isTruthy
   * Tests if `result` is truthy, that is, any value that would be `true` if you
   * added a double bang to it. (e.g. !!'hi' === true)
   * @param {*} result the result to test. If `result` is a promise, it'll test
   *  the value that the promise resolves with.
   * @param {string} error an error message. Can include parameterizations to be
   *  filled in with `format`.
   * @param  {...any} [params] parameters for the error message
   */
   isTruthy(result, error, ...params) {
    this.doTest(function(result) {
      return (!!result);
    }, result, error, params);
  }
  /**
   * @method isUndefined
   * Tests if `result` is an `undefined`.
   * @param {*} result the result to test. If `result` is a promise, it'll test
   *  the value that the promise resolves with.
   * @param {string} error an error message. Can include parameterizations to be
   *  filled in with `format`.
   * @param  {...any} [params] parameters for the error message
   */
   isUndefined(result, error, ...params) {
    this.doTest(function(result) {
      return result === undefined;
    }, result, error, params);
  }
}

export default TestBattery;
