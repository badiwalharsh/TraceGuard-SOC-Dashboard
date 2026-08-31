import { db } from '../src/prisma/db';
import bcryptjs from 'bcryptjs';

async function main() {
  const auditLogsToDelete = await db.orm.public.AuditLog.all();
  for (const log of auditLogsToDelete) {
    await db.orm.public.AuditLog.where({ id: log.id }).delete();
  }

  const eventsToDelete = await db.orm.public.SecurityEvent.all();
  for (const event of eventsToDelete) {
    await db.orm.public.SecurityEvent.where({ id: event.id }).delete();
  }

  const notesToDelete = await db.orm.public.Note.all();
  for (const note of notesToDelete) {
    await db.orm.public.Note.where({ id: note.id }).delete();
  }

  const timelineToDelete = await db.orm.public.EventTimeline.all();
  for (const event of timelineToDelete) {
    await db.orm.public.EventTimeline.where({ id: event.id }).delete();
  }

  const incidentAssetsToDelete = await db.orm.public.IncidentAsset.all();
  for (const ia of incidentAssetsToDelete) {
    await db.orm.public.IncidentAsset.where({ incidentId: ia.incidentId, assetId: ia.assetId }).delete();
  }

  const incidentsToDelete = await db.orm.public.Incident.all();
  for (const inc of incidentsToDelete) {
    await db.orm.public.Incident.where({ id: inc.id }).delete();
  }

  const rulesToDelete = await db.orm.public.DetectionRule.all();
  for (const rule of rulesToDelete) {
    await db.orm.public.DetectionRule.where({ id: rule.id }).delete();
  }

  const assetsToDelete = await db.orm.public.Asset.all();
  for (const asset of assetsToDelete) {
    await db.orm.public.Asset.where({ id: asset.id }).delete();
  }

  const sessionsToDelete = await db.orm.public.Session.all();
  for (const session of sessionsToDelete) {
    await db.orm.public.Session.where({ id: session.id }).delete();
  }

  const usersToDelete = await db.orm.public.User.all();
  for (const user of usersToDelete) {
    await db.orm.public.User.where({ id: user.id }).delete();
  }

  console.log('Seeding Users...');
  const adminPasswordHash = await bcryptjs.hash('AdminPassword2026!', 10);
  const analystPasswordHash = await bcryptjs.hash('AnalystPassword2026!', 10);

  const adminId = 'u-admin-uuid';
  const analystId = 'u-analyst-uuid';

  await db.orm.public.User.create({
    id: adminId,
    username: 'admin',
    email: 'admin@traceguard.local',
    passwordHash: adminPasswordHash,
    name: 'TraceGuard Admin',
    role: 'ADMIN',
    createdAt: new Date().toISOString(),
  });

  await db.orm.public.User.create({
    id: analystId,
    username: 'analyst',
    email: 'analyst@traceguard.local',
    passwordHash: analystPasswordHash,
    name: 'SOC Analyst Alice',
    role: 'ANALYST',
    createdAt: new Date().toISOString(),
  });

  console.log('Seeding Assets...');
  const asset1 = { id: 'a1', hostname: 'finance-srv-02', ipAddress: '10.0.5.22', assetType: 'SERVER' as const, owner: 'Finance IT', criticality: 'HIGH' as const, os: 'Windows Server 2019', location: 'Finance Secure Zone' };
  const asset2 = { id: 'a2', hostname: 'web-server-pub', ipAddress: '10.0.1.10', assetType: 'SERVER' as const, owner: 'DevOps Team', criticality: 'HIGH' as const, os: 'Ubuntu 22.04', location: 'Public DMZ' };
  const asset3 = { id: 'a3', hostname: 'domain-controller-01', ipAddress: '10.0.2.5', assetType: 'SERVER' as const, owner: 'IT Ops', criticality: 'CRITICAL' as const, os: 'Windows Server 2022', location: 'Core AD Zone' };
  const asset4 = { id: 'a4', hostname: 'prod-db-01', ipAddress: '10.0.4.15', assetType: 'DATABASE' as const, owner: 'DB Admin', criticality: 'CRITICAL' as const, os: 'RHEL 9', location: 'Secure DB Zone' };
  const asset5 = { id: 'a5', hostname: 'workstation-alice', ipAddress: '192.168.10.45', assetType: 'WORKSTATION' as const, owner: 'Alice Smith (Finance)', criticality: 'MEDIUM' as const, os: 'Windows 11', location: 'HQ Office' };
  const asset6 = { id: 'a6', hostname: 'workstation-bob', ipAddress: '192.168.10.52', assetType: 'WORKSTATION' as const, owner: 'Bob Jones (Research)', criticality: 'MEDIUM' as const, os: 'Windows 11', location: 'HQ Office' };
  const asset7 = { id: 'a7', hostname: 'research-workstation-05', ipAddress: '192.168.20.105', assetType: 'WORKSTATION' as const, owner: 'Research Team', criticality: 'HIGH' as const, os: 'AlmaLinux 9', location: 'R&D Lab' };
  const asset8 = { id: 'a8', hostname: 'developer-vm-03', ipAddress: '10.0.12.80', assetType: 'CLOUD_VM' as const, owner: 'Dev Team', criticality: 'MEDIUM' as const, os: 'Debian 12', location: 'AWS Dev VPC' };

  const assets = [asset1, asset2, asset3, asset4, asset5, asset6, asset7, asset8];
  for (const asset of assets) {
    await db.orm.public.Asset.create({
      ...asset,
      createdAt: new Date().toISOString(),
    });
  }

  console.log('Seeding Detection Rules...');
  const rules = [
    { id: 'r1', name: 'Egress Ransomware C2 Communication', description: 'Internal server making rapid HTTPS requests to dynamic DNS servers with high payload sizes. Associated with LockBit ransomware behaviors.', severity: 'HIGH' as const, category: 'Command and Control', mitreAttack: 'T1071.001', query: 'dns_query_log | where query_len > 120 | count_by host > 100/min', enabled: true },
    { id: 'r2', name: 'SSH Brute Force Attacks on Public Webserver', description: 'Multiple failed login attempts within a short timeframe from a single external IP targeting SSH services.', severity: 'MEDIUM' as const, category: 'Credential Access', mitreAttack: 'T1110.001', query: 'auth_log | where service == "ssh" and status == "failed" | count_by source_ip > 50/min', enabled: true },
    { id: 'r3', name: 'Unauthorized Admin Group Membership Change', description: 'Addition of user accounts to administrative or privileged groups during off-hours or outside of change management workflows.', severity: 'CRITICAL' as const, category: 'Persistence', mitreAttack: 'T1078.002', query: 'win_event_log | where event_id == 4728 or event_id == 4732', enabled: true },
    { id: 'r4', name: 'Web Application SQL Injection Triggered', description: 'Incoming HTTP requests containing SQL injection vectors targeting public application endpoints.', severity: 'HIGH' as const, category: 'Initial Access', mitreAttack: 'T1190', query: 'waf_log | where request_uri matches "SELECT|UNION|INSERT|OR 1=1"', enabled: true },
    { id: 'r5', name: 'Corporate Workstation Navigated to Phishing Link', description: 'Internal hosts making HTTP/S requests to known malicious phishing domains or newly registered support domains.', severity: 'MEDIUM' as const, category: 'Initial Access', mitreAttack: 'T1566.002', query: 'proxy_log | where category == "phishing" or domain matches "micros0ft-login"', enabled: true },
    { id: 'r6', name: 'Exfiltration via DNS Tunneling', description: 'Unusually large sub-domain strings in DNS query payloads formatting data to be exfiltrated out of the network.', severity: 'HIGH' as const, category: 'Exfiltration', mitreAttack: 'T1048.003', query: 'dns_log | where length(subdomain) > 60 | group_by host | sum(bytes_out) > 5MB', enabled: true },
    { id: 'r7', name: 'Unsigned Binary Scheduled Task', description: 'A scheduled task registered in Windows Task Scheduler invoking an unsigned executable file residing in standard user directories.', severity: 'LOW' as const, category: 'Execution', mitreAttack: 'T1053.005', query: 'win_event_log | where event_id == 106 and task_path matches "Temp|AppData"', enabled: true },
    { id: 'r8', name: 'MFA Push Notification Spamming', description: 'High frequency of MFA push notifications sent to a user account, attempting to force the user to approve the login request.', severity: 'HIGH' as const, category: 'Credential Access', mitreAttack: 'T1621', query: 'mfa_audit_log | where status == "denied" or status == "pending" | count_by username > 10/3min', enabled: true },
  ];

  for (const rule of rules) {
    await db.orm.public.DetectionRule.create({
      ...rule,
      createdAt: new Date().toISOString(),
    });
  }

  console.log('Seeding Incidents...');
  const incidents = [
    {
      id: 'inc-1',
      title: 'Egress Ransomware C2 Beaconing Detected',
      description: 'The server finance-srv-02 (10.0.5.22) is communicating with a known LockBit command and control IP address. High volume encrypted data transfer occurred outside operational hours.',
      status: 'INVESTIGATING' as const,
      severity: 'HIGH' as const,
      category: 'Command and Control',
      sourceIp: '10.0.5.22',
      destIp: '185.220.101.42',
      ruleId: 'r1',
      assignedToId: analystId,
    },
    {
      id: 'inc-2',
      title: 'Active SSH Brute Force Attacks',
      description: 'Host web-server-pub (10.0.1.10) is experiencing ongoing SSH brute force login attempts from IP 203.0.113.19. Over 150 failures detected targeting the root user.',
      status: 'NEW' as const,
      severity: 'MEDIUM' as const,
      category: 'Credential Access',
      sourceIp: '203.0.113.19',
      destIp: '10.0.1.10',
      ruleId: 'r2',
      assignedToId: null,
    },
    {
      id: 'inc-3',
      title: 'Privileged Group Membership Change (Domain Admins)',
      description: 'Account "b.smith" was added to the "Domain Admins" active directory group by "j.jones". This action was not approved in the change control system and occurred at 02:45 AM.',
      status: 'OPEN' as const,
      severity: 'CRITICAL' as const,
      category: 'Persistence',
      sourceIp: '10.0.2.11',
      destIp: '10.0.2.5',
      ruleId: 'r3',
      assignedToId: adminId,
    },
    {
      id: 'inc-4',
      title: 'WAF Blocked SQL Injection Attempt',
      description: 'The database frontend prod-db-01 (10.0.4.15) was target of a series of SQL Injection vectors originating from an external proxy IP. The web application firewall dropped the traffic.',
      status: 'RESOLVED' as const,
      severity: 'HIGH' as const,
      category: 'Initial Access',
      sourceIp: '198.51.100.42',
      destIp: '10.0.4.15',
      ruleId: 'r4',
      assignedToId: analystId,
    },
    {
      id: 'inc-5',
      title: 'Phishing Redirect Link Navigated',
      description: 'Workstation workstation-alice (192.168.10.45) logged a proxy DNS request for "micros0ft-login-support.com". Security agent flagged a potential credential harvesting submission.',
      status: 'CONTAINED' as const,
      severity: 'MEDIUM' as const,
      category: 'Initial Access',
      sourceIp: '192.168.10.45',
      destIp: '185.199.110.153',
      ruleId: 'r5',
      assignedToId: analystId,
    },
    {
      id: 'inc-6',
      title: 'DNS Tunneling Data Exfiltration',
      description: 'Research workstation (192.168.20.105) has queries containing base64 data strings formatted as subdomains sent to an unauthorized registrar. Possible data theft vector.',
      status: 'OPEN' as const,
      severity: 'HIGH' as const,
      category: 'Exfiltration',
      sourceIp: '192.168.20.105',
      destIp: '8.8.8.8',
      ruleId: 'r6',
      assignedToId: null,
    },
    {
      id: 'inc-7',
      title: 'Suspicious Scheduled Task Created',
      description: 'Host workstation-bob (192.168.10.52) reported creation of an unsigned binary running out of %TEMP% directory named "SystemUpdate".',
      status: 'NEW' as const,
      severity: 'LOW' as const,
      category: 'Execution',
      sourceIp: '192.168.10.52',
      destIp: null,
      ruleId: 'r7',
      assignedToId: null,
    },
    {
      id: 'inc-8',
      title: 'MFA Push Fatigue Compromise Risk',
      description: 'User "dev-user" on developer-vm-03 (10.0.12.80) triggered 12 MFA prompt requests inside 3 minutes. The user denied 11 push notifications but accepted the 12th.',
      status: 'INVESTIGATING' as const,
      severity: 'HIGH' as const,
      category: 'Credential Access',
      sourceIp: '198.51.100.88',
      destIp: '10.0.12.80',
      ruleId: 'r8',
      assignedToId: analystId,
    },
  ];

  for (const incident of incidents) {
    await db.orm.public.Incident.create({
      ...incident,
      createdAt: new Date(Date.now() - 3600000 * incidents.indexOf(incident)).toISOString(), // staggered dates
    });
  }

  console.log('Seeding Join Table IncidentAsset relations...');
  const incidentAssets = [
    { incidentId: 'inc-1', assetId: 'a1' },
    { incidentId: 'inc-2', assetId: 'a2' },
    { incidentId: 'inc-3', assetId: 'a3' },
    { incidentId: 'inc-4', assetId: 'a4' },
    { incidentId: 'inc-5', assetId: 'a5' },
    { incidentId: 'inc-6', assetId: 'a7' },
    { incidentId: 'inc-7', assetId: 'a6' },
    { incidentId: 'inc-8', assetId: 'a8' },
  ];

  for (const relation of incidentAssets) {
    await db.orm.public.IncidentAsset.create(relation);
  }

  console.log('Seeding Event Timeline...');
  const timelineEvents = [
    // Incident 1 Timeline
    { id: 't1', incidentId: 'inc-1', eventTime: new Date(Date.now() - 100000).toISOString(), title: 'C2 Beacon Alert Triggered', description: 'Network monitor flagged high data volume to IP 185.220.101.42', source: 'System' },
    { id: 't2', incidentId: 'inc-1', eventTime: new Date(Date.now() - 80000).toISOString(), title: 'Analyst Claimed Incident', description: 'Analyst Alice assigned incident to herself for triage.', source: 'AnalystNote' },
    // Incident 2 Timeline
    { id: 't3', incidentId: 'inc-2', eventTime: new Date(Date.now() - 120000).toISOString(), title: 'SSH Authentication Failures', description: '150 authentication failures occurred on port 22.', source: 'System' },
    // Incident 3 Timeline
    { id: 't4', incidentId: 'inc-3', eventTime: new Date(Date.now() - 200000).toISOString(), title: 'Security Event 4728', description: 'User added to domain admins group in Active Directory.', source: 'System' },
    { id: 't5', incidentId: 'inc-3', eventTime: new Date(Date.now() - 180000).toISOString(), title: 'Assigned to Administrator', description: 'Incident escalated to SOC Admin.', source: 'System' },
    // Incident 4 Timeline
    { id: 't6', incidentId: 'inc-4', eventTime: new Date(Date.now() - 300000).toISOString(), title: 'WAF Rule Blocked SQLi', description: 'Blocked single quote bypass on customer login portal.', source: 'System' },
    { id: 't7', incidentId: 'inc-4', eventTime: new Date(Date.now() - 150000).toISOString(), title: 'Status Closed', description: 'Analyst marked the threat as contained and resolved.', source: 'StatusChange' },
    // Incident 8 Timeline
    { id: 't8', incidentId: 'inc-8', eventTime: new Date(Date.now() - 60000).toISOString(), title: 'MFA Spam Started', description: 'MFA push request storm initiated from unexpected geolocation.', source: 'System' },
    { id: 't9', incidentId: 'inc-8', eventTime: new Date(Date.now() - 40000).toISOString(), title: 'Successful MFA Approval', description: 'Session initialized after approval on push prompt #12.', source: 'System' },
  ];

  for (const event of timelineEvents) {
    await db.orm.public.EventTimeline.create(event);
  }

  console.log('Seeding Notes...');
  const notes = [
    { id: 'n1', incidentId: 'inc-1', userId: analystId, content: 'Investigating network flow logs. The traffic is recurring every 30 seconds. Pointing to standard beaconing behavior. Checking host process tree.', createdAt: new Date().toISOString() },
    { id: 'n2', incidentId: 'inc-3', userId: adminId, content: 'Checked change logs. No scheduled administration or user provisioning was approved for this time window. Investigating compromised credentials of j.jones.', createdAt: new Date().toISOString() },
    { id: 'n3', incidentId: 'inc-8', userId: analystId, content: 'Spoke with developer dev-user. They confirmed accepting the prompt out of annoyance while trying to access resources, not realizing it was a prompt storm. Resetting user password and active session tokens.', createdAt: new Date().toISOString() },
  ];

  for (const note of notes) {
    await db.orm.public.Note.create(note);
  }

  console.log('Seeding Audit Logs...');
  const auditLogs = [
    { id: 'al1', userId: adminId, action: 'DB_SEED', details: 'Initial system seeding completed.', ipAddress: '127.0.0.1', createdAt: new Date().toISOString() },
    { id: 'al2', userId: analystId, action: 'CLAIM_INCIDENT', details: 'Analyst claimed incident inc-1.', ipAddress: '192.168.10.12', createdAt: new Date().toISOString() },
  ];

  for (const log of auditLogs) {
    await db.orm.public.AuditLog.create(log);
  }

  console.log('Database successfully seeded!');
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  });
