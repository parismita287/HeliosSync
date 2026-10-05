const { createClient } = require("redis");

const configuredRedisUrl =
    process.env.REDIS_URL;

let redisUrl =
    "redis://127.0.0.1:6379";

/*
============================================================
REDIS URL VALIDATION
============================================================

Render may not have Redis configured yet.

If REDIS_URL is missing or invalid, we fall back
to the local Redis URL instead of crashing the
entire HeliosSync backend.
============================================================
*/

if (configuredRedisUrl) {

    try {

        const parsedUrl =
            new URL(
                configuredRedisUrl
            );

        if (
            parsedUrl.protocol ===
                "redis:" ||
            parsedUrl.protocol ===
                "rediss:"
        ) {

            redisUrl =
                configuredRedisUrl;

        } else {

            console.warn(
                "⚠️ Invalid REDIS_URL protocol."
            );

            console.warn(
                "⚠️ Expected redis:// or rediss://"
            );

            console.warn(
                "⚠️ Falling back to local Redis."
            );

        }

    } catch (error) {

        console.warn(
            "⚠️ Invalid REDIS_URL detected."
        );

        console.warn(
            "⚠️ Falling back to local Redis."
        );

    }

} else {

    console.log(
        "ℹ️ REDIS_URL is not configured."
    );

    console.log(
        "ℹ️ Using local Redis configuration."
    );

}

/*
============================================================
CREATE REDIS CLIENT
============================================================
*/

const redisClient =
    createClient({
        url:
            redisUrl
    });

/*
============================================================
REDIS EVENTS
============================================================
*/

redisClient.on(
    "error",
    (error) => {

        console.error(
            "❌ Redis Client Error:",
            error.message
        );

    }
);

redisClient.on(
    "connect",
    () => {

        console.log(
            "🔄 Redis connecting..."
        );

    }
);

redisClient.on(
    "ready",
    () => {

        console.log(
            "✅ Redis connected successfully!"
        );

    }
);

redisClient.on(
    "reconnecting",
    () => {

        console.log(
            "🔄 Redis reconnecting!"
        );

    }
);

/*
============================================================
CONNECT REDIS
============================================================
*/

const connectRedis =
    async () => {

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

/*
============================================================
DISCONNECT REDIS
============================================================
*/

const disconnectRedis =
    async () => {

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

/*
============================================================
EXPORTS
============================================================
*/

module.exports = {

    redisClient,

    connectRedis,

    disconnectRedis

};