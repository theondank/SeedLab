#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
SeedLab - Service d'Écoute et d'Authentification Biométrique (Raspberry Pi)
=============================================================================
Ce service tourne en tâche de fond sur la Raspberry Pi :
1. Il interroge l'API backend (/api/auth/fingerprint/status).
2. Lorsque l'utilisateur clique sur "Connexion par empreinte" sur le site web,
   l'API passe en mode 'scan_required = True'.
3. Le capteur biométrique s'active (LED allumée) et attend la pose du doigt.
4. Dès lecture de l'empreinte, l'ID est envoyé au backend (/api/auth/fingerprint)
   qui connecte instantanément l'utilisateur et redirige le navigateur !

Lancement :
   python3 seedlab_biometrique_service.py
"""

import sys
import time
import json
import requests

# Encodage UTF-8 console
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Configuration Backend
BACKEND_HOST = "10.0.3.206"  # IP de votre PC Windows
BACKEND_PORT = 5000
BASE_URL = f"http://{BACKEND_HOST}:{BACKEND_PORT}"
API_KEY = "seedlab_rpi_cle_secrete_2026"

# Détection du capteur biométrique matériel
HAS_SENSOR = False
finger = None

try:
    import serial
    import adafruit_fingerprint

    # Tentative d'ouverture des ports série usuels sur Raspberry Pi
    ports_to_try = ["/dev/serial0", "/dev/ttyUSB0", "/dev/ttyAMA0"]
    for port in ports_to_try:
        try:
            uart = serial.Serial(port, baudrate=57600, timeout=1)
            f = adafruit_fingerprint.Adafruit_Fingerprint(uart)
            if f.check_module():
                finger = f
                HAS_SENSOR = True
                print(f"🔌 Capteur biométrique détecté et initialisé sur {port} !")
                break
        except Exception:
            continue

    if not HAS_SENSOR:
        print("ℹ️ Module adafruit_fingerprint présent mais aucun capteur détecté sur les ports série.")
        print("   -> Mode interactif actif (vous pouvez taper l'ID de l'empreinte au clavier pour tester).")
except ImportError:
    print("ℹ️ Librairies 'pyserial' ou 'adafruit-circuitpython-fingerprint' non installées.")
    print("   -> Mode interactif console actif.")


def allumer_led(etat=True):
    """Allume ou éteint l'anneau lumineux du capteur si supporté."""
    if HAS_SENSOR and finger:
        try:
            if hasattr(finger, "set_led"):
                finger.set_led(color=1 if etat else 0, mode=1 if etat else 0)
        except Exception:
            pass


def capturer_empreinte_reelle(timeout_secondes=25):
    """Attend et capture une empreinte physique posée sur le capteur."""
    if not HAS_SENSOR or not finger:
        print("❌ [ERREUR] Le capteur d'empreinte matériel n'est pas connecté ou non détecté !")
        print("   Vérifiez que le capteur est bien branché sur le port série (TX/RX ou USB).")
        return None

    print("👉 [CAPTEUR ACTIF] Posez votre doigt sur le lecteur d'empreinte...")
    allumer_led(True)
    debut = time.time()

    while time.time() - debut < timeout_secondes:
        # 1. Attente de la présence d'un doigt
        img_code = finger.get_image()
        if img_code == adafruit_fingerprint.OK:
            print("   📸 Image capturée, analyse des caractéristiques...")
            
            # 2. Conversion image en modèle
            if finger.image_2_tz(1) != adafruit_fingerprint.OK:
                print("   ⚠️ Image floue, replacez votre doigt...")
                time.sleep(0.5)
                continue

            # 3. Recherche de correspondance dans la mémoire du capteur
            if finger.finger_search() == adafruit_fingerprint.OK:
                print(f"   🎉 Correspondance trouvée ! ID: {finger.finger_id} (Confiance: {finger.confidence})")
                allumer_led(False)
                return finger.finger_id
            else:
                print("   ❌ Empreinte inconnue ou non enregistrée dans le capteur.")
                time.sleep(1)

        time.sleep(0.2)

    allumer_led(False)
    print("⏱️ Temps écoulé (timeout) sans détection de doigt.")
    return None


def envoyer_authentification(fingerprint_id):
    """Envoie l'ID d'empreinte reconnue au serveur backend."""
    url = f"{BASE_URL}/api/auth/fingerprint"
    payload = {
        "api_key": API_KEY,
        "fingerprint_id": fingerprint_id
    }
    try:
        resp = requests.post(url, json=payload, timeout=3)
        data = resp.json()
        if resp.status_code == 200 and data.get("success"):
            user = data.get("user", {})
            print(f"🟢 Authentification réussie pour {user.get('name')} ({user.get('email')}) !")
            print("   -> L'interface Web de la serre a été connectée.")
            return True
        else:
            print(f"🔴 Échec d'authentification : {data.get('message')}")
            return False
    except Exception as e:
        print(f"❌ Erreur réseau lors de l'envoi au backend : {e}")
        return False


def main():
    print("\n🌱 SEEDLAB - SERVICE DE LECTURE BIOMÉTRIQUE EN ARRIÈRE-PLAN 🌱")
    print(f"Connecté au backend : {BASE_URL}")
    print("En écoute des demandes de connexion depuis le site web...\n")

    while True:
        try:
            # 1. Vérifier si le site web attend une empreinte
            status_url = f"{BASE_URL}/api/auth/fingerprint/status"
            resp = requests.get(status_url, timeout=2)
            
            if resp.status_code == 200:
                data = resp.json()
                
                # Si scan_required est True : un utilisateur a cliqué sur le bouton !
                if data.get("scan_required"):
                    print("\n🔔 [DEMANDE DU SITE WEB] Un utilisateur demande à se connecter par empreinte !")
                    
                    # Capture physique
                    finger_id = capturer_empreinte_reelle(timeout_secondes=25)
                    
                    if finger_id is not None:
                        envoyer_authentification(finger_id)
                    
                    # Pause pour éviter de re-déclencher immédiatement
                    time.sleep(3)

            time.sleep(1)

        except requests.exceptions.RequestException:
            # En cas de coupure temporaire du backend, réessayer doucement
            time.sleep(3)
        except KeyboardInterrupt:
            print("\n🛑 Arrêt du service biométrique.")
            allumer_led(False)
            break


if __name__ == "__main__":
    main()
