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

async function getFileType(buffer: ArrayBuffer): Promise<string> {
    const uint8Array = new Uint8Array(buffer);
    const signature = uint8Array.slice(0, 8);
    const hex = Array.from(signature, byte => byte.toString(16).padStart(2, '0')).join('');

    switch (hex) {
        case '89504e470d0a1a0a':
            return 'PNG';
        case 'ffd8ffe000104a46':
        case 'ffd8ffe1':
            return 'JPEG';
        case '47494638':
            return 'GIF';
        case '25504446':
            return 'PDF';
        // Add more file signatures as needed
        default:
            return 'Unknown';
    }
}

export { u256ToBlobId, getFileType };