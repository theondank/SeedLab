import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { analyser, getDiagnostic } from "../controllers/ia.controller.js";

const router = express.Router();

router.get("/diagnostic", authMiddleware, getDiagnostic);
router.post("/analyser", authMiddleware, analyser);

export default router;