require("dotenv").config();

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");


// =====================================
// DATABASE
// =====================================

const connectDB =
    require("./config/database");


// =====================================
// REDIS
// =====================================

const {
    redisClient,
    connectRedis
} = require("./config/redis");


// =====================================
// ROUTES
// =====================================

const sensorRoutes =
    require("./routes/sensorRoutes");

const optimizationRoutes =
    require("./routes/optimizationRoutes");

const authRoutes =
    require("./routes/authRoutes");


// =====================================
// AUTHENTICATION
// =====================================

const protect =
    require("./middleware/authMiddleware");


// =====================================
// SECURITY
// =====================================

const {
    securityHeaders,
    globalRateLimiter,
    authRateLimiter,
    deviceRateLimiter
} = require("./middleware/securityMiddleware");


// =====================================
// ALGORITHMS
// =====================================

const {
    optimizeRoute
} = require("./algorithms/routeOptimizer");

const {
    graphRouteOptimization
} = require("./algorithms/graphOptimizer");


// =====================================
// EXPRESS APPLICATION
// =====================================

const app =
    express();


// =====================================
// HTTP SERVER
// =====================================

const server =
    http.createServer(app);


// =====================================
// CONNECT MONGODB
// =====================================

connectDB();


// =====================================
// CONNECT REDIS
// =====================================

connectRedis()
    .catch(
        (error) => {

            console.error(
                "❌ Redis startup warning:",
                error.message
            );

            console.log(
                "⚠️ Server will continue without Redis."
            );

        }
    );


// =====================================
// SECURITY HEADERS
// =====================================

app.use(
    securityHeaders
);


// =====================================
// GLOBAL RATE LIMITER
// =====================================
//
// Normal API traffic:
// 100 requests / 15 minutes
//
// Sensor routes are excluded here because
// they have their own IoT-specific limiter.
//
// =====================================

app.use(
    globalRateLimiter
);


// =====================================
// CORS
// =====================================

app.use(
    cors({

        origin:
            "http://localhost:5173",

        methods: [
            "GET",
            "POST",
            "PUT",
            "DELETE",
            "OPTIONS"
        ],

        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "X-Device-Key"
        ]

    })
);


// =====================================
// JSON BODY LIMIT
// =====================================
//
// Prevent unnecessarily large JSON
// request bodies.
//
// =====================================

app.use(
    express.json({
        limit:
            "100kb"
    })
);


// =====================================
// WEBSOCKET SERVER
// =====================================

const wss =
    new WebSocket.Server({
        server
    });


app.set(
    "wss",
    wss
);


wss.on(
    "connection",
    (ws) => {

        console.log(
            "✅ WebSocket Client Connected"
        );


        // =================================
        // Initial WebSocket Message
        // =================================

        ws.send(
            JSON.stringify({

                type:
                    "connection",

                message:
                    "Connected to HeliosSync WebSocket Server"

            })
        );


        // =================================
        // WebSocket Disconnect
        // =================================

        ws.on(
            "close",
            () => {

                console.log(
                    "❌ WebSocket Client Disconnected"
                );

            }
        );

    }
);


// =====================================
// HOME ROUTE
// =====================================

app.get(
    "/",
    (req, res) => {

        res.json({

            success:
                true,

            message:
                "HeliosSync Backend is LIVE!",

            websocket:
                "Enabled",

            authentication:
                "Enabled",

            apiSecurity:
                "JWT + IoT Device Key",

            rateLimiting:
                "Enabled",

            securityHeaders:
                "Enabled",

            redis:
                redisClient.isReady
                    ? "Connected"
                    : "Disconnected"

        });

    }
);


// =====================================
// AUTHENTICATION ROUTES
// =====================================
//
// Strong authentication rate limit.
//
// 10 requests / 15 minutes.
//
// =====================================

app.use(
    "/api/auth",
    authRateLimiter,
    authRoutes
);


// =====================================
// SENSOR / IoT ROUTES
// =====================================
//
// Dedicated IoT rate limiter.
//
// 1000 requests / 15 minutes.
//
// The global limiter skips these routes.
//
// =====================================

app.use(
    "/api/sensors",
    deviceRateLimiter,
    sensorRoutes
);


// =====================================
// OPTIMIZATION ROUTES
// =====================================
//
// Protected by JWT inside
// optimizationRoutes.js.
//
// =====================================

app.use(
    "/api/optimize",
    optimizationRoutes
);


// =====================================
// ROUTE OPTIMIZATION API
// =====================================
//
// POST
// /api/route/optimize
//
// JWT protected.
//
// =====================================

