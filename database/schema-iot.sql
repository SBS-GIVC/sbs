-- ============================================================================
-- IoT Events Schema Extension for SBS Integration Engine
-- ============================================================================

-- 11. IoT Device Registry
CREATE TABLE IF NOT EXISTS iot_devices (
    device_id SERIAL PRIMARY KEY,
    node_id VARCHAR(50) UNIQUE NOT NULL,
    device_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50) CHECK (device_type IN ('arduino', 'esp32', 'raspberry_pi', 'sensor', 'gateway', 'other')),
    facility_id INT REFERENCES facilities(facility_id),
    location VARCHAR(255),
    api_token_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_heartbeat TIMESTAMP,
    firmware_version VARCHAR(50),
    ip_address INET,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_iot_device_node ON iot_devices(node_id);
CREATE INDEX IF NOT EXISTS idx_iot_device_facility ON iot_devices(facility_id, is_active);

-- 12. IoT Events (Time-Series Storage)
CREATE TABLE IF NOT EXISTS iot_events (
    event_id BIGSERIAL PRIMARY KEY,
    event_uuid UUID DEFAULT gen_random_uuid(),
    node_id VARCHAR(50) NOT NULL,
    device_id INT REFERENCES iot_devices(device_id),
    facility_code VARCHAR(50),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('heartbeat', 'telemetry', 'alert', 'status', 'error', 'config', 'command_response')),
    payload JSONB NOT NULL DEFAULT '{}',
    device_ts BIGINT,
    gateway_ts DOUBLE PRECISION,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP,
    source_ip INET,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_iot_events_node ON iot_events(node_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_iot_events_type ON iot_events(event_type, received_at DESC);

-- 13. IoT Alert Rules
CREATE TABLE IF NOT EXISTS iot_alert_rules (
    rule_id SERIAL PRIMARY KEY,
    rule_name VARCHAR(255) NOT NULL,
    node_id VARCHAR(50),
    facility_id INT REFERENCES facilities(facility_id),
    metric_path VARCHAR(255) NOT NULL,
    operator VARCHAR(20) NOT NULL CHECK (operator IN ('gt', 'gte', 'lt', 'lte', 'eq', 'ne', 'contains')),
    threshold_value TEXT NOT NULL,
    alert_severity VARCHAR(20) CHECK (alert_severity IN ('info', 'warning', 'critical', 'emergency')),
    notification_channel VARCHAR(50),
    notification_target TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    cooldown_seconds INT DEFAULT 300,
    last_triggered_at TIMESTAMP,
    trigger_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. IoT Alert History
CREATE TABLE IF NOT EXISTS iot_alert_history (
    alert_id BIGSERIAL PRIMARY KEY,
    rule_id INT REFERENCES iot_alert_rules(rule_id),
    event_id BIGINT REFERENCES iot_events(event_id),
    node_id VARCHAR(50) NOT NULL,
    alert_severity VARCHAR(20),
    alert_message TEXT,
    metric_value TEXT,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_iot_alert_history_node ON iot_alert_history(node_id, created_at DESC);

-- Sample IoT Data
INSERT INTO iot_devices (node_id, device_name, device_type, facility_id, location) VALUES
('BS-EDGE-001', 'Main Lobby Temperature Sensor', 'arduino', 1, 'Building A - Main Lobby'),
('BS-EDGE-002', 'ICU Patient Monitor Gateway', 'esp32', 1, 'ICU Ward - Room 101')
ON CONFLICT (node_id) DO NOTHING;

-- Sample alert rules
INSERT INTO iot_alert_rules (rule_name, metric_path, operator, threshold_value, alert_severity, notification_channel) VALUES
('High Temperature Alert', 'data.temperature', 'gt', '30', 'warning', 'email'),
('Critical Temperature Alert', 'data.temperature', 'gt', '40', 'critical', 'sms')
ON CONFLICT DO NOTHING;
