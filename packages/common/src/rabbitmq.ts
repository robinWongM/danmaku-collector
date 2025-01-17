// Constants
export const QUEUE_NAME = 'danmaku_messages';
export const EXCHANGE_NAME = 'danmaku-events';
export const DLX_SUFFIX = '-dlx';
export const FAILED_SUFFIX = '-failed';

// Types
export interface RabbitMQConfig {
  url: string;
  name: string;
}

export interface RawMessage {
  roomId: number;
  packet: string;
  receivedTimestamp: number;
}

// Configuration builders
const createExchangeConfig = () => {
  const mainExchange = { exchange: EXCHANGE_NAME, type: 'direct' as const };
  const dlxExchange = { exchange: `${EXCHANGE_NAME}${DLX_SUFFIX}`, type: 'direct' as const };
  return [mainExchange, dlxExchange];
};

const createQueueConfig = () => {
  const mainQueue = {
    queue: QUEUE_NAME,
    durable: true,
    arguments: {
      "x-dead-letter-exchange": `${EXCHANGE_NAME}${DLX_SUFFIX}`,
      "x-dead-letter-routing-key": `${QUEUE_NAME}${FAILED_SUFFIX}`
    }
  };
  const dlqQueue = {
    queue: `${QUEUE_NAME}${FAILED_SUFFIX}`,
    durable: true,
  };
  return [mainQueue, dlqQueue];
};

const createBindingsConfig = () => [
  { exchange: EXCHANGE_NAME, routingKey: QUEUE_NAME },
  { exchange: `${EXCHANGE_NAME}${DLX_SUFFIX}`, routingKey: `${QUEUE_NAME}${FAILED_SUFFIX}` }
];

export const createBaseConfig = () => ({
  exchanges: createExchangeConfig(),
  queues: createQueueConfig(),
  queueBindings: createBindingsConfig()
}); 