import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/database.js";

const generateToken = (payload, expiresIn = "1d") => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn,
  });
};

export const login = async (req, res) => {
  try {
    const { identifiant, email, password, remember } = req.body;
    const loginIdentifier = (identifiant || email || "").trim();

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Identifiant et mot de passe requis",
      });
    }

    const [users] = await pool.query(
      "SELECT * FROM users WHERE email = ? OR name = ?",
      [loginIdentifier, loginIdentifier]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Identifiant ou mot de passe incorrect",
      });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Identifiant ou mot de passe incorrect",
      });
    }

    // Durée de validité selon la case "Rester connecté"
    const expiresIn = remember ? "30d" : (process.env.JWT_EXPIRES_IN || "1d");
    const maxAge = remember
      ? 30 * 24 * 60 * 60 * 1000
      : 24 * 60 * 60 * 1000;

    const token = generateToken(
      { id: user.id, email: user.email, name: user.name },
      expiresIn
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
    });

    return res.status(200).json({
      success: true,
      message: "Connexion réussie",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Erreur login :", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
};

export const logout = (req, res) => {
  res.clearCookie("token");
  return res.status(200).json({
    success: true,
    message: "Déconnexion réussie",
  });
};

export const me = async (req, res) => {
  try {
    const [users] = await pool.query(
      "SELECT id, email, name, created_at FROM users WHERE id = ?",
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }

    return res.status(200).json({
      success: true,
      user: users[0],
    });
  } catch (error) {
    console.error("Erreur me :", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
};

