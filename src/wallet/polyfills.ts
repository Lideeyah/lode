/**
 * Must be imported before anything touches web3.js.
 *
 * web3.js assumes a browser/node environment: it calls crypto.getRandomValues
 * when generating keys and blockhashes, and it passes Buffers around
 * internally. React Native provides neither.
 */
import 'react-native-get-random-values';
import { Buffer } from 'buffer';

if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}
