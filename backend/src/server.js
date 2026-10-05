require("dotenv").config();

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");

const connectDB =
    require("./config/database");

const {
    redisClient,
    connectRedis,
    disconnectRedis
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
    optimizeRoute
} = require("./algorithms/routeOptimizer");

const {
    graphRouteOptimization
} = require("./algorithms/graphOptimizer");

const {
    securityHeaders,
    globalRateLimiter,
    authRateLimiter,
    deviceRateLimiter
} = require("./middleware/securityMiddleware");


// =====================================
// APP INITIALIZATION
// =====================================

const app =
    express();


// =====================================
// IMPORTANT FOR RENDER
// =====================================
// Render runs the application behind
// a reverse proxy.
//
// This allows Express and
// express-rate-limit to correctly
// process X-Forwarded-For.
//
// =====================================

app.set(
    "trust proxy",
    1
);


const server =
    http.createServer(app);


// =====================================
// ENVIRONMENT
// =====================================

const PORT =
    process.env.PORT || 5000;

const HOST =
    process.env.HOST || "0.0.0.0";

const NODE_ENV =
    process.env.NODE_ENV || "development";


// =====================================
// FRONTEND CORS CONFIGURATION
// =====================================

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


// =====================================
// CORS
// =====================================

app.use(
    cors({
        origin: (
            origin,
            callback
        ) => {

            // Allow requests that do not
            // contain an Origin header.
            //
            // Example:
            // Postman
            // curl
            // server-to-server requests

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


            console.warn(
                "Blocked CORS origin:",
                origin
            );


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
        ],

        credentials: false
    })
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

app.use(
    globalRateLimiter
);


// =====================================
// BODY PARSER
// =====================================

app.use(
    express.json({
        limit: "100kb"
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


        ws.on(
            "error",
            (error) => {

                console.error(
                    "WebSocket error:",
                    error.message
                );

            }
        );

    }
);


// =====================================
// DATABASE CONNECTION
// =====================================

connectDB();


// =====================================
// REDIS CONFIGURATION
// =====================================
//
// Local development:
// REDIS_URL may be omitted and the
// local Redis/Memurai configuration
// can be used.
//
// Render production:
// If REDIS_URL is not configured,
// Redis connection is skipped.
//
// This prevents repeated:
// ECONNREFUSED 127.0.0.1:6379
//
// =====================================

let redisEnabled =
    false;


const hasRedisUrl =
    Boolean(
        process.env.REDIS_URL
    );


const shouldUseRedis =
    NODE_ENV !== "production" ||
    hasRedisUrl;


if (
    shouldUseRedis
) {

    connectRedis()
        .then(
            () => {

                redisEnabled =
                    true;

                console.log(
                    "✅ Redis connection initialized."
                );

            }
        )
        .catch(
            (error) => {

                redisEnabled =
                    false;

                console.warn(
                    "⚠️ Redis is unavailable."
                );

                console.warn(
                    "⚠️ HeliosSync will continue without Redis."
                );

                console.warn(
                    "Redis error:",
                    error.message
                );

            }
        );

} else {

    console.log(
        "ℹ️ REDIS_URL is not configured in production."
    );

    console.log(
        "ℹ️ Redis connection skipped."
    );

    console.log(
        "ℹ️ The application will continue without Redis."
    );

}


// =====================================
// HOME ROUTE
// =====================================

app.get(
    "/",
    (req, res) => {

        res.status(200).json({
            success:
                true,

            message:
                "HeliosSync Backend is LIVE!",

            environment:
                NODE_ENV,

            websocket:
                "Enabled",

            authentication:
                "Enabled",

            apiSecurity:
                "JWT + IoT Device Key",

            redis:
                redisEnabled
                    ? "Connected"
                    : "Unavailable / Not Configured"
        });

    }
);


// =====================================
// HEALTH ROUTE
// =====================================
//
// This route is intentionally public.
//
// Used by:
// - Render
// - Vercel
// - Browser testing
// - Monitoring
//
// =====================================

app.get(
    "/api/health",
    (req, res) => {

        res.status(200).json({

            success:
                true,

            status:
                "Healthy",

            database:
                "Connected",

            redis:
                redisEnabled
                    ? "Connected"
                    : "Unavailable / Not Configured",

            websocket:
                "Enabled",

            websocketClients:
                wss.clients.size,

            authentication:
                "Enabled",

            apiSecurity:
                "JWT + IoT Device Key",

            environment:
                NODE_ENV,

            timestamp:
                new Date()

        });

    }
);


// =====================================
// AUTHENTICATION ROUTES
// =====================================
//
// Public:
// POST /api/auth/register
// POST /api/auth/login
//
// Protected internally:
// GET /api/auth/me
// POST /api/auth/logout
//
// Authentication routes receive
// their own stricter rate limiter.
//
// =====================================

app.use(
    "/api/auth",
    authRateLimiter,
    authRoutes
);


// =====================================
// SENSOR ROUTES
// =====================================
//
// POST /api/sensors
// -> IoT Device Key
//
// GET /api/sensors
// -> JWT
//
// GET /api/sensors/latest
// -> JWT
//
// DELETE /api/sensors
// -> JWT
//
// Sensor requests are generated by
// the IoT simulator, therefore they
// use a separate rate limiter.
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
// POST /api/optimize/greedy
// POST /api/optimize/dynamic
// POST /api/optimize/dp
//
// JWT protected inside
// optimizationRoutes.js
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


            if (
                !Array.isArray(
                    locations
                ) ||
                locations.length === 0
            ) {

                return res.status(
                    400
                ).json({

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
                    ) *
                    100
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


            return res.status(
                200
            ).json({

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


            return res.status(
                500
            ).json({

                success:
                    false,

                message:
                    error.message

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
// Uses Dijkstra's algorithm.
//
// JWT protected.
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


            return res.status(
                200
            ).json({

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


            return res.status(
                500
            ).json({

                success:
                    false,

                message:
                    error.message

            });

        }

    }
);


// =====================================
// 404 HANDLER
// =====================================

app.use(
    (req, res) => {

        return res.status(
            404
        ).json({

            success:
                false,

            message:
                "Route not found",

            path:
                req.originalUrl

        });

    }
);


// =====================================
// GLOBAL ERROR HANDLER
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
            error
        );


        // Handle CORS errors
        if (
            error.message ===
            "CORS policy: Origin not allowed."
        ) {

            return res.status(
                403
            ).json({

                success:
                    false,

                message:
                    "CORS policy: Origin not allowed."

            });

        }


        return res.status(
            500
        ).json({

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


// =====================================
// GRACEFUL SHUTDOWN
// =====================================

const gracefulShutdown =
    async (
        signal
    ) => {

        console.log(
            `\n${signal} received.`
        );

        console.log(
            "🛑 Shutting down HeliosSync..."
        );


        try {

            // Close WebSocket clients

            wss.clients.forEach(
                (client) => {

                    try {

                        client.close();

                    } catch (error) {

                        console.error(
                            "WebSocket close error:",
                            error.message
                        );

                    }

                }
            );


            // Close WebSocket server

            await new Promise(
                (
                    resolve
                ) => {

                    wss.close(
                        () => {
                            resolve();
                        }
                    );

                }
            );


            // Close Redis

            await disconnectRedis();


            // Close HTTP server

            await new Promise(
                (
                    resolve
                ) => {

                    server.close(
                        () => {
                            resolve();
                        }
                    );

                }
            );


            console.log(
                "✅ HeliosSync shutdown complete."
            );


            process.exit(
                0
            );

        } catch (error) {

            console.error(
                "❌ Shutdown error:",
                error.message
            );

            process.exit(
                1
            );

        }

    };


process.on(
    "SIGTERM",
    () => {
        gracefulShutdown(
            "SIGTERM"
        );
    }
);


process.on(
    "SIGINT",
    () => {
        gracefulShutdown(
            "SIGINT"
        );
    }
);