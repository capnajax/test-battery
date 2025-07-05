'use strict';

import { describe } from 'mocha';

import { TestBattery } from '../../src/test-battery.js';

describe('TestBattery basic usage', () => {
  it ('should run a simple test', (done) => {
    const battery = new TestBattery('simple test battery');
    battery.test('simpel test').value(true).is.true;
    battery.test('another simple test').value(1 + 1).value(2).equal;
    battery.test('string test')
      .value('hello world 1')
      .value('hello world 2')
      .value('hello world 3')
      .is.string;
    battery.done(done);
  })
});
