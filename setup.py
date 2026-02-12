from setuptools import setup, find_packages

setup(
    name="nphies-bridge",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "fastapi==0.128.0",
        "uvicorn[standard]==0.40.0",
        "pydantic==2.12.5",
        "python-dotenv==1.2.1",
        "psycopg2-binary==2.9.11",
        "httpx==0.28.1",
        "requests==2.32.5",
        "prometheus-client==0.24.1",
    ],
    author="BrainSAIT",
    description="NPHIES Bridge for Saudi healthcare integration",
    python_requires=">=3.8",
    entry_points={"console_scripts": ["afham=afham_cli:main"]},
)