# 🌐 DNS Configuration for brainsait.cloud

**Status**: Ready to Configure  
**Target**: brainsait.cloud → 82.25.101.65  
**Service**: SBS Landing Page (Already Running ✅)

---

## 📋 Step-by-Step DNS Configuration

### Go to Hostinger DNS Panel

1. **Login to Hostinger**: https://hpanel.hostinger.com
2. **Navigate to**: Domains → brainsait.cloud → DNS / Name Servers
3. **Add/Modify A Records**

### DNS Records to Set

```
Type: A
Name: @ (or leave blank for root domain)
Points to: 82.25.101.65
TTL: 300 (or 14400)

Type: A  
Name: www
Points to: 82.25.101.65
TTL: 300 (or 14400)
```

### Optional: Remove Conflicting Records

If you see these records pointing to Hostinger IPs, **delete or disable them**:
- A record @ → (Hostinger IP)
- CNAME www → (Hostinger subdomain)

---

## ⏱️ Propagation Time

- **Minimum**: 5 minutes
- **Typical**: 30 minutes  
- **Maximum**: 24-48 hours

### Monitor DNS Propagation

From your local machine:
```bash
# Check DNS resolution
watch -n 10 'host brainsait.cloud'

# When it shows 82.25.101.65, you're ready!
```

Online tools:
- https://dnschecker.org/#A/brainsait.cloud
- https://www.whatsmydns.net/#A/brainsait.cloud

---

## ✅ Verification After DNS Propagates

### From Your Server (or Local Machine)

```bash
# 1. Check DNS resolution
host brainsait.cloud
# Expected: brainsait.cloud has address 82.25.101.65

# 2. Test HTTP → HTTPS redirect
curl -I http://brainsait.cloud
# Expected: 301 Moved Permanently → https://

# 3. Test HTTPS access
curl -I https://brainsait.cloud  
# Expected: HTTP/2 200

# 4. Test health endpoint
curl https://brainsait.cloud/health
# Expected: {"status":"healthy",...}

# 5. Open in browser
firefox https://brainsait.cloud
```

---

## 🚨 Troubleshooting

### Issue: Still seeing Hostinger website

**Solution**: 
- Clear browser cache (Ctrl+Shift+Del)
- Try incognito/private mode
- Wait 5 more minutes for propagation

### Issue: DNS not resolving

**Check**:
```bash
# From server
dig brainsait.cloud +short
nslookup brainsait.cloud
```

### Issue: SSL certificate error

**Solution**: 
```bash
# Traefik will auto-generate Let's Encrypt cert
# Wait 2-3 minutes after DNS propagates
# Check logs: docker logs n8n-traefik-1
```

---

## 📞 When DNS is Ready

After DNS propagates and you can access https://brainsait.cloud:

1. ✅ Test the landing page
2. ✅ Submit a test claim
3. ✅ Verify n8n workflow triggers
4. ✅ Check all services respond

**Next**: See `N8N_WORKFLOWS_COMPLETE_SETUP.md` for workflow creation

---

**Generated**: January 16, 2026  
**Your Server IP**: 82.25.101.65  
**Your Domain**: brainsait.cloud  
**Status**: Service ready, DNS configuration pending  

