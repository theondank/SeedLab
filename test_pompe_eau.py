import time
import RPi.GPIO as GPIO

# =============================================================================
# CONFIGURATION
# =============================================================================
RELAY_PIN = 26       # Numéro BCM (broche physique 37)
DUREE_TEST = 3       # Durée en secondes

# La plupart des modules relais sont "Active LOW" (0V = allumé, 3.3V = éteint).
# Si votre relais fonctionne à l'envers, passez cette valeur à False.
ACTIVE_LOW = True
# =============================================================================

def allumer_pompe():
    GPIO.output(RELAY_PIN, GPIO.LOW if ACTIVE_LOW else GPIO.HIGH)
    print("🟢 POMPE ACTIVÉE (Relais fermé)")

def eteindre_pompe():
    GPIO.output(RELAY_PIN, GPIO.HIGH if ACTIVE_LOW else GPIO.LOW)
    print("🔴 POMPE COUPÉE (Relais ouvert)")

try:
    # Initialisation
    GPIO.setmode(GPIO.BCM)
    GPIO.setwarnings(False)
    GPIO.setup(RELAY_PIN, GPIO.OUT)
    
    # S'assurer que la pompe démarre éteinte
    eteindre_pompe()
    time.sleep(1)

    print(f"--- Démarrage du test de la pompe ({DUREE_TEST}s) ---")
    allumer_pompe()
    time.sleep(DUREE_TEST)
    eteindre_pompe()
    print("--- Test terminé avec succès ! ---")

except KeyboardInterrupt:
    print("\nArrêt forcé par l'utilisateur.")
finally:
    eteindre_pompe()
    GPIO.cleanup()
    print("GPIO nettoyés.")
