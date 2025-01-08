import { brotliDecompressSync } from "node:zlib";
import { WS_HEADER_OFFSET, WS_PACKAGE_HEADER_TOTAL_LENGTH, WS_VERSION_OFFSET, WS_HEADER_DEFAULT_VERSION, WS_OPERATION_OFFSET, WS_HEADER_DEFAULT_OPERATION, WS_SEQUENCE_OFFSET, WS_HEADER_DEFAULT_SEQUENCE, WS_OP_HEARTBEAT_REPLY, WS_PACKAGE_OFFSET, WS_BODY_PROTOCOL_VERSION_BROTLI, WS_BODY_PROTOCOL_VERSION_NORMAL, WS_OP_CONNECT_SUCCESS, WS_OP_MESSAGE } from "./constant";

// Header
// - Packet Length (4 bytes)
// - Header Length (2 bytes)
// - Protocol Version (2 bytes)
// - Operation (4 bytes)
// - Sequence Id (4 bytes)

const createWsBinaryHeader = function () {
    return [{
        name: 'Header Length',
        key: 'headerLen',
        bytes: 2,
        offset: WS_HEADER_OFFSET,
        value: WS_PACKAGE_HEADER_TOTAL_LENGTH
    },
    {
        name: 'Protocol Version',
        key: 'ver',
        bytes: 2,
        offset: WS_VERSION_OFFSET,
        value: WS_HEADER_DEFAULT_VERSION
    },
    {
        name: 'Operation',
        key: 'op',
        bytes: 4,
        offset: WS_OPERATION_OFFSET,
        value: WS_HEADER_DEFAULT_OPERATION
    },
    {
        name: 'Sequence Id',
        key: 'seq',
        bytes: 4,
        offset: WS_SEQUENCE_OFFSET,
        value: WS_HEADER_DEFAULT_SEQUENCE
    }];
}

const buffer = new Uint8Array([]).buffer;
const textDecoder = new TextDecoder();

const convertToObject = function (buffer: ArrayBufferLike) {
    const dataView = new DataView(buffer);
    const result = {
        body: [],
        packetLen: 0,
        headerLen: 0,
        ver: 0,
        op: 0,
        seq: 0,
    };

    // Read packet length and header information
    result.packetLen = dataView.getInt32(WS_PACKAGE_OFFSET);

    const wsBinaryHeaderList = createWsBinaryHeader();

    // Process binary headers
    wsBinaryHeaderList.forEach(header => {
        if (header.bytes === 4) {
            result[header.key] = dataView.getInt32(header.offset);
        } else if (header.bytes === 2) {
            result[header.key] = dataView.getInt16(header.offset);
        }
    });

    // Handle partial packets
    if (result.packetLen < buffer.byteLength) {
        return convertToObject(buffer.slice(0, result.packetLen));
    }

    // Handle heartbeat replies
    if (result.op && result.op === WS_OP_HEARTBEAT_REPLY) {
        result.body = {
            count: dataView.getInt32(WS_PACKAGE_HEADER_TOTAL_LENGTH)
        };
        return result;
    }

    // Process messages
    if (result.op && (result.op === WS_OP_MESSAGE || result.op === WS_OP_CONNECT_SUCCESS)) {
        let offset = WS_PACKAGE_OFFSET;

        while (offset < buffer.byteLength) {
            const packageLength = dataView.getInt32(offset);
            const headerLength = dataView.getInt16(offset + WS_HEADER_OFFSET);

            try {
                let decodedBody = null;

                if (result.ver === WS_BODY_PROTOCOL_VERSION_NORMAL) {
                    const rawData = buffer.slice(offset + headerLength, offset + packageLength);
                    const decoded = textDecoder.decode(rawData);
                    decodedBody = decoded.length > 0 ? JSON.parse(decoded) : null;
                }
                else if (result.ver === WS_BODY_PROTOCOL_VERSION_BROTLI) {
                    const compressedData = buffer.slice(offset + headerLength, offset + packageLength);
                    const decompressed = brotliDecompressSync(new Uint8Array(compressedData));
                    decodedBody = convertToObject(decompressed.buffer).body;
                }

                if (decodedBody) {
                    result.body.push(decodedBody);
                }
            } catch (error) {
                console.error(`decode body error: ${new Uint8Array(buffer)}, ${result}, ${error}`);
            }

            offset += packageLength;
        }
    }

    return result;
};

const convertToArrayBuffer = function (data: string, operation: number) {
    const textEncoder = new TextEncoder();
    const headerBuffer = new ArrayBuffer(WS_PACKAGE_HEADER_TOTAL_LENGTH);
    const dataView = new DataView(headerBuffer, WS_PACKAGE_OFFSET);
    const encodedData = textEncoder.encode(data);

    // Set total packet length (header + data)
    dataView.setInt32(
        WS_PACKAGE_OFFSET,
        WS_PACKAGE_HEADER_TOTAL_LENGTH + encodedData.byteLength
    );

    const wsBinaryHeaderList = createWsBinaryHeader();

    // Set operation in header list
    wsBinaryHeaderList[2].value = operation;

    // Write header values
    wsBinaryHeaderList.forEach(header => {
        if (header.bytes === 4) {
            dataView.setInt32(header.offset, header.value);
        } else if (header.bytes === 2) {
            dataView.setInt16(header.offset, header.value);
        }
    });

    // Combine header and data
    const finalBuffer = new Uint8Array(headerBuffer.byteLength + encodedData.byteLength);
    finalBuffer.set(new Uint8Array(headerBuffer), 0);
    finalBuffer.set(encodedData, headerBuffer.byteLength);

    return finalBuffer.buffer;
};

const result = convertToObject(buffer);
console.log(JSON.stringify(result, null, 2));