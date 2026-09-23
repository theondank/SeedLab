#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
SeedLab - Script de Diagnostic Complet & Test de Communication Pi <-> Backend
=============================================================================
Ce script permet de tester et déboguer toute la chaîne :
1. Connectivité réseau avec l'API Express
2. Lecture de l'état constant (/api/capteurs/status)
3. Envoi de télémesure normale (vérification que la pompe reste OFF)
4. Envoi de télémesure critique (sol sec < 35% -> vérification ordre pompe ON)
5. Test matériel réel du relais (si exécuté sur la Raspberry Pi)

Prérequis :
  pip3 install requests
  (Sur Raspberry Pi uniquement : pip3 install RPi.GPIO)

Lancement :
  python3 test_capteur_pi.py
"""

import sys
import time
import json

# Force l'encodage UTF-8 pour la console (évite les erreurs UnicodeEncodeError sur Windows)
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

try:
    import requests

except ImportError:
    print("❌ Le module 'requests' n'est pas installé.")
    print("   Installez-le avec : pip3 install requests")
    sys.exit(1)

# Détection automatique de RPi.GPIO (fonctionne sur la Pi ET sur PC pour tester)
HAS_GPIO = False
try:
    import RPi.GPIO as GPIO
    HAS_GPIO = True
except (ImportError, RuntimeError):
    HAS_GPIO = False


# =============================================================================
# CONFIGURATION
# =============================================================================
# ⚠️ Remplacez 'localhost' par l'IP de votre PC (ex: '192.168.1.50') si exécuté depuis la Pi
BACKEND_HOST = "localhost"
BACKEND_PORT = 5000
BASE_URL = f"http://{BACKEND_HOST}:{BACKEND_PORT}"

# Clé API configurée dans votre fichier seedlab_backend/.env
API_KEY = "seedlab_rpi_cle_secrete_2026"

# Configuration matérielle du relais (Raspberry Pi)
RELAY_PIN = 17      # Broche BCM 17
ACTIVE_LOW = True   # Niveau LOW pour fermer le relais


# =============================================================================
# FONCTIONS MATÉRIELLES RELAIS
# =============================================================================
def init_gpio():
    if HAS_GPIO:
        GPIO.setmode(GPIO.BCM)
        GPIO.setwarnings(False)
        GPIO.setup(RELAY_PIN, GPIO.OUT)
        relay_off()
        print(f"🔌 GPIO initialisé sur la broche BCM {RELAY_PIN} (Active Low: {ACTIVE_LOW})")
    else:
        print("ℹ️ RPi.GPIO non détecté (mode simulation PC actif - pas de déclenchement physique)")

def relay_on():
    if HAS_GPIO:
        GPIO.output(RELAY_PIN, GPIO.LOW if ACTIVE_LOW else GPIO.HIGH)
    print("   [RELAIS] 🟢 ON (fermé / pompe alimentée)")

def relay_off():
    if HAS_GPIO:
        GPIO.output(RELAY_PIN, GPIO.HIGH if ACTIVE_LOW else GPIO.LOW)
    print("   [RELAIS] 🔴 OFF (ouvert / pompe coupée)")


# =============================================================================
# TESTS DIAGNOSTIQUES
# =============================================================================
def test_1_ping_serveur():
    print("\n" + "=" * 60)
    print("TEST 1 : Connectivité réseau avec l'API Express")
    print("=" * 60)
    url = f"{BASE_URL}/api"
    print(f"-> Envoi GET vers {url}...")
    try:
        start = time.time()
        resp = requests.get(url, timeout=3)
        latency = int((time.time() - start) * 1000)
        print(f"   Status Code : {resp.status_code}")
        print(f"   Latence     : {latency} ms")
        print(f"   Réponse     : {resp.text}")
        if resp.status_code == 200:
            print("✅ TEST 1 RÉUSSI : Serveur en ligne et joignable.")
            return True
        else:
            print(f"❌ TEST 1 ÉCHOUÉ : Réponse inattendue ({resp.status_code})")
            return False
    except Exception as e:
        print(f"❌ TEST 1 ÉCHOUÉ : Impossible de joindre le serveur ({e})")
        print("   -> Vérifiez que 'npm run dev' tourne bien dans seedlab_backend.")
        print("   -> Si vous êtes sur la Pi, vérifiez l'adresse IP et le pare-feu du PC.")
        return False


def test_2_lecture_statut():
    print("\n" + "=" * 60)
    print("TEST 2 : Lecture de l'état actuel (GET /api/capteurs/status)")
    print("=" * 60)
    url = f"{BASE_URL}/api/capteurs/status"
    print(f"-> Envoi GET vers {url}...")
    try:
        resp = requests.get(url, timeout=3)
        print(f"   Status Code : {resp.status_code}")
        data = resp.json()
        print(f"   Données JSON reçues :\n{json.dumps(data, indent=4, ensure_ascii=False)}")
        if resp.status_code == 200 and "online" in data:
            print("✅ TEST 2 RÉUSSI : Endpoint de lecture opérationnel.")
            return True
        else:
            print(f"❌ TEST 2 ÉCHOUÉ : Réponse non conforme ({resp.status_code})")
            return False
    except Exception as e:
        print(f"❌ TEST 2 ÉCHOUÉ : Erreur lors de la lecture ({e})")
        return False


def test_3_envoi_telemetrie_normale():
    print("\n" + "=" * 60)
    print("TEST 3 : Envoi télémétrie normale (Humidité = 45% -> Pompe attendue: OFF)")
    print("=" * 60)
    url = f"{BASE_URL}/api/capteurs/update"
    payload = {
        "api_key": API_KEY,
        "temperature": 23.5,
        "humidite": 45.0,
        "debit_eau": 0,
        "luminosite": 180
    }
    print(f"-> Envoi POST vers {url} avec payload :\n{json.dumps(payload, indent=4)}")
    try:
        resp = requests.post(url, json=payload, timeout=3)
        print(f"   Status Code : {resp.status_code}")
        data = resp.json()
        print(f"   Réponse serveur :\n{json.dumps(data, indent=4, ensure_ascii=False)}")
        
        commands = data.get("commands", {})
        if commands.get("activer_pompe") is False:
            print("✅ TEST 3 RÉUSSI : Télémétrie acceptée, la pompe reste bien en veille.")
            return True
        else:
            print(f"❌ TEST 3 ÉCHOUÉ : La pompe aurait dû rester OFF.")
            return False
    except Exception as e:
        print(f"❌ TEST 3 ÉCHOUÉ : Erreur ({e})")
        return False


def test_4_envoi_telemetrie_critique():
    print("\n" + "=" * 60)
    print("TEST 4 : Envoi sol sec (Humidité = 28% -> Pompe attendue: ON)")
    print("=" * 60)
    url = f"{BASE_URL}/api/capteurs/update"
    payload = {
        "api_key": API_KEY,
        "temperature": 27.2,
        "humidite": 28.0,  # < 35% : Doit déclencher l'arrosage
        "debit_eau": 0,
        "luminosite": 320
    }
    print(f"-> Envoi POST vers {url} avec payload :\n{json.dumps(payload, indent=4)}")
    try:
        resp = requests.post(url, json=payload, timeout=3)
        print(f"   Status Code : {resp.status_code}")
        data = resp.json()
        print(f"   Réponse serveur :\n{json.dumps(data, indent=4, ensure_ascii=False)}")

        commands = data.get("commands", {})
        if commands.get("activer_pompe") is True:
            duree = commands.get("duree_secondes", 4)
            print(f"✅ TEST 4 RÉUSSI : Ordre reçu ! Déclenchement de la pompe pour {duree} secondes...")
            
            # Activation physique / simulation
            relay_on()
            for s in range(duree, 0, -1):
                sys.stdout.write(f"\r   Pompe en marche... reste {s}s ")
                sys.stdout.flush()
                time.sleep(1)
            print()
            relay_off()
            print("✅ Cycle de test de pompage terminé avec succès.")
            return True
        else:
            print("❌ TEST 4 ÉCHOUÉ : L'API n'a pas renvoyé l'ordre d'activer la pompe.")
            return False
    except Exception as e:
        print(f"❌ TEST 4 ÉCHOUÉ : Erreur ({e})")
        return False


def main():
    print("\n🌱 SEEDLAB - SUITE DE TESTS COMPLÈTE PI <-> BACKEND 🌱")
    print(f"Serveur cible : {BASE_URL}")
    print(f"Clé API       : {API_KEY[:8]}********")
    
    init_gpio()

    try:
        # Étape 1 : Ping
        if not test_1_ping_serveur():
            print("\n❌ Arrêt des tests : le serveur n'est pas joignable.")
            return

        # Étape 2 : Lecture état actuel
        test_2_lecture_statut()

        # Étape 3 : Télémétrie normale
        test_3_envoi_telemetrie_normale()

        # Étape 4 : Télémétrie sol sec + test pompe
        test_4_envoi_telemetrie_critique()

        # Étape 5 : Vérification de l'état final enregistré en BDD
        print("\n" + "=" * 60)
        print("VÉRIFICATION FINALE DE L'ÉTAT CONSTANT MIS À JOUR")
        print("=" * 60)
        test_2_lecture_statut()

        print("\n🎉 TOUS LES TESTS SONT TERMINÉS !")
        print("Copiez-collez ce rapport dans la discussion si vous observez une anomalie.")

    except KeyboardInterrupt:
        print("\nInterrompu par l'utilisateur.")
    finally:
        if HAS_GPIO:
            relay_off()
            GPIO.cleanup()
            print("🧹 GPIO nettoyé proprement.")


if __name__ == "__main__":
    main()
