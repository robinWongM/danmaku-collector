import consola from "consola";
import { Connection } from 'rabbitmq-client';
import { db, danmakuTable, messageTable } from "./db";

const logger = consola.withTag('processor');
const QUEUE_NAME = 'danmaku_messages';
const EXCHANGE_NAME = 'danmaku-events';

interface QueueMessage {
  roomId: number;
  packet: string;
  timestamp: number;
}

interface RabbitMQConfig {
  url: string;
  name: string;
}

class MessageProcessor {
  private connections: Map<string, Connection> = new Map();
  private logger = consola.withTag('processor');

  constructor(private configs: RabbitMQConfig[]) { }

  private async processMessage(message: Message<unknown>) {
    try {
      // First convert unknown message to our expected format
      const queueMessage = this.parseMessage(message.content);
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
      this.logger.error("Failed to process message:", error);
      // Reject and requeue on processing error
      await message.reject(true);
    }
  }

  private parseMessage(message: unknown): QueueMessage | null {
    try {
      const msg = message as any;
      if (
        typeof msg.roomId === 'number' &&
        typeof msg.packet === 'string' &&
        typeof msg.timestamp === 'number'
      ) {
        return msg as QueueMessage;
      }
      this.logger.warn('Invalid message format:', msg);
      return null;
    } catch {
      return null;
    }
  }

  async connect() {
    try {
      for (const config of this.configs) {
        const connection = new Connection(config.url);

        connection.on('error', (err) => {
          this.logger.error(`RabbitMQ connection error (${config.name}):`, err);
        });

        connection.on('connection', () => {
          this.logger.success(`RabbitMQ connection successfully (re)established (${config.name})`);
        });

        const consumer = connection.createConsumer({
          queue: QUEUE_NAME,
          queueOptions: {
            durable: true,
            arguments: {
              "x-dead-letter-exchange": `${EXCHANGE_NAME}-dlx`,
              "x-dead-letter-routing-key": `${QUEUE_NAME}-failed`
            },
          },
          qos: { prefetchCount: 10 },
          exchanges: [
            { exchange: EXCHANGE_NAME, type: 'direct' },
            // Declare dead letter exchange
            { exchange: `${EXCHANGE_NAME}-dlx`, type: 'direct' }
          ],
          queueBindings: [
            { exchange: EXCHANGE_NAME, routingKey: QUEUE_NAME }
          ],
          // Enable manual acknowledgment
          noAck: false
        }, async (msg) => {
          await this.processMessage(msg);
        });

        consumer.on('error', (err) => {
          this.logger.error(`Consumer error (${config.name}):`, err);
        });

        // Create dead letter queue
        await connection.queueDeclare({
          queue: `${QUEUE_NAME}-failed`,
          durable: true,
          arguments: {
            "x-dead-letter-exchange": `${EXCHANGE_NAME}-dlx`,
            "x-dead-letter-routing-key": `${QUEUE_NAME}-failed`
          }
        });

        this.connections.set(config.name, connection);
        this.logger.info(`Connected to RabbitMQ instance: ${config.name}`);
      }
    } catch (error) {
      this.logger.error("Failed to connect to RabbitMQ instances:", error);
      throw error;
    }
  }

  async disconnect() {
    const closePromises = Array.from(this.connections.entries()).map(async ([name, connection]) => {
      try {
        await connection.close();
        this.logger.info(`Disconnected from RabbitMQ instance: ${name}`);
      } catch (error) {
        this.logger.error(`Error disconnecting from ${name}:`, error);
      }
    });

    await Promise.all(closePromises);
    this.connections.clear();
  }
}

async function main() {
  // Parse RabbitMQ configurations from environment variable
  const rabbitConfigs: RabbitMQConfig[] = JSON.parse(
    process.env.RABBITMQ_CONFIGS ||
    '[{"url": "amqp://localhost", "name": "local"}]'
  );

  const processor = new MessageProcessor(rabbitConfigs);

  try {
    await processor.connect();

    // Handle shutdown gracefully
    async function onShutdown() {
      logger.info('Shutting down...');
      await processor.disconnect();
      process.exit(0);
    }

    process.on('SIGINT', onShutdown);
    process.on('SIGTERM', onShutdown);

  } catch (error) {
    logger.error("Failed to start processor:", error);
    process.exit(1);
  }
}

main();
