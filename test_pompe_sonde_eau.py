#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
SeedLab - Test Complet : Pompe à Eau + Sonde de Niveau d'Eau
=============================================================================
Ce script permet de tester la chaîne d'arrosage sécurisée :
1. Lecture en direct de la sonde à eau (détection de présence d'eau).
2. Sécurité anti-marche à sec (la pompe ne démarre pas si le bac est vide).
3. Test de pompage sécurisé avec coupure d'urgence si le réservoir se vide
   pendant le fonctionnement.

Câblage recommandé (sur Raspberry Pi) :
-----------------------------------------------------------------------------
Relais (Pompe à eau) :
  - VCC   -> Broche 2 (5V)
  - GND   -> Broche 6 (GND)
  - IN    -> Broche 37 (GPIO 26 BCM)

Sonde à eau (Capteur de niveau d'eau / présence d'eau tout-ou-rien) :
  - VCC   -> Broche 1 (3.3V) ou Broche 2 (5V selon modèle)
  - GND   -> Broche 9 ou 14 (GND)
  - DO/OUT -> Broche 11 (GPIO 17 BCM)
-----------------------------------------------------------------------------

Lancement :
  python3 test_pompe_sonde_eau.py
"""

import sys
import time

try:
    import RPi.GPIO as GPIO
    HAS_GPIO = True
except (ImportError, RuntimeError):
    HAS_GPIO = False
    print("⚠️ RPi.GPIO non détecté. Ce script doit être exécuté sur la Raspberry Pi.")
    sys.exit(1)

# =============================================================================
# CONFIGURATION MATÉRIELLE
# =============================================================================
RELAY_PIN = 26       # BCM 26 (Broche physique 37) - Relais pompe
SONDE_PIN = 17       # BCM 17 (Broche physique 11) - Sonde niveau d'eau

# Relais : True si Active LOW (0V = allumé, 3.3V = éteint), False sinon
RELAY_ACTIVE_LOW = False

# Sonde : Niveau logique quand l'eau est DÉTECTÉE
# - Sur la plupart des sondes à comparateur LM393 : sortie LOW (0) quand immergée
# - Si votre sonde renvoie 1 (HIGH) quand il y a de l'eau, passez cette valeur à GPIO.HIGH
WATER_DETECTED_LEVEL = GPIO.HIGH

# Temps d'arrosage pour le test (en secondes)
DUREE_POMPAGE = 4


# =============================================================================
# FONCTIONS DE PILOTAGE
# =============================================================================
def init_hardware():
    """Initialise les broches GPIO pour le relais et la sonde."""
    GPIO.setmode(GPIO.BCM)
    GPIO.setwarnings(False)

    # Configuration du relais (Sortie)
    GPIO.setup(RELAY_PIN, GPIO.OUT)
    couper_pompe()

    # Configuration de la sonde (Entrée avec résistance de tirage)
    GPIO.setup(SONDE_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
    print(f"🔌 Broches initialisées : Pompe=BCM {RELAY_PIN} | Sonde=BCM {SONDE_PIN}")


def eau_presente() -> bool:
    """Retourne True si la sonde détecte de l'eau, False sinon."""
    lecture = GPIO.input(SONDE_PIN)
    return lecture == WATER_DETECTED_LEVEL


def activer_pompe():
    """Ferme le relais pour alimenter la pompe."""
    GPIO.output(RELAY_PIN, GPIO.LOW if RELAY_ACTIVE_LOW else GPIO.HIGH)
    print("   [RELAIS] 🟢 Pompe ACTIVÉE")


def couper_pompe():
    """Ouvre le relais pour éteindre la pompe."""
    GPIO.output(RELAY_PIN, GPIO.HIGH if RELAY_ACTIVE_LOW else GPIO.LOW)
    print("   [RELAIS] 🔴 Pompe COUPÉE")


# =============================================================================
# TESTS DIAGNOSTIQUES
# =============================================================================
def test_1_lecture_sonde():
    """Vérifie l'état actuel de la sonde à eau."""
    print("\n" + "=" * 60)
    print("TEST 1 : Vérification de la sonde à eau")
    print("=" * 60)
    
    etat_brut = GPIO.input(SONDE_PIN)
    presente = eau_presente()
    
    print(f"-> Valeur brute GPIO {SONDE_PIN} : {'HIGH (1)' if etat_brut else 'LOW (0)'}")
    if presente:
        print("✅ Eau DÉTECTÉE dans le réservoir.")
    else:
        print("⚠️ PAS D'EAU détectée (réservoir vide ou sonde hors de l'eau).")
    
    return presente


def test_2_surveillance_continue(duree_sec=10):
    """Affiche en continu l'état de la sonde pour calibrer ou tester en trempant la sonde."""
    print("\n" + "=" * 60)
    print(f"TEST 2 : Surveillance en direct de la sonde ({duree_sec}s)")
    print("Trempez ou sortez la sonde de l'eau pour observer le changement d'état...")
    print("=" * 60)
    
    fin = time.time() + duree_sec
    while time.time() < fin:
        presente = eau_presente()
        symbole = "💧 [EAU DÉTECTÉE] " if presente else "🚫 [PAS D'EAU]     "
        sys.stdout.write(f"\r-> {symbole} | Reste {int(fin - time.time())}s ")
        sys.stdout.flush()
        time.sleep(0.3)
    print("\n✅ Fin de la surveillance en direct.")


def test_3_pompage_securise(duree=DUREE_POMPAGE):
    """Exécute un cycle de pompage sous protection permanente de la sonde."""
    print("\n" + "=" * 60)
    print(f"TEST 3 : Cycle de pompage sécurisé ({duree} secondes)")
    print("=" * 60)

    # 1. Vérification préalable
    if not eau_presente():
        print("❌ SÉCURITÉ ACTIVÉE : Impossible de démarrer la pompe !")
        print("   Raison : Aucun niveau d'eau détecté par la sonde (protection anti-marche à sec).")
        print("   Veuillez remplir le bac ou immerger la sonde pour autoriser le pompage.")
        return False

    print("✅ Niveau d'eau suffisant confirmé.")
    print(f"🚀 Démarrage de la pompe pour {duree} secondes...")
    activer_pompe()

    # 2. Pompage avec surveillance temps réel
    try:
        for s in range(duree, 0, -1):
            if not eau_presente():
                print("\n🚨 ALERTE : Niveau d'eau critique en cours de pompage !")
                couper_pompe()
                print("🛑 Arrêt d'urgence de la pompe effectué immédiatement.")
                return False

            sys.stdout.write(f"\r   Pompage en cours... {s}s restantes (Niveau OK) ")
            sys.stdout.flush()
            time.sleep(1)
        print()
    finally:
        couper_pompe()

    print("🎉 Pompage terminé avec succès sans rupture de niveau.")
    return True


# =============================================================================
# PROGRAMME PRINCIPAL
# =============================================================================
def main():
    print("\n🌱 SEEDLAB - TEST POMPE À EAU + SONDE DE NIVEAU 🌱")
    init_hardware()

    try:
        # Étape 1 : Lecture ponctuelle de la sonde
        eau_disponible = test_1_lecture_sonde()

        # Étape 2 : Surveillance en direct pour vérification manuelle
        test_2_surveillance_continue(duree_sec=6)

        # Étape 3 : Tentative de pompage sécurisé
        test_3_pompage_securise(duree=DUREE_POMPAGE)

    except KeyboardInterrupt:
        print("\n\n⚠️ Interruption par l'utilisateur (Ctrl+C).")
    finally:
        couper_pompe()
        GPIO.cleanup()
        print("🧹 GPIO libérés et sécurisés.")


if __name__ == "__main__":
    main()
