#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
SeedLab - Processus Complet : Détection Sol Sec + Déclenchement Pompe (2s)
=============================================================================
Scénario de test :
1. Au départ, le capteur est dans l'eau (WET). La pompe reste éteinte.
2. Dès que vous retirez le capteur de l'eau (passage à DRY) :
   -> La pompe s'allume pendant 2 secondes.
   -> La pompe s'éteint automatiquement.
3. Le système attend que le capteur soit replongé dans l'eau (WET) avant de
   réarmer le prochain arrosage (sécurité anti-inondation).

Broches (BCM) :
- Capteur d'eau/sol  : GPIO 19 (Broche physique 35)
- Relais pompe à eau : GPIO 26 (Broche physique 37)
=============================================================================
"""

import RPi.GPIO as GPIO
import time
import sys

# =============================================================================
# CONFIGURATION BROCHES
# =============================================================================
SENSOR_PIN = 19     # Capteur d'eau (Broche 35)
RELAY_PIN = 26      # Pompe à eau (Broche 37)
DUREE_ARROSAGE = 2  # Durée de pompage en secondes

# Configuration GPIO
GPIO.setmode(GPIO.BCM)
GPIO.setwarnings(False)

# Capteur en entrée avec pull-up (LOW = WET, HIGH = DRY)
GPIO.setup(SENSOR_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)

# Pompe en sortie, éteinte au départ
GPIO.setup(RELAY_PIN, GPIO.OUT)
GPIO.output(RELAY_PIN, GPIO.LOW)


def allumer_pompe():
    GPIO.output(RELAY_PIN, GPIO.HIGH)
    print("   [POMPE] 🟢 POMPE ALLUMÉE")


def eteindre_pompe():
    GPIO.output(RELAY_PIN, GPIO.LOW)
    print("   [POMPE] 🔴 POMPE ÉTEINTE")


def arroser(duree=DUREE_ARROSAGE):
    print(f"\n🚨 [DÉCLENCHEMENT] Sol sec détecté ! Arrosage de {duree} secondes...")
    allumer_pompe()
    for s in range(duree, 0, -1):
        sys.stdout.write(f"\r   ⏳ Pompage en cours... reste {s}s ")
        sys.stdout.flush()
        time.sleep(1)
    print()
    eteindre_pompe()
    print("✅ Arrosage terminé avec succès !\n")


def main():
    print("=" * 65)
    print("🌱 SEEDLAB - CYCLE COMPLET ARROSAGE AUTOMATIQUE 🌱")
    print(f"Capteur : GPIO {SENSOR_PIN} | Pompe : GPIO {RELAY_PIN}")
    print("État attendu au départ : Capteur immergé (WET)")
    print("Action : Sortez le capteur de l'eau pour déclencher la pompe.")
    print("Appuyez sur Ctrl+C pour arrêter.")
    print("=" * 65 + "\n")

    arrosage_arme = True
    dernier_etat = None

    try:
        while True:
            val = GPIO.input(SENSOR_PIN)
            est_mouille = (val == GPIO.LOW)  # LOW = WET

            # Détection du passage à sec (DRY)
            if not est_mouille:
                if arrosage_arme:
                    print("\n🌵 Passage à DRY détecté (capteur hors de l'eau) !")
                    arroser(DUREE_ARROSAGE)
                    arrosage_arme = False  # Désarme pour éviter d'arroser en boucle
                    print("⏸️  En attente que le capteur soit remis dans l'eau pour réarmer...")
                else:
                    sys.stdout.write("\rStatut : DRY 🌵 (Pompe en sécurité, attente réarmement dans l'eau)   ")
                    sys.stdout.flush()

            # Détection de la remise dans l'eau (WET)
            else:
                if not arrosage_arme:
                    print("\n💧 Capteur replongé dans l'eau (WET) ! Système réarmé et prêt.")
                    arrosage_arme = True
                
                sys.stdout.write("\rStatut : WET 💧 (Sol humide / Capteur dans l'eau - Pompe au repos)   ")
                sys.stdout.flush()

            time.sleep(0.2)

    except KeyboardInterrupt:
        print("\n\nArrêt du script par l'utilisateur.")
    finally:
        eteindre_pompe()
        GPIO.cleanup()
        print("GPIO libérés et pompe sécurisée (éteinte).")


if __name__ == "__main__":
    main()
