#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
SeedLab - Test Simple & Calibration du Capteur d'Eau (Sonde de Niveau)
=============================================================================
Ce script permet de tester et calibrer uniquement la sonde à eau :
- Affiche en temps réel la valeur lue sur la broche GPIO (0 ou 1).
- Détecte instantanément quand vous plongez ou sortez la sonde de l'eau.
- Permet de régler le potentiomètre de sensibilité si votre module en possède un.

Branchement sur Raspberry Pi :
  - VCC    -> Broche 1 (3.3V) ou Broche 2 (5V selon votre sonde)
  - GND    -> Broche 6 ou 9 (GND)
  - DO/OUT -> Broche 11 (GPIO 17 BCM)

Lancement :
  python3 test_capteur_eau.py
=============================================================================
"""

import sys
import time

try:
    import RPi.GPIO as GPIO
except (ImportError, RuntimeError):
    print("❌ RPi.GPIO n'est pas disponible. Ce script doit tourner sur la Raspberry Pi.")
    sys.exit(1)

# =============================================================================
# CONFIGURATION
# =============================================================================
SONDE_PIN = 17       # Broche BCM 17 (Broche physique 11)

# Définition de l'état logique :
# - Si la valeur passe à 1 (HIGH) quand la sonde touche l'eau -> WATER_LEVEL = 1
# - Si la valeur passe à 0 (LOW) quand la sonde touche l'eau -> WATER_LEVEL = 0
# (Ce script affiche les deux pour que vous puissiez vérifier instantanément)
WATER_LEVEL = 1
# =============================================================================

def main():
    print("\n" + "=" * 60)
    print("💧 TEST EN DIRECT DU CAPTEUR D'EAU 💧")
    print(f"Broche surveillée : GPIO {SONDE_PIN} (Broche physique 11)")
    print("Appuyez sur Ctrl+C pour quitter.")
    print("=" * 60)

    GPIO.setmode(GPIO.BCM)
    GPIO.setwarnings(False)
    GPIO.setup(SONDE_PIN, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)

    dernier_etat = None

    try:
        print("\nPrêt ! Plongez la sonde dans un verre d'eau ou sortez-la...\n")

        while True:
            valeur = GPIO.input(SONDE_PIN)
            est_immergee = (valeur == WATER_LEVEL)

            # Détection d'un changement d'état
            if valeur != dernier_etat:
                if est_immergee:
                    print(f"💧 [CHANGEMENT] -> EAU DÉTECTÉE !   (Signal brut GPIO = {valeur})")
                else:
                    print(f"🚫 [CHANGEMENT] -> PAS D'EAU (SEC) ! (Signal brut GPIO = {valeur})")
                dernier_etat = valeur

            # Affichage dynamique sur la même ligne
            icone = "💧 [EAU PRÉSENTE]" if est_immergee else "🚫 [PAS D'EAU]   "
            sys.stdout.write(f"\rLecture en cours : {icone} | Valeur brute GPIO={valeur} ")
            sys.stdout.flush()

            time.sleep(0.3)

    except KeyboardInterrupt:
        print("\n\nTest interrompu par l'utilisateur.")
    finally:
        GPIO.cleanup()
        print("GPIO nettoyés.")


if __name__ == "__main__":
    main()
