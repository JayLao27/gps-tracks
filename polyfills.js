// Basic Node polyfills for React Native bundling
import { Buffer } from 'buffer';
import process from 'process';
import util from 'util';

if (typeof global !== 'undefined') {
    if (!global.Buffer) global.Buffer = Buffer;
    if (!global.process) global.process = process;
    if (!global.util) global.util = util;
}
