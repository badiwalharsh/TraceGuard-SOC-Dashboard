import test from 'node:test';
import assert from 'node:assert';
import { parseAlerts } from '../../src/lib/parser';

test('Alert Ingestion Parser', async (t) => {
  await t.test('should safely parse a valid JSON alert list', () => {
    const validJSON = JSON.stringify([
      {
        timestamp: '2026-08-30T10:15:30Z',
        ruleName: 'SQL Injection Detected',
        category: 'Initial Access',
        severity: 'HIGH',
        sourceIp: '192.168.1.45',
        destIp: '10.0.4.15',
        targetHost: 'prod-db-01',
        details: 'SELECT * FROM users',
        mitreAttack: 'T1190'
      }
    ]);

    const result = parseAlerts(validJSON, 'json');
    assert.strictEqual(result.errors.length, 0);
    assert.strictEqual(result.alerts.length, 1);
    assert.strictEqual(result.alerts[0].ruleName, 'SQL Injection Detected');
    assert.strictEqual(result.alerts[0].severity, 'HIGH');
  });

  await t.test('should capture validation errors on invalid JSON fields', () => {
    const invalidJSON = JSON.stringify([
      {
        timestamp: 'invalid-date',
        ruleName: '', // empty name (invalid)
        category: 'Initial Access',
        severity: 'VERY_HIGH', // invalid enum severity
        sourceIp: 'invalid-ip',
        details: 'Short'
      }
    ]);

    const result = parseAlerts(invalidJSON, 'json');
    assert.ok(result.errors.length > 0);
    assert.strictEqual(result.alerts.length, 0);
  });

  await t.test('should safely parse a valid CSV alert list', () => {
    const validCSV = `timestamp,ruleName,category,severity,sourceIp,destIp,targetHost,details,mitreAttack
2026-08-30T10:18:22Z,Egress Ransomware,Command and Control,CRITICAL,10.0.5.22,185.220.101.42,finance-srv,LockBit beaconing,T1071.001`;

    const result = parseAlerts(validCSV, 'csv');
    assert.strictEqual(result.errors.length, 0);
    assert.strictEqual(result.alerts.length, 1);
    assert.strictEqual(result.alerts[0].ruleName, 'Egress Ransomware');
    assert.strictEqual(result.alerts[0].severity, 'CRITICAL');
  });

  await t.test('should sanitize CSV injection formula payloads', () => {
    const maliciousCSV = `timestamp,ruleName,category,severity,sourceIp,destIp,targetHost,details,mitreAttack
2026-08-30T10:18:22Z,=SUM(A1:A5),Command and Control,MEDIUM,10.0.5.22,10.0.5.1,finance-srv,Details,T1071.001`;

    const result = parseAlerts(maliciousCSV, 'csv');
    assert.strictEqual(result.errors.length, 0);
    assert.strictEqual(result.alerts.length, 1);
    // Formula character "=" must be escaped/sanitized to prevent CSV injection
    assert.ok(result.alerts[0].ruleName.startsWith("'"));
  });
});
