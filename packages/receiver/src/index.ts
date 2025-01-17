import consola from "consola";
import { Connection } from 'rabbitmq-client';
import { getDanmakuServer } from "./api";
import { createPacket, parsePacket } from "./protocol";
import { WS_OP_HEARTBEAT_REPLY, WS_OP_CONNECT_SUCCESS } from "./constant";

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const QUEUE_NAME = 'danmaku_messages';
const EXCHANGE_NAME = 'danmaku-events';

// Initialize RabbitMQ connection
const rabbit = new Connection(RABBITMQ_URL);
rabbit.on('error', (err) => {
  consola.error('RabbitMQ connection error', err);
});
rabbit.on('connection', () => {
  consola.success('RabbitMQ connection successfully (re)established');
});

// Create publisher
const publisher = rabbit.createPublisher({
  confirm: true,
  maxAttempts: 2,
  exchanges: [{
    exchange: EXCHANGE_NAME,
    type: 'direct'
  }]
});

export const collectDanmaku = async (roomId: number) => {
  const logger = consola.withTag(`${roomId}`);

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

  ws.addEventListener("close", async (event) => {
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

      // Publish message to RabbitMQ
      const message = {
        roomId,
        packet: packet.body,
        timestamp: Date.now()
      };

      await publisher.send(
        { exchange: EXCHANGE_NAME, routingKey: QUEUE_NAME },
        message
      );
      logger.debug("Message sent to queue");
    }
  });
};

// Start collecting
const roomIdList = JSON.parse(process.env.ROOM_ID_LIST || "[]") as number[];

for (const roomId of roomIdList) {
  collectDanmaku(roomId);
  await Bun.sleep(1000 + Math.random() * 500);
}

// Cleanup on shutdown
async function onShutdown() {
  await publisher.close();
  await rabbit.close();
}

process.on('SIGINT', onShutdown);
process.on('SIGTERM', onShutdown);
