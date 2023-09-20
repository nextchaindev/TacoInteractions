import Redis from 'ioredis';

export const client = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  username: process.env.REDIS_USERNAME,
  keyPrefix: process.env.REDIS_PREFIX,
  password: process.env.REDIS_PASSWORD,
  lazyConnect: true
});

export const connect = async () => {
  console.log('Connecting to Redis');
  await client.connect();
  const isConnected = await client.ping();
  if (isConnected) {
    console.log(isConnected);
    console.log('Connected to Redis');
  } else {
    console.log('Failed to connect to Redis');
  }
};

export const disconnect = () => {
  client.disconnect();
};
