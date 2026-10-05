const express = require("express");

const router =
    express.Router();


// =====================================
// Services
// =====================================

const {
    saveSensorData,
    getAllSensorData,
    getLatestSensorData,
    deleteAllSensorData
} = require("../services/sensorService");


// =====================================
// Authentication Middleware
// =====================================

const deviceAuth =
    require("../middleware/deviceAuthMiddleware");

const protect =
    require("../middleware/authMiddleware");


// =====================================
// SAVE SENSOR DATA
// POST /api/sensors
//
// Authentication:
// IoT Device Key
//
// Header required:
//
// X-Device-Key: <device-key>
//
// This endpoint is used by:
// - IoT sensor
// - Sensor simulator
// =====================================

router.post(
    "/",
    deviceAuth,
    async (req, res) => {

        try {

            const data =
                await saveSensorData(
                    req.body
                );


            res.status(201).json({

                success:
                    true,

                message:
                    "Sensor data saved successfully",

                data

            });

        } catch (error) {

            console.error(
                "Save sensor data error:",
                error.message
            );


            res.status(500).json({

                success:
                    false,

                message:
                    error.message

            });

        }

    }
);


// =====================================
// GET ALL SENSOR DATA
// GET /api/sensors
//
// Authentication:
// JWT
//
// Header required:
//
// Authorization:
// Bearer <jwt-token>
//
// Used by the React dashboard.
// =====================================

router.get(
    "/",
    protect,
    async (req, res) => {

        try {

            const data =
                await getAllSensorData();


            res.status(200).json({

                success:
                    true,

                count:
                    data.length,

                data

            });

        } catch (error) {

            console.error(
                "Get sensor data error:",
                error.message
            );


            res.status(500).json({

                success:
                    false,

                message:
                    error.message

            });

        }

    }
);


// =====================================
// GET LATEST SENSOR DATA
// GET /api/sensors/latest
//
// Authentication:
// JWT
//
// Header required:
//
// Authorization:
// Bearer <jwt-token>
// =====================================

router.get(
    "/latest",
    protect,
    async (req, res) => {

        try {

            const data =
                await getLatestSensorData();


            res.status(200).json({

                success:
                    true,

                data

            });

        } catch (error) {

            console.error(
                "Get latest sensor data error:",
                error.message
            );


            res.status(500).json({

                success:
                    false,

                message:
                    error.message

            });

        }

    }
);


// =====================================
// DELETE ALL SENSOR DATA
// DELETE /api/sensors
//
// Authentication:
// JWT
//
// Header required:
//
// Authorization:
// Bearer <jwt-token>
//
// This is a destructive operation,
// therefore authentication is required.
// =====================================

router.delete(
    "/",
    protect,
    async (req, res) => {

        try {

            await deleteAllSensorData();


            res.status(200).json({

                success:
                    true,

                message:
                    "All sensor data deleted successfully"

            });

        } catch (error) {

            console.error(
                "Delete sensor data error:",
                error.message
            );


            res.status(500).json({

                success:
                    false,

                message:
                    error.message

            });

        }

    }
);


// =====================================
// Export Router
// =====================================

module.exports =
    router;