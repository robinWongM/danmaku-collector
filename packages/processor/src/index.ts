import consola from "consola";
import { Connection } from 'rabbitmq-client';
import type { AsyncMessage } from 'rabbitmq-client/lib/codec';
import { db, danmakuTable, messageTable } from "./db";
import { QUEUE_NAME, createBaseConfig } from "@danmaku-collector/common";

const logger = consola.withTag('processor');

interface QueueMessage {
  roomId: number;
  packet: string;
  timestamp: number;
}

interface RabbitMQConfig {
  url: string;
  name: string;
}

function parseMessage(message: unknown): QueueMessage | null {
  try {
    const msg = message as any;
    if (
      typeof msg.roomId === 'number' &&
      typeof msg.packet === 'string' &&
      typeof msg.timestamp === 'number'
    ) {
      return msg as QueueMessage;
    }
    logger.warn('Invalid message format:', msg);
    return null;
  } catch {
    return null;
  }
}

async function processMessage(message: AsyncMessage) {
  try {
    // First convert unknown message to our expected format
    const queueMessage = parseMessage(message.body);
    if (!queueMessage) {
      // Reject invalid messages without requeue
      await message.reject(false);
      return;
    }

    const parsedPacket = JSON.parse(queueMessage.packet);

    // Store raw message
    db.insert(messageTable)
      .values({
        room_id: queueMessage.roomId,
        raw: queueMessage.packet,
      })
      .run();

    // Process DANMU_MSG
    if (parsedPacket.cmd === "DANMU_MSG") {
      const sender = parsedPacket.info[2][1];
      const content = parsedPacket.info[1];
      const uid = parsedPacket.info[2][0];
      const timestamp = parsedPacket.info[9].ts;

      db.insert(danmakuTable)
        .values({
          room_id: queueMessage.roomId,
          sender_uid: uid,
          sender_name: sender,
          content,
          timestamp,
          raw: queueMessage.packet,
        })
        .run();
    }

    // Acknowledge successful processing
    await message.ack();
  } catch (error) {
    logger.error("Failed to process message:", error);
    // Reject and requeue on processing error
    await message.reject(true);
  }
}

function createConnection(config: RabbitMQConfig): Connection {
  const connection = new Connection(config.url);

  connection.on('error', (err) => {
    logger.error(`RabbitMQ connection error (${config.name}):`, err);
  });

  connection.on('connection', () => {
    logger.success(`RabbitMQ connection successfully (re)established (${config.name})`);
  });

  const consumer = connection.createConsumer({
    ...createBaseConfig(),
    queue: QUEUE_NAME,
    qos: { prefetchCount: 10 },
    noAck: false
  }, processMessage);

  consumer.on('error', (err) => {
    logger.error(`Consumer error (${config.name}):`, err);
  });

  logger.info(`Connected to RabbitMQ instance: ${config.name}`);
  return connection;
}

async function closeConnections(connections: Connection[]) {
  await Promise.all(connections.map(async (connection) => {
    try {
      await connection.close();
    } catch (error) {
      logger.error("Error disconnecting:", error);
    }
  }));
}

async function main() {
  // Parse RabbitMQ configurations from environment variable
  const rabbitConfigs: RabbitMQConfig[] = JSON.parse(
    process.env.RABBITMQ_CONFIGS ||
    '[{"url": "amqp://localhost", "name": "local"}]'
  );

  const connections: Connection[] = rabbitConfigs.map(createConnection);

  // Handle shutdown gracefully
  async function onShutdown() {
    logger.info('Shutting down...');
    await closeConnections(connections);
    process.exit(0);
  }

  process.on('SIGINT', onShutdown);
  process.on('SIGTERM', onShutdown);
}

main();
