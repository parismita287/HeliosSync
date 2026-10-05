const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const protect =
    require("../middleware/authMiddleware");

const router = express.Router();


// =====================================================
// Helper: Generate JWT
// =====================================================

const generateToken = (user) => {

    return jwt.sign(
        {
            id: user._id.toString(),

            name: user.name,

            email: user.email
        },

        process.env.JWT_SECRET,

        {
            expiresIn:
                process.env.JWT_EXPIRES_IN || "1d"
        }
    );

};


// =====================================================
// REGISTER
// POST /api/auth/register
// =====================================================

router.post(
    "/register",
    async (req, res) => {

        try {

            const {
                name,
                email,
                password
            } = req.body;


            // -----------------------------------------
            // Validate required fields
            // -----------------------------------------

            if (
                !name ||
                !email ||
                !password
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Name, email and password are required."

                });

            }


            // -----------------------------------------
            // Validate password length
            // -----------------------------------------

            if (
                password.length < 6
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Password must contain at least 6 characters."

                });

            }


            // -----------------------------------------
            // Normalize email
            // -----------------------------------------

            const normalizedEmail =
                email
                    .trim()
                    .toLowerCase();


            // -----------------------------------------
            // Check existing user
            // -----------------------------------------

            const existingUser =
                await User.findOne({
                    email: normalizedEmail
                });


            if (existingUser) {

                return res.status(409).json({

                    success: false,

                    message:
                        "An account with this email already exists."

                });

            }


            // -----------------------------------------
            // Hash password
            // -----------------------------------------

            const salt =
                await bcrypt.genSalt(10);

            const hashedPassword =
                await bcrypt.hash(
                    password,
                    salt
                );


            // -----------------------------------------
            // Create user
            // -----------------------------------------

            const user =
                await User.create({

                    name:
                        name.trim(),

                    email:
                        normalizedEmail,

                    password:
                        hashedPassword

                });


            // -----------------------------------------
            // Generate JWT
            // -----------------------------------------

            const token =
                generateToken(user);


            // -----------------------------------------
            // Response
            // -----------------------------------------

            return res.status(201).json({

                success: true,

                message:
                    "User registered successfully.",

                token,

                user: {

                    id:
                        user._id,

                    name:
                        user.name,

                    email:
                        user.email

                }

            });

        } catch (error) {

            console.error(
                "Registration error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Registration failed."

            });

        }

    }
);


// =====================================================
// LOGIN
// POST /api/auth/login
// =====================================================

router.post(
    "/login",
    async (req, res) => {

        try {

            const {
                email,
                password
            } = req.body;


            // -----------------------------------------
            // Validate fields
            // -----------------------------------------

            if (
                !email ||
                !password
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email and password are required."

                });

            }


            const normalizedEmail =
                email
                    .trim()
                    .toLowerCase();


            // -----------------------------------------
            // Find user
            // -----------------------------------------

            const user =
                await User.findOne({
                    email: normalizedEmail
                });


            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid email or password."

                });

            }


            // -----------------------------------------
            // Compare password
            // -----------------------------------------

            const passwordMatches =
                await bcrypt.compare(
                    password,
                    user.password
                );


            if (!passwordMatches) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid email or password."

                });

            }


            // -----------------------------------------
            // Generate token
            // -----------------------------------------

            const token =
                generateToken(user);


            // -----------------------------------------
            // Response
            // -----------------------------------------

            return res.status(200).json({

                success: true,

                message:
                    "Login successful.",

                token,

                user: {

                    id:
                        user._id,

                    name:
                        user.name,

                    email:
                        user.email

                }

            });

        } catch (error) {

            console.error(
                "Login error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Login failed."

            });

        }

    }
);


// =====================================================
// CURRENT USER
// GET /api/auth/me
// =====================================================

router.get(
    "/me",
    protect,
    async (req, res) => {

        try {

            const user =
                await User.findById(
                    req.user.id
                ).select(
                    "-password"
                );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            return res.status(200).json({

                success: true,

                user: {

                    id:
                        user._id,

                    name:
                        user.name,

                    email:
                        user.email,

                    createdAt:
                        user.createdAt

                }

            });

        } catch (error) {

            console.error(
                "Get current user error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to retrieve user."

            });

        }

    }
);


// =====================================================
// LOGOUT
// =====================================================
//
// JWT authentication is stateless.
// The frontend will remove the token.
// This endpoint simply confirms the action.
// =====================================================

router.post(
    "/logout",
    protect,
    (req, res) => {

        return res.status(200).json({

            success: true,

            message:
                "Logout successful. Remove the token on the client."

        });

    }
);


module.exports = router;