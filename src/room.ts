import { WS_OP_HEARTBEAT_REPLY, WS_OP_CONNECT_SUCCESS } from "./constant";
import { getDanmakuServer } from "./api";
import { createPacket, parsePacket } from "./protocol";
import type { BiliMessage, KnownBiliMessage } from "./types";
import { danmakuTable, db } from "./db";
import { createConsola } from "consola";
import { messageTable } from "./db/schema";

export const collectDanmaku = async (roomId: number) => {
  const logger = createConsola({ defaults: { tag: `${roomId}` } });

  const { host, port, token } = await getDanmakuServer(roomId);
  logger.log("Connecting to", host, port, token);

  let heartbeatInterval: Timer;
  const ws = new WebSocket(`wss://${host}:${port}/sub`);
  ws.binaryType = "arraybuffer";

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

  ws.addEventListener("error", (error) => {
    logger.error("WebSocket error:", error);
  });

  ws.addEventListener("close", (event) => {
    logger.error("WebSocket connection closed:", event.code, event.reason);
    clearInterval(heartbeatInterval);
  });

  ws.addEventListener("open", () => {
    logger.log("WebSocket connection established");
    sendAuthPacket();
  });

  ws.addEventListener("message", async (event) => {
    const data = event.data as ArrayBuffer;
    const packets = await parsePacket(data);

    for (const packet of packets) {
      if (packet.header.operation === WS_OP_HEARTBEAT_REPLY) {
        logger.debug("Received heartbeat reply:", packet.body);
        return;
      }

      if (packet.header.operation === WS_OP_CONNECT_SUCCESS) {
        logger.log("Connection successful:", packet.body);

        heartbeatInterval = setInterval(() => {
          ws.send(createPacket({ operation: 2 }, ""));
        }, 30000);
        return;
      }

      logger.debug(packet.body);

      try {
        const message = JSON.parse(packet.body) as KnownBiliMessage;
        db.insert(messageTable)
          .values({
            room_id: roomId,
            raw: packet.body,
          })
          .run();

        if (message.cmd === "DANMU_MSG") {
          const sender = message.info[2][1];
          const content = message.info[1];
          const uid = message.info[2][0];
          const timestamp = message.info[9].ts;

          db.insert(danmakuTable)
            .values({
              room_id: roomId,
              sender_uid: uid,
              sender_name: sender,
              content,
              timestamp,
              raw: packet.body,
            })
            .run();
        }
      } catch (error) {
        logger.error("Failed to parse packet:", packet.body);
      }
    }
  });
};
