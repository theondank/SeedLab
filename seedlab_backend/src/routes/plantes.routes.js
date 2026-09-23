import express from "express";

import authMiddleware from "../middleware/auth.middleware.js";
import { createPlant, listPlants } from "../controllers/plantes.controller.js";

const router = express.Router();

router.get("/", authMiddleware, listPlants);
router.post("/", authMiddleware, createPlant);

export default router;