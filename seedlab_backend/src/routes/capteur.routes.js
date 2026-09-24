import express from "express";
import {
  getStatusSensors,
  updateSensorData,
  getPlantPhoto,
} from "../controllers/capteur.controller.js";

const router = express.Router();

router.get("/status", getStatusSensors);
router.get("/photo", getPlantPhoto);
router.post("/update", updateSensorData);

export default router;
