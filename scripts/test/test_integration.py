import requests
import sys
import time

LANDING_API_URL = "https://sbs-landing-api.brainsait-fadil.workers.dev"
PAGES_URL = "https://sbs-landing.pages.dev"

def test_pages_availability():
    print(f"Testing Pages Frontend: {PAGES_URL}")
    try:
        response = requests.get(PAGES_URL, timeout=10)
        if response.status_code == 200:
            print("✅ Pages Frontend is reachable (200 OK)")
        else:
            print(f"❌ Pages Frontend returned {response.status_code}")
    except Exception as e:
        print(f"❌ Pages Frontend check failed: {e}")

def test_api_health():
    url = f"{LANDING_API_URL}/health"
    print(f"Testing API Health: {url}")
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            print("✅ API Health Check passed:", response.json())
        else:
            print(f"❌ API Health returned {response.status_code}: {response.text}")
    except Exception as e:
        print(f"❌ API Health check failed: {e}")

def test_services_integration():
    url = f"{LANDING_API_URL}/api/services/status"
    print(f"Testing Microservices Integration: {url}")
    try:
        response = requests.get(url, timeout=15)
        if response.status_code == 200:
            data = response.json()
            print("✅ Services Status Response received")
            services = data.get('services', [])
            for svc in services:
                status_icon = "✅" if svc.get('status') == 'healthy' else "❌"
                print(f"   {status_icon} {svc.get('service')}: {svc.get('status')}")
                
            # Check specifically for normalizer (which we deployed)
            normalizer = next((s for s in services if s.get('service') == 'normalizer'), None)
            if normalizer and normalizer.get('status') == 'healthy':
                print("✅ Normalizer service is integrated and responding!")
            else:
                print("⚠️ Normalizer service is not healthy or unreachable.")
        else:
            print(f"❌ Services Status returned {response.status_code}: {response.text}")
    except Exception as e:
        print(f"❌ Services integration check failed: {e}")

if __name__ == "__main__":
    print("🚀 Starting Cloudflare Integration Test...\n")
    test_pages_availability()
    print("-" * 30)
    test_api_health()
    print("-" * 30)
    test_services_integration()
    print("\nTest Complete.")
