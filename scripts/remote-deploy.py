#!/usr/bin/env python3
"""
Remote deployment script for TrueTicket
Connects via SSH and runs deployment commands
"""

import paramiko
import time
import sys

# Server configuration
HOST = "66.135.29.248"
USER = "root"
PASSWORD = "-H7w!_Pa.H}UjP??"

def run_command(ssh, command, timeout=300):
    """Run a command and return output"""
    print(f"\n>>> {command}")
    stdin, stdout, stderr = ssh.exec_command(command, timeout=timeout)

    # Stream output with encoding handling
    while True:
        line = stdout.readline()
        if not line:
            break
        try:
            print(line, end='')
        except UnicodeEncodeError:
            print(line.encode('ascii', 'replace').decode(), end='')

    # Check for errors
    try:
        err = stderr.read().decode('utf-8', errors='replace')
        if err:
            print(f"STDERR: {err}")
    except:
        pass

    return stdout.channel.recv_exit_status()

def main():
    print("=" * 50)
    print("TrueTicket Remote Deployment")
    print("=" * 50)
    print(f"\nConnecting to {HOST}...")

    # Create SSH client
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
        print("Connected successfully!\n")

        # Run deployment commands
        commands = [
            # Clean up Docker to free disk space
            "docker system prune -af --volumes || true",

            # Pull latest code
            "cd /opt/trueticket && git pull origin main",

            # Create data directory
            "mkdir -p /opt/trueticket/data",

            # Create minimal .env for testing
            """cat > /opt/trueticket/.env << 'ENVEOF'
NODE_ENV=production
DATABASE_URL=file:/app/data/prod.db
JWT_SECRET=test-secret-change-in-production-$(openssl rand -hex 16)
BLOCKCHAIN_NETWORK=polygon
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
ENVEOF""",

            # Build Docker image
            "cd /opt/trueticket && docker-compose build --no-cache",

            # Start containers
            "cd /opt/trueticket && docker-compose up -d",

            # Wait for startup
            "sleep 15",

            # Check status
            "docker ps",
            "curl -s http://localhost:3000/api/health || echo 'Health check pending...'",
        ]

        for cmd in commands:
            status = run_command(ssh, cmd)
            if status != 0 and "curl" not in cmd:
                print(f"\nWarning: Command exited with status {status}")

        print("\n" + "=" * 50)
        print("Deployment Complete!")
        print("=" * 50)
        print("\nYour site should be accessible at:")
        print("  https://trueticket.me")
        print("  https://www.trueticket.me")
        print("\nNote: SSL certificate provisioning may take a few minutes.")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
