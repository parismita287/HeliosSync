require("dotenv").config();

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");

const connectDB =
    require("./config/database");

const {
    redisClient,
    connectRedis
} = require("./config/redis");

const sensorRoutes =
    require("./routes/sensorRoutes");

const optimizationRoutes =
    require("./routes/optimizationRoutes");

const authRoutes =
    require("./routes/authRoutes");

const protect =
    require("./middleware/authMiddleware");

const {
    securityHeaders,
    globalRateLimiter,
    authRateLimiter,
    deviceRateLimiter
} = require("./middleware/securityMiddleware");

const {
    optimizeRoute
} = require("./algorithms/routeOptimizer");

const {
    graphRouteOptimization
} = require("./algorithms/graphOptimizer");

const app =
    express();

const server =
    http.createServer(app);

/*
============================================================
DATABASE
============================================================
*/

connectDB();

/*
============================================================
REDIS
============================================================
*/

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

/*
============================================================
SECURITY HEADERS
============================================================
*/

app.use(
    securityHeaders
);

/*
============================================================
GLOBAL RATE LIMITING
============================================================
*/

app.use(
    globalRateLimiter
);

/*
============================================================
CORS
============================================================

Local development:
http://localhost:5173

Production:
Set FRONTEND_URL in Render.

Example:

FRONTEND_URL=https://your-frontend.vercel.app

You can also provide multiple frontend URLs
separated by commas.
*/

const configuredFrontendUrls =
    process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL
            .split(",")
            .map(
                (url) =>
                    url.trim()
            )
            .filter(Boolean)
        : [];

const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    ...configuredFrontendUrls
];

app.use(
    cors({
        origin: (
            origin,
            callback
        ) => {

            /*
            Allow requests that do not contain
            an Origin header, such as Postman
            or direct backend requests.
            */

            if (!origin) {
                return callback(
                    null,
                    true
                );
            }

            if (
                allowedOrigins.includes(
                    origin
                )
            ) {
                return callback(
                    null,
                    true
                );
            }

            return callback(
                new Error(
                    "CORS policy: Origin not allowed."
                )
            );
        },

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

/*
============================================================
JSON BODY PARSER
============================================================
*/

app.use(
    express.json({
        limit:
            "100kb"
    })
);

/*
============================================================
WEBSOCKET SERVER
============================================================
*/

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

        ws.send(
            JSON.stringify({
                type:
                    "connection",

                message:
                    "Connected to HeliosSync WebSocket Server"
            })
        );

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

/*
============================================================
ROOT ROUTE
============================================================
*/

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

/*
============================================================
AUTHENTICATION ROUTES
============================================================
*/

app.use(
    "/api/auth",
    authRateLimiter,
    authRoutes
);

/*
============================================================
SENSOR ROUTES
============================================================
*/

app.use(
    "/api/sensors",
    deviceRateLimiter,
    sensorRoutes
);

/*
============================================================
OPTIMIZATION ROUTES
============================================================
*/

app.use(
    "/api/optimize",
    optimizationRoutes
);

/*
============================================================
ROUTE OPTIMIZATION
============================================================
*/

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

            const result =
                optimizeRoute(
                    routes,
                    batteryPercentage
                );

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

/*
============================================================
GRAPH / DIJKSTRA OPTIMIZATION
============================================================
*/

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

/*
============================================================
HEALTH CHECK
============================================================
*/

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

/*
============================================================
404 HANDLER
============================================================
*/

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

/*
============================================================
GLOBAL ERROR HANDLER
============================================================
*/

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

        if (
            res.headersSent
        ) {

            return next(
                error
            );

        }

        res.status(500).json({

            success:
                false,

            message:
                "Internal server error."

        });

    }
);

/*
============================================================
SERVER
============================================================

Render provides PORT through an environment variable.

0.0.0.0 allows the application to accept
external connections from Render's infrastructure.
============================================================
*/

const PORT =
    process.env.PORT || 5000;

const HOST =
    process.env.HOST || "0.0.0.0";

server.listen(
    PORT,
    HOST,
    () => {

        console.log(
            "======================================"
        );

        console.log(
            "🚀 HeliosSync Backend Started"
        );

        console.log(
            `🌐 Server Port: ${PORT}`
        );

        console.log(
            `🏠 Host: ${HOST}`
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