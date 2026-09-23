import express from "express";

import { login, logout, me } from "../controllers/auth.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/me", authMiddleware, me);

export default router;

