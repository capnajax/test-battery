# test-battery
Test engine for JavaScript that plays nicely with promises, intended for use with mochajs but plays nicely with any test framework. This is intended to replace `expect.js`, etc with a new concept.

Key features:

- Plays nicely with promises. If a value is a promise, it'll can await the resolution of the promise transparently.
- Can await multiple promises at once, while still respecting a dependency chain. If one test depends on the results of previous tests, it can be forced to await the resolution of previous tests before continuing.
- Does not throw exceptions on the first error. Instead, it captures as many errors as it can in a single run.

This is very must a start right now, as I expect to add a lot of tests to this in the near future.

## Installation

```sh
npm install --save-dev test-battery
```

```javascript
import TestBattery from test-battery
```

## Example battery

```javascript
  async function runTestBattery() {
    let test = new TestBattery();
    
    test.isArray([], 'empty array');
    test.isArray([1,2,3], 'integer array');

    // will quietly refuse further tests if any of the previous tests resulted
    // in errors. MUST be awaited.
    await test.endIfErrors();

    // if a test value is a promise, it'll test the value the promise resolves
    // with.
    test.isBoolean(Promise.resolve(false), 'boolean false');

    // error strings can be parameterized.
    test.isEmptyString('', 'null test number %s', 1);

    test.done(result => {
      // result is undefined if success, or an object that contains errors
      // and refusedTests if failed
      console.log(result);
    });
  }
```

Using with `mocha`:

```javascript
describe('File tests', function() {

  it('Files exist', function(done) {
    const filenames = [
      'foo/bar.yaml',
      'foo/bar.js',
      'foo/bar.csv',
      'foo/bar.txt'
    ];

    let test = new TestBattery();

    // test each of the files
    for (let filename of filenames) {
      // the error message is parameterized
      test.isFile([process.cwd(), '..', filename],
        'Expects "%s" to be a file', filename);
    }

    // note we pass mocha's `done` to `tests.done` to report all errors in
    // this test.
    test.done(done);
  });

});

```
