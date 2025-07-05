# test-battery

Test engine for JavaScript that plays nicely with promises, intended for use
with mochajs and the NodeJS test runner but should play nicely with any test
framework.

## Why the test battery

This is intended to replace `expect.js`, etc with a new concept.

Key features:

- Plays nicely with promises. If a value is a promise, it'll can await the
  resolution of the promise transparently.
- Can `await` multiple promises at once, while still respecting a dependency
  chain. If one test depends on the results of previous tests, it can be
  forced to `await` the resolution of previous tests before continuing.
- Does not throw exceptions on the first error. Instead, it captures as many
  errors as it can in a single run until all tests are attempted or a test
  cannot continue due to errors.

## Installation

```sh
npm install --save-dev test-battery
```

```javascript
import TestBattery from `test-battery`;
```

## Example batteries

Examples are provided for both [Mocha](https://mochajs.org/) and the
[Node JS native test runner](https://nodejs.org/api/test.html) in the
[examples](examples) folder.

### NodeJS Test Runner (preferred)

Use the static `TestBattery.test` method to set up the test (which calls the
NodeJS test runner's `it` in the background) and reads the results of the tests.

```TypeScript
suite('TestBattery basic usage', () => {
  TestBattery.test('should run a simple test', (battery) => {
    battery.test('simple test').value(true).is.true;
    battery.test('another simple test').value(1 + 1).value(2).equal;
    battery.test('string test')
      .value('hello world 1')
      .value('hello world 2')
      .value('hello world 3')
      .is.string;
  });
});
```

### Mocha

Create the test using the constructor and call the `done` callback of the `it`
with the `battery.done` method.

```TypeScript
describe('TestBattery basic usage', () => {
  it ('should run a simple test', (done) => {
    const battery = new TestBattery('simple test battery');
    battery.test('simple test').value(true).is.true;
    battery.test('another simple test').value(1 + 1).value(2).equal;
    battery.test('string test')
      .value('hello world 1')
      .value('hello world 2')
      .value('hello world 3')
      .is.string;
    battery.done(done);
  })
});
```

## Constructed Form

The constructed form has four distinct clauses:

1) Creating the test `battery.test('description')`
1) Adding values `.value(v1).value(v2)`
1) Verb (optional, default `is`) `.is.not`
1) Test `.equal`

```javascript
battery.test('values should not equal`)
  .value(v1)
  .value(v2)
  .is.not.equal;
```

### Creating the test

```javascript
  let test = battery.test('The "%s" file should exist', filename);
```

This creates a `Test` object that sets up a single test. The first parameter is a description of the test that will appear in the error message if the test either fails or is refused. This message can be a .

In the examples below, each clause is broken out, but they are chainable.

### Adding the values

```javascript
  test = test.value(filename)l
```

Call `.value` once for every value you need to add. This is an infix notation.

This can accept Promises; it'll test on the value the Promise resolves to.

### Verb

```javascript
  test.is;
```

The verb `.is` or `.are` is assumed, if not provided. Also acceptable is `.is.not` which would, obviously test for the negative.

### The test

```javascript
  test.file;
```

This is what to test for. This completes the test.

## Simple Form

This format is, of course, simpler, but it's also more limited in capability.

```javascript
battery.isFile(filename, 'The "%s" file should exist', filename);
```

The first parameter is the test value (two parameters for `isEqual`), and the remaining parameters are for the description. Again, this nessge can be parameterized for [`format`](https://www.npmjs.com/package/format).

## Available Tests

The following test assertions are available in `test-battery`:

- `.array` - all values are arrays
- `.boolean` - all values are `boolean`
- `.directory` - all values are paths of directories
- `.empty` - all values are empty objects, array, or string. Everything not an array, string, or object is `false`, including `null` and `undefined`.
- `.equal` - all values are equal by _loose_ equality, that is, type coercion is permitted. Use `strictlyEqual` to test for _strict_ equality.
- `.false` - all values are strictly `false` (i.e. `!!value == false` )
- `.falsey` - all values are _falsey_
- `.fail` - fails regardless of values provided
- `.file` - all values are paths of regular files
- `.in` - the first value is an array, and all the remaining values are _loosely_ equal to members of that array
- `.inStrict` - this first value is an array, and all the remaining values are _strictly_ equal to members of that array
- `.nil` - all values are either `null` or `undefined`
- `.null` - all values are `null`
- `.strictlyEqual` - all values are _strictly_ equal (i.e. equal by `===`)
- `.string` - all values are strings
- `.true` - all values are strictly `true`
- `.truthy` - all values are _truthy_ (i.e. `!!value == true`)
- `.undefined` - all values are `undefined`

You can use these as the final clause in a constructed test, for example:

```javascript
battery.test('should be a string')
  .value('hello')
  .is.string;

battery.test('should not be null')
  .value(someValue)
  .is.not.null;

battery.test('should match regex')
  .value('foobar')
  .match(/^foo/);
```

For the simple form, use the corresponding method:

```javascript
battery.isString('hello', 'should be a string');
battery.isFile('path/to/file', 'should be a file');
battery.isEqual(1, 1, 'should be equal');
```

## Changes for Version 3

- Support for object forms of `Number`, `Boolean`, etc is removed. They are no longer treated as equivalent to their primitive forms `number`, `boolean`, etc.
- Some tests that only permitted one value now permit multiple values, and the tests return true if the test is true for `all` the values.
- The test assertion always ends a test. In Version 2, the form:

    ```typescript
    test('xxx').value(1).equal.value(2)
    ```

    was acceptable. This is no longer supported. All the values must go before the test.

    ```typescript
    test('yyy').value(1).value(2).equal
    ```

- Simple form and Constructed form are no longer maintained at parity. New tests will only be implemented in constructed form.
- (3.1+) Explicit support for the NodeJS test runner
