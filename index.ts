import { WS_OP_HEARTBEAT_REPLY, WS_OP_CONNECT_SUCCESS } from "./constant";
import { getDanmakuServer } from "./api";
import { createPacket, parsePacket } from "./protocol";

const roomId = 35298;

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

    try {
      console.log(packet.body);
    } catch (error) {
      console.error("Failed to parse packet:", error);
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
