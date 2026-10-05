const SensorData =
    require("../models/SensorData");

const {
    redisClient
} = require("../config/redis");


// ============================================
// Redis Key
// ============================================

const LATEST_SENSOR_KEY =
    "heliossync:latest:sensor";


// ============================================
// Save Sensor Data
// ============================================

const saveSensorData =
    async (sensorData) => {

        // =====================================
        // Save permanently in MongoDB
        // =====================================

        const data =
            new SensorData(
                sensorData
            );

        const savedData =
            await data.save();


        // =====================================
        // Save latest data in Redis
        // =====================================

        try {

            if (
                redisClient.isReady
            ) {

                await redisClient.set(
                    LATEST_SENSOR_KEY,
                    JSON.stringify(
                        savedData
                    )
                );

                console.log(
                    "⚡ Latest sensor data cached in Redis"
                );

            }

        } catch (error) {

            console.error(
                "❌ Redis sensor cache error:",
                error.message
            );

        }


        // =====================================
        // Return MongoDB document
        // =====================================

        return savedData;

    };


// ============================================
// Get All Sensor Data
// ============================================

const getAllSensorData =
    async () => {

        return await SensorData
            .find()
            .sort({
                createdAt: -1
            })
            .limit(100);

    };


// ============================================
// Get Latest Sensor Data
// ============================================

const getLatestSensorData =
    async () => {

        // =====================================
        // Try Redis first
        // =====================================

        try {

            if (
                redisClient.isReady
            ) {

                const cachedData =
                    await redisClient.get(
                        LATEST_SENSOR_KEY
                    );


                if (
                    cachedData
                ) {

                    console.log(
                        "⚡ Latest sensor data served from Redis"
                    );

                    return JSON.parse(
                        cachedData
                    );

                }

            }

        } catch (error) {

            console.error(
                "❌ Redis cache read error:",
                error.message
            );

        }


        // =====================================
        // Redis cache miss
        // Fallback to MongoDB
        // =====================================

        console.log(
            "📦 Latest sensor data served from MongoDB"
        );


        const latestData =
            await SensorData
                .findOne()
                .sort({
                    createdAt: -1
                });


        // =====================================
        // Restore Redis cache
        // =====================================

        if (
            latestData &&
            redisClient.isReady
        ) {

            try {

                await redisClient.set(
                    LATEST_SENSOR_KEY,
                    JSON.stringify(
                        latestData
                    )
                );

                console.log(
                    "⚡ MongoDB data restored to Redis cache"
                );

            } catch (error) {

                console.error(
                    "❌ Redis cache restore error:",
                    error.message
                );

            }

        }


        return latestData;

    };


// ============================================
// Delete All Sensor Data
// ============================================

const deleteAllSensorData =
    async () => {

        // =====================================
        // Delete MongoDB data
        // =====================================

        const result =
            await SensorData.deleteMany({});


        // =====================================
        // Delete Redis cache
        // =====================================

        try {

            if (
                redisClient.isReady
            ) {

                await redisClient.del(
                    LATEST_SENSOR_KEY
                );

                console.log(
                    "🗑️ Latest sensor Redis cache deleted"
                );

            }

        } catch (error) {

            console.error(
                "❌ Redis cache delete error:",
                error.message
            );

        }


        return result;

    };


// ============================================
// Export
// ============================================

module.exports = {

    saveSensorData,

    getAllSensorData,

    getLatestSensorData,

    deleteAllSensorData

};