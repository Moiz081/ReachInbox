const Redis = require('ioredis');

const redisConnection = new Redis();

redisConnection.on('connect', () => {
    console.log('Connected to Redis');
});
redisConnection.on('error', (err) => {
    console.error('Redis connection error:', err);
});

module.exports = redisConnection;