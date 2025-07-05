'use strict';

import suite from 'node:test';
import { TestBattery } from '../../src/test-battery.js';

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

  TestBattery.test('test using simple form (deprecated)', (battery) => {
    battery.isTrue(true, 'simple test');
    battery.isEqual(1 + 1, 2, 'another simple test');
    battery.isString('hello world 1', 'string test 1');
    battery.isString('hello world 2', 'string test 2');
    battery.isString('hello world 3', 'string test 3');
  });
});

suite('TestBattery with parallel promises', () => {

  const resolveIn20ms = (v:unknown) => {
    return new Promise(resolve => setTimeout(() => resolve(v), 20));
  };
  const rejectIn20ms = (v:unknown) => {
    return new Promise(resolve => setTimeout(() => resolve(v), 20));
  };

  TestBattery.test(
    'should run tests with parallel promises',
    { concurrency: true },
    async battery => {
      battery.test('resolve 1 in 20ms')
        .value(resolveIn20ms(1))
        .value(1).equal;
      battery.test('reject 2 in 20ms -- error expected')   // <-- This will fail
        .value(rejectIn20ms(2))
        .value(1).equal;
      await battery.endIfErrors();
      battery.test('resolve 3 in 20ms -- refusal expected')  // <-- This will be refused
        .value((() => {

          // TODO this is a weakness -- the test will not run, but the
          // calculation still gets executed.

          console.log('This test should not run, this message should not be logged');
          return resolveIn20ms(3);
        })())
        .value(3).equal;
    }
  );

});
