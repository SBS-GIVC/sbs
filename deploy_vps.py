
import paramiko
import os
import sys

HOSTNAME = "82.25.101.65"
USERNAME = "root"
PASSWORD = "Fadil12345678#"
LOCAL_DIR = "./"
REMOTE_DIR = "/root/sbs"

def run_command(client, command):
    print(f"Running: {command}")
    stdin, stdout, stderr = client.exec_command(command)
    exit_status = stdout.channel.recv_exit_status()
    if exit_status == 0:
        print(stdout.read().decode())
        return True
    else:
        print(stderr.read().decode())
        return False

def deploy(client):
    try:
        # Create remote directory
        run_command(client, f"mkdir -p {REMOTE_DIR}")

        sftp = client.open_sftp()

        # Files to upload
        files_to_upload = [
            "docker-compose.yml",
            ".env",
            "nginx.conf", 
            # Add other necessary files and directories recursively if needed
            # For simplicity, let's assume we want to sync the project structure
            # but maybe we should zip it locally first and unzip remotely.
        ]
        
        # Or simpler:
        # Zip locally.
        os.system("tar --exclude='node_modules' --exclude='.venv' --exclude='.git' --exclude='deployment.tar.gz' -czf deployment.tar.gz .")
        
        print("Uploading deployment.tar.gz...")
        sftp.put("deployment.tar.gz", f"{REMOTE_DIR}/deployment.tar.gz")
        
        print("Extracting remotely...")
        run_command(client, f"cd {REMOTE_DIR} && tar -xzf deployment.tar.gz")
        
        print("Stopping existing containers...")
        run_command(client, f"cd {REMOTE_DIR} && docker compose down --remove-orphans || true")
        # Aggressively remove all possible containers to ensure clean state
        run_command(client, f"docker rm -f sbs-postgres sbs-normalizer sbs-financial-rules sbs-signer sbs-nphies-bridge sbs-n8n sbs-landing sbs-pgadmin || true")

        print("Building and starting containers...")
        success = run_command(client, f"cd {REMOTE_DIR} && docker compose up --build -d")
        
        if success:
            print("Deployment successful!")
        else:
            print("Deployment failed during docker compose.")

        sftp.close()
    except Exception as e:
        print(f"Error during deployment: {e}")

def configure_dns(client):
    # This part is tricky as DNS usually configured at Registrar (Hostinger panel/Cloudflare dashboard), not on the server.
    # But maybe user meant 'configure nginx/traefik' for the domain?
    # Or maybe checking /etc/hosts?
    print("Checking hostname configuration...")
    run_command(client, "hostnamectl set-hostname brainsait.cloud")
    # run_command(client, "echo '127.0.0.1 brainsait.cloud' >> /etc/hosts")

if __name__ == "__main__":
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        print(f"Connecting to {HOSTNAME}...")
        client.connect(HOSTNAME, username=USERNAME, password=PASSWORD)
        
        print("Checking Docker installation...")
        if not run_command(client, "docker --version"):
             print("Docker not found. Installing...")
             run_command(client, "curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh")

        deploy(client)
        configure_dns(client)
        
        client.close()
    except Exception as e:
        print(f"Connection failed: {e}")
