import express from "express";
import {
  getStatusSensors,
  updateSensorData,
} from "../controllers/capteur.controller.Js";

const router = express.Router();

// (pour le Front-end)
router.get("/status", getStatusSensors);

//(pour la Raspberry Pi)
router.post("/update", updateSensorData);

export default router;
