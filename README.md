# test-battery
Test engine for JavaScript

This is very alpha right now, as I expect to add a lot of tests to this in the
near future.

This test engine is intended to capture multiple error messages, and only stop when requested, or the battery is complete.

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


