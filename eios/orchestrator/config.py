import os

KAFKA_ADDR = os.getenv("KAFKA_ADDR", "kafka:9092")
INCIDENTS_TOPIC = os.getenv("EIOS_INCIDENTS_TOPIC", "eios.incidents")
CONSUMER_GROUP = os.getenv("EIOS_ORCH_GROUP", "eios-orchestrator")

POSTGRES_DSN = os.getenv(
    "EIOS_POSTGRES_DSN", "postgresql://eios:eios@eios-postgres:5432/eios"
)

FLAGD_UI_URL = os.getenv("FLAGD_UI_URL", "http://127.0.0.1:8080/feature")
LOG_LEVEL = os.getenv("EIOS_LOG_LEVEL", "INFO")
