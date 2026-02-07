# 🔐 Tailscale Setup Guide for SBS Server

## Overview

Tailscale provides secure, encrypted networking for your SBS infrastructure.

## Quick Setup

### Step 1: Start Tailscale

```bash
sudo tailscale up
```

This will output an authentication URL like:
```
To authenticate, visit:

  https://login.tailscale.com/a/XXXXXXXX
```

### Step 2: Authenticate

1. Open the URL in your browser
2. Sign in with your Tailscale account (or create one)
3. Approve the device

### Step 3: Verify Connection

```bash
# Check status
tailscale status

# Get your Tailscale IP
tailscale ip

# List all devices in your network
tailscale status
```

---

## Advanced Configuration

### Enable Exit Node (Optional)

Allow this server to route traffic for other devices:

```bash
sudo tailscale up --advertise-exit-node
```

### Set DNS Name

```bash
sudo tailscale up --hostname=sbs-production
```

### Enable HTTPS Certificates

Tailscale can provide automatic HTTPS certificates:

```bash
sudo tailscale cert sbs-production.YOUR-TAILNET.ts.net
```

---

## SBS Services via Tailscale

Once connected, you can access SBS services via Tailscale IP:

```bash
# Get your Tailscale IP
TAILSCALE_IP=$(tailscale ip -4)

# Access services
echo "Normalizer:      http://$TAILSCALE_IP:8000"
echo "Signer:          http://$TAILSCALE_IP:8001"
echo "Financial Rules: http://$TAILSCALE_IP:8002"
echo "NPHIES Bridge:   http://$TAILSCALE_IP:8003"
echo "Eligibility:     http://$TAILSCALE_IP:8004"
echo "AI Gateway:      http://$TAILSCALE_IP:8010"
echo "Landing Page:    http://$TAILSCALE_IP:3000"
```

---

## Firewall Configuration

If using UFW, allow Tailscale:

```bash
sudo ufw allow in on tailscale0
```

---

## Monitoring

### Check Connection Status

```bash
tailscale status
```

### View Logs

```bash
sudo journalctl -u tailscaled -f
```

### Ping Another Device

```bash
tailscale ping DEVICE-NAME
```

---

## Security Best Practices

1. **Enable MagicDNS** - Use device names instead of IPs
2. **Use ACLs** - Control access between devices
3. **Enable Key Expiry** - Rotate keys regularly
4. **Subnet Routes** - Only advertise necessary subnets

---

## Useful Commands

```bash
# Show status
tailscale status

# Show IP addresses
tailscale ip

# Show network map
tailscale netcheck

# Disconnect
tailscale down

# Reconnect
tailscale up

# Show logs
tailscale bugreport
```

---

## Integration with SBS Landing

Update `.env` to use Tailscale IPs for internal service communication:

```bash
# If accessing from other Tailscale devices
SBS_NORMALIZER_URL=http://YOUR_TAILSCALE_IP:8000
SBS_SIGNER_URL=http://YOUR_TAILSCALE_IP:8001
SBS_FINANCIAL_RULES_URL=http://YOUR_TAILSCALE_IP:8002
SBS_NPHIES_BRIDGE_URL=http://YOUR_TAILSCALE_IP:8003

# Optional services
SBS_ELIGIBILITY_URL=http://YOUR_TAILSCALE_IP:8004

# Optional copilot gateway (only if you run ai-gateway)
# Used by normalizer-service when AI_COPILOT_URL is configured
AI_COPILOT_URL=http://YOUR_TAILSCALE_IP:8010/chat
```

---

**Status**: ✅ Tailscale installed and ready  
**Version**: 1.92.5  
**Next Step**: Run `sudo tailscale up` to connect
