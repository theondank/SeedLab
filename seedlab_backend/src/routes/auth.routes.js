import express from "express";

import {
  login,
  loginWithFingerprint,
  startFingerprintAuth,
  getFingerprintStatus,
  cancelFingerprintAuth,
  logout,
  me,
} from "../controllers/auth.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/fingerprint", loginWithFingerprint);
router.post("/fingerprint/start", startFingerprintAuth);
router.get("/fingerprint/status", getFingerprintStatus);
router.post("/fingerprint/cancel", cancelFingerprintAuth);
router.post("/logout", logout);
router.get("/me", authMiddleware, me);

export default router;

