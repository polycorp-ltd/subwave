// LISTENER_IGNORE_UA (config.icecast.ignoreUserAgent): an appliance's own
// stream monitor is not an audience, so it must not hold the DJ awake under
// llm.pauseWhenEmpty. Run: `npm test -- listener-ignore-ua`.

import test from 'node:test';
import assert from 'node:assert/strict';
import { dedupeListeners, withoutIgnored, type ListenerConnection } from '../src/broadcast/listeners.js';

const conn = (userAgent: string): ListenerConnection => ({ ip: '172.18.0.9', mount: '/stream.mp3', userAgent, connectedSeconds: 100 });

test('matching sockets drop out of the count', () => {
  const conns = [conn('dubplata-systema/1'), conn('Mozilla/5.0 (X11; Linux x86_64) Chrome/140')];
  assert.equal(dedupeListeners(withoutIgnored(conns, 'dubplata-systema')), 1);
  assert.equal(dedupeListeners(withoutIgnored([conn('Dubplata-Systema')], 'dubplata-systema')), 0);
});

test('empty or invalid pattern counts everyone', () => {
  const conns = [conn('dubplata-systema'), conn('VLC/3.0')];
  assert.equal(withoutIgnored(conns, '').length, 2);
  assert.equal(withoutIgnored(conns, '(').length, 2);
});