app.post(
    "/api/route/optimize",
    protect,
    (req, res) => {

        try {

            const {

                currentBattery =
                    0,

                batteryCapacity =
                    10,

                locations =
                    []

            } = req.body;


            // =================================
            // Validate locations
            // =================================

            if (
                !Array.isArray(
                    locations
                ) ||
                locations.length === 0
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "No route locations provided."

                });

            }


            // =================================
            // Calculate battery percentage
            // =================================

            const batteryPercentage =
                batteryCapacity > 0

                    ? (
                        Number(
                            currentBattery
                        ) /
                        Number(
                            batteryCapacity
                        )
                    ) * 100

                    : 0;


            // =================================
            // Normalize route data
            // =================================

            const routes =
                locations.map(
                    (
                        location,
                        index
                    ) => {

                        return {

                            name:
                                location.name ||
                                `Location ${index + 1}`,

                            distance:
                                Number(
                                    location.distance
                                ) || 0,

                            energyRequired:
                                Number(
                                    location.energyRequired
                                ) || 0

                        };

                    }
                );


            // =================================
            // Run route optimization
            // =================================

            const result =
                optimizeRoute(
                    routes,
                    batteryPercentage
                );


            // =================================
            // Response
            // =================================

            res.status(200).json({

                success:
                    true,

                algorithm:
                    "Route Optimization",

                result

            });

        } catch (error) {

            console.error(
                "Route optimization error:",
                error.message
            );


            res.status(500).json({

                success:
                    false,

                message:
                    "Route optimization failed."

            });

        }

    }
);


// =====================================
// GRAPH ROUTE OPTIMIZATION API
// =====================================
//
// POST
// /api/route/graph
//
// JWT protected.
//
// Uses Dijkstra shortest-path algorithm.
//
// =====================================

app.post(
    "/api/route/graph",
    protect,
    (req, res) => {

        try {

            const result =
                graphRouteOptimization(
                    req.body
                );


            res.status(200).json({

                success:
                    true,

                algorithm:
                    "Dijkstra Shortest Path",

                result

            });

        } catch (error) {

            console.error(
                "Graph optimization error:",
                error.message
            );


            res.status(500).json({

                success:
                    false,

                message:
                    "Graph optimization failed."

            });

        }

    }
);


// =====================================
// HEALTH API
// =====================================
//
// GET
// /api/health
//
// Used by the frontend System Health
// panel.
//
// =====================================

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            success:
                true,

            database:
                "Connected",

            redis:
                redisClient.isReady
                    ? "Connected"
                    : "Disconnected",

            websocketClients:
                wss.clients.size,

            authentication:
                "Enabled",

            apiSecurity:
                "JWT + IoT Device Key",

            rateLimiting:
                "Enabled",

            securityHeaders:
                "Enabled",

            timestamp:
                new Date()

        });

    }
);


// =====================================
// 404 ROUTE
// =====================================

app.use(
    (req, res) => {

        res.status(404).json({

            success:
                false,

            message:
                "Route not found"

        });

    }
);


// =====================================
// GLOBAL ERROR HANDLER
// =====================================
//
// Catches unexpected server errors.
//
// =====================================

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        console.error(
            "Unhandled server error:",
            error.message
        );


        // =================================
        // If response already started
        // =================================

        if (
            res.headersSent
        ) {

            return next(
                error
            );

        }


        // =================================
        // Generic production-safe response
        // =================================

        res.status(500).json({

            success:
                false,

            message:
                "Internal server error."

        });

    }
);


// =====================================
// START SERVER
// =====================================

const PORT =
    process.env.PORT || 5000;


server.listen(
    PORT,
    () => {

        console.log(
            "======================================"
        );

        console.log(
            "🚀 HeliosSync Backend Started"
        );

        console.log(
            `🌐 http://localhost:${PORT}`
        );

        console.log(
            "📡 WebSocket Enabled"
        );

        console.log(
            "🌍 CORS Enabled"
        );

        console.log(
            "🔐 Authentication API Enabled"
        );

        console.log(
            "🛡️ JWT API Protection Enabled"
        );

        console.log(
            "🔑 IoT Device Authentication Enabled"
        );

        console.log(
            "⚡ Optimization API Enabled"
        );

        console.log(
            "🚗 Route Optimization Enabled"
        );

        console.log(
            "🗺️ Graph Optimization Enabled"
        );

        console.log(
            "⚡ Redis Cache Enabled"
        );

        console.log(
            "🛡️ Security Headers Enabled"
        );

        console.log(
            "🚦 Rate Limiting Enabled"
        );

        console.log(
            "📦 JSON Body Limit: 100kb"
        );

        console.log(
            "======================================"

        );

    }
);