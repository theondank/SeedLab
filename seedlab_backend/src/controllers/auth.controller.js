import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/database.js";

const generateToken = (payload, expiresIn = "1d") => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

const setAuthCookie = (res, token, maxAge) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
  });
};

let biometricSession = {
  active: false,
  status: "idle",
  user: null,
  token: null,
  message: null,
  expiresAt: null,
};

export const login = async (req, res) => {
  try {
    const { identifiant, email, password, remember } = req.body;
    const loginIdentifier = (identifiant || email || "").trim();

    if (!loginIdentifier || !password) {
      return res.status(400).json({ success: false, message: "Identifiant et mot de passe requis" });
    }

    const [users] = await pool.query(
      "SELECT * FROM users WHERE email = ? OR name = ?",
      [loginIdentifier, loginIdentifier]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: "Identifiant ou mot de passe incorrect" });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Identifiant ou mot de passe incorrect" });
    }

    const expiresIn = remember ? "30d" : (process.env.JWT_EXPIRES_IN || "1d");
    const maxAge = remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const token = generateToken({ id: user.id, email: user.email, name: user.name }, expiresIn);

    setAuthCookie(res, token, maxAge);

    return res.status(200).json({
      success: true,
      message: "Connexion réussie",
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("Erreur login :", error);
    return res.status(500).json({ success: false, message: "Erreur interne du serveur" });
  }
};

export const startFingerprintAuth = (req, res) => {
  biometricSession = {
    active: true,
    status: "waiting",
    user: null,
    token: null,
    message: "En attente du doigt sur le capteur...",
    expiresAt: Date.now() + 30 * 1000,
  };

  return res.status(200).json({
    success: true,
    message: biometricSession.message,
    expiresInSeconds: 30,
  });
};

export const getFingerprintStatus = (req, res) => {
  if (biometricSession.active && biometricSession.status === "waiting" && Date.now() > biometricSession.expiresAt) {
    biometricSession.status = "failed";
    biometricSession.active = false;
    biometricSession.message = "Délai d'attente dépassé (aucun doigt scanné)";
  }

  return res.status(200).json({
    active: biometricSession.active,
    status: biometricSession.status,
    scan_required: biometricSession.active && biometricSession.status === "waiting",
    user: biometricSession.user,
    token: biometricSession.token,
    message: biometricSession.message,
  });
};

export const cancelFingerprintAuth = (req, res) => {
  biometricSession = {
    active: false,
    status: "idle",
    user: null,
    token: null,
    message: "Authentification annulée",
    expiresAt: null,
  };

  return res.status(200).json({ success: true, message: "Authentification biométrique annulée" });
};

export const loginWithFingerprint = async (req, res) => {
  try {
    const { api_key, fingerprint_id } = req.body;

    if (api_key !== process.env.SENSOR_API_KEY) {
      return res.status(401).json({ success: false, message: "Capteur non autorisé" });
    }

    if (!fingerprint_id) {
      return res.status(400).json({ success: false, message: "ID d'empreinte manquant" });
    }

    const [users] = await pool.query("SELECT * FROM users WHERE fingerprint_id = ?", [fingerprint_id]);

    if (users.length === 0) {
      biometricSession = {
        active: false,
        status: "failed",
        user: null,
        token: null,
        message: "Aucun utilisateur associé à cette empreinte",
        expiresAt: null,
      };
      return res.status(401).json({ success: false, message: "Aucun utilisateur associé à cette empreinte" });
    }

    const user = users[0];
    const token = generateToken({ id: user.id, email: user.email, name: user.name });
    setAuthCookie(res, token, 24 * 60 * 60 * 1000);

    const userData = { id: user.id, email: user.email, name: user.name };
    biometricSession = {
      active: true,
      status: "success",
      user: userData,
      token,
      message: "Connexion réussie",
      expiresAt: Date.now() + 60 * 1000,
    };

    return res.status(200).json({ success: true, message: "Connexion réussie", token, user: userData });
  } catch (error) {
    console.error("Erreur login fingerprint :", error);
    biometricSession = {
      active: false,
      status: "failed",
      user: null,
      token: null,
      message: "Erreur interne du serveur",
      expiresAt: null,
    };
    return res.status(500).json({ success: false, message: "Erreur interne du serveur" });
  }
};

export const logout = (req, res) => {
  res.clearCookie("token");
  return res.status(200).json({ success: true, message: "Déconnexion réussie" });
};

export const me = async (req, res) => {
  try {
    const [users] = await pool.query(
      "SELECT id, email, name, created_at FROM users WHERE id = ?",
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
    }

    return res.status(200).json({ success: true, user: users[0] });
  } catch (error) {
    console.error("Erreur me :", error);
    return res.status(500).json({ success: false, message: "Erreur interne du serveur" });
  }
};


