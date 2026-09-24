#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
SeedLab - Service Réel de Télémétrie & Arrosage Automatique
=============================================================================
Ce service s'exécute en continu sur la Raspberry Pi :
1. Lit le capteur DHT22 (Température & Humidité de l'air).
2. Surveille la sonde de niveau d'eau du réservoir (Sécurité anti-marche à sec).
3. Gère l'arrosage automatique via le relais (Pompe à eau) :
   - Déclenché si humidité < SEUIL_ARROSAGE (35%).
   - Bloqué automatiquement si la sonde détecte un réservoir vide.
   - Coupure d'urgence instantanée si le réservoir se vide pendant l'arrosage.
4. Envoie les données en temps réel au serveur SeedLab (API REST + WebSocket)
   pour actualiser instantanément le Dashboard web.
5. Mode secours automatique : insertion directe dans MySQL si l'API est injoignable.

Brochage (BCM) :
- DHT22 (Données)       : GPIO 4   (Broche physique 7)
- Sonde niveau d'eau    : GPIO 17  (Broche physique 11)
- Relais pompe à eau    : GPIO 26  (Broche physique 37)
=============================================================================
"""

import sys
import time
from datetime import datetime
import requests

# Imports spécifiques Raspberry Pi
try:
    import RPi.GPIO as GPIO
    import Adafruit_DHT
    HAS_HARDWARE = True
except (ImportError, RuntimeError):
    HAS_HARDWARE = False
    print("⚠️ RPi.GPIO ou Adafruit_DHT non disponible. Mode simulation PC activé.")

# Import optionnel pymysql pour mode secours direct BDD
try:
    import pymysql
    HAS_PYMYSQL = True
except ImportError:
    HAS_PYMYSQL = False


# =============================================================================
# CONFIGURATION
# =============================================================================
# URL du Backend SeedLab :
# - "http://172.16.128.1" pour la production
# - "http://10.0.3.206:5000" pour le dev local sur le PC
BACKEND_URL = "http://172.16.128.1"
API_KEY = "seedlab_rpi_cle_secrete_2026"

# Configuration secours MySQL direct
DB_CONFIG = {
    "host": "172.16.128.1",
    "user": "seeduser",
    "password": "Seedlab2026!",
    "database": "seelab",
    "connect_timeout": 3
}

# Broches matérielles (numérotation BCM)
PIN_DHT = 4
PIN_SONDE_EAU = 17
PIN_RELAIS_POMPE = 26

# Paramètres matériels validés lors des tests
RELAY_ACTIVE_LOW = False          # False = HIGH allume le relais, LOW l'éteint
WATER_DETECTED_LEVEL = 1          # 1 (HIGH) = eau présente, 0 (LOW) = réservoir vide

# Paramètres agronomiques
SEUIL_HUMIDITE_SOL = 35.0         # Humidité minimale requise (%)
DUREE_ARROSAGE_SEC = 4            # Temps d'activation de la pompe (secondes)
DELAI_CYCLE_SEC = 120             # Intervalle entre chaque mesure (2 minutes)


# =============================================================================
# GESTION MATÉRIELLE GPIO
# =============================================================================
def init_gpio():
    """Initialise les broches GPIO de la Raspberry Pi."""
    if not HAS_HARDWARE:
        return
    GPIO.setmode(GPIO.BCM)
    GPIO.setwarnings(False)

    # Relais pompe (Sortie, initialisé à OFF)
    GPIO.setup(PIN_RELAIS_POMPE, GPIO.OUT)
    eteindre_pompe()

    # Sonde de niveau d'eau (Entrée avec résistance de tirage)
    GPIO.setup(PIN_SONDE_EAU, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
    print("🔌 Matériel GPIO initialisé avec succès.")


def eau_disponible() -> bool:
    """Retourne True si le niveau d'eau est suffisant dans le réservoir."""
    if not HAS_HARDWARE:
        return True  # Simulation
    return GPIO.input(PIN_SONDE_EAU) == WATER_DETECTED_LEVEL


def allumer_pompe():
    if HAS_HARDWARE:
        GPIO.output(PIN_RELAIS_POMPE, GPIO.LOW if RELAY_ACTIVE_LOW else GPIO.HIGH)
    print("   [POMPE] 🟢 Activation de la pompe...")


def eteindre_pompe():
    if HAS_HARDWARE:
        GPIO.output(PIN_RELAIS_POMPE, GPIO.HIGH if RELAY_ACTIVE_LOW else GPIO.LOW)
    print("   [POMPE] 🔴 Pompe éteinte.")


def executer_arrosage_securise(duree_sec=DUREE_ARROSAGE_SEC) -> bool:
    """
    Déclenche un cycle d'arrosage sécurisé avec contrôle continu du niveau d'eau.
    Retourne True si l'arrosage a été effectué, False en cas de blocage ou incident.
    """
    # 1. Vérification préalable
    if not eau_disponible():
        print("🚨 SÉCURITÉ : Réservoir d'eau VIDE ! Arrosage impossible pour protéger la pompe.")
        return False

    print(f"💧 Démarrage de l'arrosage sécurisé pour {duree_sec} secondes...")
    allumer_pompe()

    try:
        for s in range(duree_sec, 0, -1):
            time.sleep(1)
            # 2. Vérification continue pendant le pompage
            if not eau_disponible():
                print("\n🚨 ALERTE CRITIQUE : Réservoir vidé en cours d'arrosage !")
                eteindre_pompe()
                print("🛑 Arrêt d'urgence instantané de la pompe.")
                return False
            sys.stdout.write(f"\r   Arrosage en cours... reste {s}s ")
            sys.stdout.flush()
        print()
    finally:
        eteindre_pompe()

    print("✅ Cycle d'arrosage terminé avec succès.")
    return True


# =============================================================================
# COMMUNICATION BACKEND & BDD
# =============================================================================
def envoyer_au_backend(temp, hum, arrosage_effectue) -> bool:
    """Envoie les mesures au backend SeedLab (met à jour BDD et Dashboard WebSocket)."""
    url = f"{BACKEND_URL}/api/capteurs/update"
    payload = {
        "api_key": API_KEY,
        "temperature": temp,
        "humidite": hum,
        "debit_eau": DUREE_ARROSAGE_SEC if arrosage_effectue else 0,
        "luminosite": 150
    }

    try:
        resp = requests.post(url, json=payload, timeout=5)
        if resp.status_code == 200:
            print("📡 Données transmises au Backend et diffusées au Dashboard.")
            return True
        else:
            print(f"⚠️ Réponse inattendue de l'API ({resp.status_code}) : {resp.text}")
            return False
    except Exception as e:
        print(f"⚠️ Échec d'envoi vers l'API ({e}) - Bascule en mode secours MySQL direct...")
        return False


def enregistrer_mysql_secours(temp, hum, etat, date_heure):
    """Enregistre directement dans MySQL si le backend web est temporairement indisponible."""
    if not HAS_PYMYSQL:
        print("❌ pymysql non disponible pour le mode secours.")
        return False

    try:
        conn = pymysql.connect(**DB_CONFIG)
        with conn.cursor() as cursor:
            sql = """
                INSERT INTO plants
                (humidite, luminosite, debit_eau, etat_plants, temperature, date_heure, dernier_arrosage)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (hum, 150, 0, etat, temp, date_heure, 0))
            conn.commit()
            print("💾 Sauvegarde de secours effectuée directement dans MySQL.")
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Erreur MySQL direct : {e}")
        return False


# =============================================================================
# BOUCLE PRINCIPALE DU SERVICE
# =============================================================================
def boucle_principale():
    print("\n" + "=" * 65)
    print("🌱 SEEDLAB - SERVICE OFFICIEL CAPTEURS & ARROSAGE 🌱")
    print(f"Serveur cible   : {BACKEND_URL}")
    print(f"DHT22 Pin       : GPIO {PIN_DHT}")
    print(f"Sonde Eau Pin   : GPIO {PIN_SONDE_EAU}")
    print(f"Relais Pompe    : GPIO {PIN_RELAIS_POMPE}")
    print("=" * 65 + "\n")

    init_gpio()

    while True:
        try:
            print(f"\n--- [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Mesure en cours ---")

            # 1. Lecture de la sonde à eau
            presence_eau = eau_disponible()
            statut_eau = "Niveau OK" if presence_eau else "RÉSERVOIR VIDE"
            print(f"🚰 Sonde réservoir : {statut_eau}")

            # 2. Lecture du capteur DHT22
            humidite, temperature = None, None
            if HAS_HARDWARE:
                humidite, temperature = Adafruit_DHT.read_retry(Adafruit_DHT.DHT22, PIN_DHT)
            else:
                humidite, temperature = 42.0, 22.5  # Simulation

            if humidite is None or temperature is None:
                print("❌ Erreur de lecture du DHT22. Nouvel essai au prochain cycle.")
                time.sleep(10)
                continue

            temperature = round(float(temperature), 1)
            humidite = round(float(humidite), 1)
            print(f"🌡️  Température     : {temperature} °C")
            print(f"💧 Humidité sol    : {humidite} %")

            # 3. Logique d'arrosage automatique
            arrosage_declenche = False
            if humidite < SEUIL_HUMIDITE_SOL:
                print(f"⚠️  Humidité faible ({humidite}% < {SEUIL_HUMIDITE_SOL}%) : Demande d'arrosage.")
                arrosage_declenche = executer_arrosage_securise()
            else:
                print("✅ Humidité optimale, arrosage non requis.")

            # 4. Envoi des données au backend
            date_mesure = datetime.now()
            succes_api = envoyer_au_backend(temperature, humidite, arrosage_declenche)

            # 5. Fallback si backend indisponible
            if not succes_api:
                etat = "arrosage requis" if humidite < SEUIL_HUMIDITE_SOL else "etat ok"
                enregistrer_mysql_secours(temperature, humidite, etat, date_mesure)

        except Exception as e:
            print(f"❌ Erreur inattendue dans la boucle : {e}")

        print(f"⏳ Veille pendant {DELAI_CYCLE_SEC}s avant la prochaine mesure...")
        time.sleep(DELAI_CYCLE_SEC)


if __name__ == "__main__":
    try:
        boucle_principale()
    except KeyboardInterrupt:
        print("\nArrêt du service demandé par l'utilisateur.")
    finally:
        if HAS_HARDWARE:
            eteindre_pompe()
            GPIO.cleanup()
            print("GPIO nettoyés et pompe éteinte.")
