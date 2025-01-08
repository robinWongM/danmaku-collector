import { WS_OP_HEARTBEAT_REPLY, WS_OP_CONNECT_SUCCESS } from "./constant";
import { getDanmakuServer } from "./api";
import { createPacket, parsePacket } from "./protocol";
import type { BiliMessage, KnownBiliMessage } from "./types";

const roomId = 1852504554;

const { host, port, token } = await getDanmakuServer(roomId);
console.error("Connecting to", host, port, token);

let heartbeatInterval: Timer;
const ws = new WebSocket(`wss://${host}:${port}/sub`);
ws.binaryType = "arraybuffer";

ws.addEventListener("error", (error) => {
  console.error("WebSocket error:", error);
});

ws.addEventListener("close", (event) => {
  console.error("WebSocket connection closed:", event.code, event.reason);
  clearInterval(heartbeatInterval);
});

ws.addEventListener("open", () => {
  console.error("WebSocket connection established");
  // Send authentication packet
  sendAuthPacket();
});

ws.addEventListener("message", async (event) => {
  const data = event.data as ArrayBuffer;
  const packets = await parsePacket(data);

  for (const packet of packets) {
    if (packet.header.operation === WS_OP_HEARTBEAT_REPLY) {
      console.error("Received heartbeat reply:", packet.body);
      return;
    }

    if (packet.header.operation === WS_OP_CONNECT_SUCCESS) {
      console.error("Connection successful:", packet.body);

      heartbeatInterval = setInterval(() => {
        ws.send(createPacket({ operation: 2 }, ""));
      }, 30000);
      return;
    }

    console.log(packet.body);

    try {
      const message = JSON.parse(packet.body) as KnownBiliMessage;
      if (message.cmd === "DANMU_MSG") {
        const sender = message.info[2][1];
        const content = message.info[1];
        const uid = message.info[2][0];
        const timestamp = message.info[9].ts;
        console.error(`[${new Date(timestamp * 1000).toISOString()}] ${sender} (${uid}): ${content}`);
      }
    } catch (error) {
      console.error("Failed to parse packet:", packet.body);
    }
  }
});

const sendAuthPacket = () => {
  const authJson = JSON.stringify({
    uid: parseInt(process.env.BILI_UID!),
    roomid: roomId,
    protover: 3,
    buvid: process.env.BILI_BUVID!,
    platform: "web",
    type: 2,
    key: token,
  });
  const packet = createPacket({ operation: 7 }, authJson);

  ws.send(packet);
};
