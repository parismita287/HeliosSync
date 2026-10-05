// ============================================
// HeliosSync Security Middleware
// ============================================

const helmet =
    require("helmet");

const rateLimit =
    require("express-rate-limit");


// ============================================
// SECURITY HEADERS
// ============================================

const securityHeaders =
    helmet({

        // Local development uses HTTP.
        // Enable HSTS later when production
        // deployment uses HTTPS.

        hsts:
            false,

        contentSecurityPolicy:
            false

    });


// ============================================
// GLOBAL API RATE LIMITER
// ============================================
//
// Applies to normal API traffic.
//
// IoT sensor traffic is excluded because
// sensor routes have their own dedicated
// rate limiter.
//
// ============================================

const globalRateLimiter =
    rateLimit({

        windowMs:
            15 * 60 * 1000,

        limit:
            100,

        standardHeaders:
            "draft-7",

        legacyHeaders:
            false,

        skip:
            (req) => {

                return req.path.startsWith(
                    "/api/sensors"
                );

            },

        message: {

            success:
                false,

            message:
                "Too many requests. Please try again later."

        }

    });


// ============================================
// AUTHENTICATION RATE LIMITER
// ============================================
//
// Login and registration receive a much
// stricter limit.
//
// ============================================

const authRateLimiter =
    rateLimit({

        windowMs:
            15 * 60 * 1000,

        limit:
            10,

        standardHeaders:
            "draft-7",

        legacyHeaders:
            false,

        message: {

            success:
                false,

            message:
                "Too many authentication attempts. Please try again later."

        }

    });


// ============================================
// IoT DEVICE RATE LIMITER
// ============================================
//
// IoT devices continuously send sensor
// readings.
//
// Higher limit is therefore required.
//
// 1000 requests / 15 minutes.
//
// ============================================

const deviceRateLimiter =
    rateLimit({

        windowMs:
            15 * 60 * 1000,

        limit:
            1000,

        standardHeaders:
            "draft-7",

        legacyHeaders:
            false,

        message: {

            success:
                false,

            message:
                "Too many IoT requests. Please slow down."

        }

    });


// ============================================
// Export
// ============================================

module.exports = {

    securityHeaders,

    globalRateLimiter,

    authRateLimiter,

    deviceRateLimiter

};