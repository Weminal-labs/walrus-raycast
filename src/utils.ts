import { Buffer } from 'buffer';

function u256ToBlobId(u256Value: bigint): string {
    // Step 1: Convert the u256 to little-endian hexadecimal
    const hexValue = u256Value.toString(16).padStart(64, '0').match(/.{2}/g)?.reverse().join('') || '';

    // Step 2: Convert the hex to bytes
    const hexBytes = Buffer.from(hexValue, 'hex');

    // Step 3: Convert the bytes to URL-safe base64 with no padding
    const blobId = Buffer.from(hexBytes)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    return blobId;
}

export { u256ToBlobId };