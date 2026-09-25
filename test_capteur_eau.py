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

# Logique du comparateur LM393 :
# - Sortie 1 (HIGH) quand le capteur est SEC (dans l'air)
# - Sortie 0 (LOW) quand le capteur est DANS L'EAU (conducteur)
WATER_LEVEL = 0      # 0 = Eau détectée, 1 = Sec
# =============================================================================

def main():
    print("\n" + "=" * 60)
    print("💧 TEST EN DIRECT DU CAPTEUR D'EAU (CALIBRATION LM393) 💧")
    print(f"Broche surveillée : GPIO {SONDE_PIN} (Broche physique 11)")
    print(f"Logique configurée : {WATER_LEVEL} = EAU DÉTECTÉE | {1 - WATER_LEVEL} = SEC")
    print("Appuyez sur Ctrl+C pour quitter.")
    print("=" * 60)

    GPIO.setmode(GPIO.BCM)
    GPIO.setwarnings(False)
    GPIO.setup(SONDE_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)

    dernier_etat = None

    try:
        print("\nPrêt ! Plongez la sonde dans un verre d'eau ou sortez-la...\n")

        while True:
            valeur = GPIO.input(SONDE_PIN)
            est_immergee = (valeur == WATER_LEVEL)

            # Détection d'un changement d'état
            if valeur != dernier_etat:
                if est_immergee:
                    print(f"💧 [DÉTECTION] -> EAU PRÉSENTE DANS LE BAC ! (GPIO {SONDE_PIN} = {valeur})")
                else:
                    print(f"🚫 [DÉTECTION] -> RÉSERVOIR SEC / PAS D'EAU ! (GPIO {SONDE_PIN} = {valeur})")
                dernier_etat = valeur

            # Affichage dynamique sur la même ligne
            icone = "💧 [EAU PRÉSENTE]" if est_immergee else "🚫 [PAS D'EAU]   "
            sys.stdout.write(f"\rÉtat : {icone} | Signal brut GPIO {SONDE_PIN} = {valeur} (1=Sec, 0=Eau) ")
            sys.stdout.flush()

            time.sleep(0.3)

    except KeyboardInterrupt:
        print("\n\nTest interrompu par l'utilisateur.")
    finally:
        GPIO.cleanup()
        print("GPIO nettoyés.")


if __name__ == "__main__":
    main()
