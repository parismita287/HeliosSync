const { createClient } = require("redis");


// ============================================
// HeliosSync Redis Configuration
// ============================================

const redisClient = createClient({
    url:
        process.env.REDIS_URL ||
        "redis://127.0.0.1:6379"
});


// ============================================
// Redis Error Handler
// ============================================

redisClient.on(
    "error",
    (error) => {

        console.error(
            "❌ Redis Client Error:",
            error.message
        );

    }
);


// ============================================
// Redis Connecting
// ============================================

redisClient.on(
    "connect",
    () => {

        console.log(
            "🔄 Redis connecting..."
        );

    }
);


// ============================================
// Redis Ready
// ============================================

redisClient.on(
    "ready",
    () => {

        console.log(
            "✅ Redis connected successfully!"
        );

    }
);


// ============================================
// Redis Reconnecting
// ============================================

redisClient.on(
    "reconnecting",
    () => {

        console.log(
            "🔄 Redis reconnecting..."
        );

    }
);


// ============================================
// Connect Redis
// ============================================

const connectRedis = async () => {

    try {

        if (
            !redisClient.isOpen
        ) {

            await redisClient.connect();

        }

    } catch (error) {

        console.error(
            "❌ Redis connection failed:",
            error.message
        );

        throw error;

    }

};


// ============================================
// Disconnect Redis
// ============================================

const disconnectRedis = async () => {

    try {

        if (
            redisClient.isOpen
        ) {

            await redisClient.quit();

            console.log(
                "Redis connection closed."
            );

        }

    } catch (error) {

        console.error(
            "Redis disconnect error:",
            error.message
        );

    }

};


// ============================================
// Export
// ============================================

module.exports = {

    redisClient,

    connectRedis,

    disconnectRedis

};