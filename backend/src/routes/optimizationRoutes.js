const express = require("express");

const router =
    express.Router();


// =====================================
// Optimization Algorithms
// =====================================

const {
    greedyOptimization,
    dynamicProgrammingOptimization
} = require("../algorithms/batteryOptimizer");


// =====================================
// JWT Authentication Middleware
// =====================================

const protect =
    require("../middleware/authMiddleware");


// =====================================
// GREEDY OPTIMIZATION
// POST /api/optimize/greedy
//
// Authentication:
// JWT
//
// Header:
// Authorization: Bearer <jwt-token>
// =====================================

router.post(
    "/greedy",
    protect,
    (req, res) => {

        try {

            const result =
                greedyOptimization(
                    req.body
                );


            res.status(200).json({

                success:
                    true,

                algorithm:
                    "Greedy",

                result

            });

        } catch (error) {

            console.error(
                "Greedy optimization error:",
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
// DYNAMIC PROGRAMMING OPTIMIZATION
// POST /api/optimize/dynamic
//
// Authentication:
// JWT
//
// Header:
// Authorization: Bearer <jwt-token>
// =====================================

router.post(
    "/dynamic",
    protect,
    (req, res) => {

        try {

            const result =
                dynamicProgrammingOptimization(
                    req.body
                );


            res.status(200).json({

                success:
                    true,

                algorithm:
                    "Dynamic Programming",

                result

            });

        } catch (error) {

            console.error(
                "Dynamic Programming optimization error:",
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
// LEGACY DYNAMIC PROGRAMMING ROUTE
// POST /api/optimize/dp
//
// This route is kept for backward
// compatibility with older frontend
// requests.
//
// Authentication:
// JWT
// =====================================

router.post(
    "/dp",
    protect,
    (req, res) => {

        try {

            const result =
                dynamicProgrammingOptimization(
                    req.body
                );


            res.status(200).json({

                success:
                    true,

                algorithm:
                    "Dynamic Programming",

                result

            });

        } catch (error) {

            console.error(
                "Dynamic Programming optimization error:",
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