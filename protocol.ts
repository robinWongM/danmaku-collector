// Header
// - Packet Length (4 bytes)
// - Header Length (2 bytes)
// - Protocol Version (2 bytes)
// - Operation (4 bytes)
// - Sequence Id (4 bytes)
import { brotliDecompress as rawBrotliDecompress } from "node:zlib";
import { promisify } from "node:util";

import {
  WS_BODY_PROTOCOL_VERSION_BROTLI,
  WS_BODY_PROTOCOL_VERSION_NORMAL,
  WS_HEADER_DEFAULT_OPERATION,
  WS_HEADER_DEFAULT_SEQUENCE,
  WS_HEADER_DEFAULT_VERSION,
  WS_HEADER_OFFSET,
  WS_OPERATION_OFFSET,
  WS_PACKAGE_HEADER_TOTAL_LENGTH,
  WS_SEQUENCE_OFFSET,
  WS_VERSION_OFFSET,
} from "./constant";

const brotliDecompress = promisify(rawBrotliDecompress);

interface BiliHeader {
  packetLength: number;
  headerLength: number;
  protocolVersion: number;
  operation: number;
  sequenceId: number;
}

export const createPacket = (header: Partial<BiliHeader>, body: string) => {
  const encoder = new TextEncoder();
  const bodyBuffer = encoder.encode(body);

  const headerBuffer = new DataView(
    new ArrayBuffer(WS_PACKAGE_HEADER_TOTAL_LENGTH)
  );

  headerBuffer.setInt32(
    0,
    WS_PACKAGE_HEADER_TOTAL_LENGTH + bodyBuffer.byteLength
  );
  headerBuffer.setInt16(WS_HEADER_OFFSET, WS_PACKAGE_HEADER_TOTAL_LENGTH);
  headerBuffer.setInt16(
    WS_VERSION_OFFSET,
    header.protocolVersion ?? WS_HEADER_DEFAULT_VERSION
  );
  headerBuffer.setInt32(
    WS_OPERATION_OFFSET,
    header.operation ?? WS_HEADER_DEFAULT_OPERATION
  );
  headerBuffer.setInt32(
    WS_SEQUENCE_OFFSET,
    header.sequenceId ?? WS_HEADER_DEFAULT_SEQUENCE
  );

  return new Uint8Array([
    ...new Uint8Array(headerBuffer.buffer),
    ...new Uint8Array(bodyBuffer),
  ]).buffer;
};

interface BiliPacket {
  header: BiliHeader;
  body: string;
}

export const parsePacket = async (
  buffer: ArrayBufferLike
): Promise<BiliPacket[]> => {
  if (buffer.byteLength < WS_PACKAGE_HEADER_TOTAL_LENGTH) {
    console.warn("Buffer is too short to be a valid header");
    return [];
  }

  const allPackets = [];
  let offset = 0;

  while (offset + WS_PACKAGE_HEADER_TOTAL_LENGTH <= buffer.byteLength) {
    const headerDataView = new DataView(
      buffer,
      offset,
      WS_PACKAGE_HEADER_TOTAL_LENGTH
    );
    const header: BiliHeader = {
      packetLength: headerDataView.getInt32(0),
      headerLength: headerDataView.getInt16(WS_HEADER_OFFSET),
      protocolVersion: headerDataView.getInt16(WS_VERSION_OFFSET),
      operation: headerDataView.getInt32(WS_OPERATION_OFFSET),
      sequenceId: headerDataView.getInt32(WS_SEQUENCE_OFFSET),
    };
    const endOfPacket = offset + header.packetLength;

    if (header.packetLength < WS_PACKAGE_HEADER_TOTAL_LENGTH) {
      console.warn("Packet length is too short to be valid");
      break;
    }
    if (endOfPacket > buffer.byteLength) {
      console.warn("Packet length exceeds buffer length");
      break;
    }

    const rawBody = new Uint8Array(buffer.slice(offset + header.headerLength, endOfPacket));
    if (header.protocolVersion === WS_BODY_PROTOCOL_VERSION_BROTLI) {
      const { buffer, byteOffset, byteLength } = await brotliDecompress(
        rawBody
      );
      const decompressedPackets = await parsePacket(
        buffer.slice(byteOffset, byteOffset + byteLength)
      );
      allPackets.push(...decompressedPackets);
    } else {
      const textDecoder = new TextDecoder();
      const body = textDecoder.decode(rawBody);
      allPackets.push({ header, body });
    }

    offset = endOfPacket;
  }

  return allPackets;
};
