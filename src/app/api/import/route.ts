import { NextResponse } from 'next/server';
import { db } from '@/prisma/db';
import { getSession } from '@/lib/auth/session';
import { parseAlerts } from '@/lib/parser';
import { importPayloadSchema } from '@/schemas/import';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const payloadValidation = importPayloadSchema.safeParse(body);

    if (!payloadValidation.success) {
      return NextResponse.json(
        { error: 'Invalid request payload', details: payloadValidation.error.issues.map((e: any) => e.message) },
        { status: 400 }
      );
    }

    const { content, format, preview, duplicateHandling } = payloadValidation.data;

    // Parse and validate raw alert logs
    const { alerts, errors } = parseAlerts(content, format);

    if (errors.length > 0 && alerts.length === 0) {
      return NextResponse.json({ error: 'Parsing failed', details: errors }, { status: 400 });
    }

    const existingEvents = await db.orm.public.SecurityEvent.all();

    // Helper: Check if an alert is a duplicate of an existing SecurityEvent record
    const findDuplicateEvent = (alert: typeof alerts[0]) => {
      return existingEvents.find(e => 
        new Date(e.timestamp).getTime() === new Date(alert.timestamp).getTime() &&
        e.ruleName.toLowerCase() === alert.ruleName.toLowerCase() &&
        e.details.toLowerCase() === alert.details.toLowerCase()
      );
    };

    if (preview) {
      const previewAlerts = alerts.map(alert => {
        const duplicate = findDuplicateEvent(alert);
        return {
          ...alert,
          isDuplicate: !!duplicate,
          duplicateActionMessage: duplicate
            ? `Duplicate found. Action (${duplicateHandling}): ${
                duplicateHandling === 'SKIP' ? 'Skip this row' :
                duplicateHandling === 'OVERWRITE' ? 'Overwrite details of existing alert' :
                'Ingest as new alert anyway'
              }`
            : 'New Alert'
        };
      });

      const duplicateCount = previewAlerts.filter(a => a.isDuplicate).length;

      return NextResponse.json({
        success: true,
        preview: true,
        alerts: previewAlerts,
        errors,
        summary: {
          totalRows: alerts.length + errors.length,
          validRows: alerts.length,
          invalidRows: errors.length,
          duplicateCount
        }
      });
    }

    // Process ingestion (preview === false)
    let importedCount = 0;
    const allRules = await db.orm.public.DetectionRule.all();
    const allAssets = await db.orm.public.Asset.all();
    const allIncidents = await db.orm.public.Incident.all();

    const severityPriority = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

    for (const alert of alerts) {
      const duplicate = findDuplicateEvent(alert);

      // Handle duplicate detection based on duplicateHandling strategy
      if (duplicate) {
        if (duplicateHandling === 'SKIP') {
          continue; // Skip alert
        } else if (duplicateHandling === 'OVERWRITE') {
          // Update existing SecurityEvent details
          await db.orm.public.SecurityEvent.where({ id: duplicate.id }).update({
            ...duplicate,
            details: alert.details,
            severity: alert.severity,
            sourceIp: alert.sourceIp || duplicate.sourceIp,
            destIp: alert.destIp || duplicate.destIp,
            targetHost: alert.targetHost || duplicate.targetHost,
            updatedAt: new Date().toISOString()
          });
          importedCount++;
          continue;
        }
      }

      // 1. Find or create detection rule
      let rule = allRules.find(r => r.name.toLowerCase() === alert.ruleName.toLowerCase());
      if (!rule) {
        const ruleId = `rule-${crypto.randomUUID()}`;
        rule = await db.orm.public.DetectionRule.create({
          id: ruleId,
          name: alert.ruleName,
          description: `Automatically created rule for imported alert: ${alert.ruleName}`,
          severity: alert.severity,
          category: alert.category,
          mitreAttack: alert.mitreAttack || 'T1204',
          query: 'imported_alert_query',
          enabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        allRules.push(rule);
      }

      // 2. Incident Association Rules
      // Try to find an open/unresolved incident with the same category and asset links
      const associatedIncident = allIncidents.find(inc => 
        inc.status !== 'RESOLVED' && inc.status !== 'CLOSED' &&
        inc.category.toLowerCase() === alert.category.toLowerCase() &&
        (
          (alert.targetHost && inc.title.toLowerCase().includes(alert.targetHost.toLowerCase())) ||
          (alert.sourceIp && (inc.sourceIp === alert.sourceIp || inc.destIp === alert.sourceIp)) ||
          (alert.destIp && (inc.sourceIp === alert.destIp || inc.destIp === alert.destIp))
        )
      );

      let incidentId = '';
      if (associatedIncident) {
        // Associate alert to existing incident
        incidentId = associatedIncident.id;

        // Upgrade incident severity if the new alert's severity is higher
        if (severityPriority[alert.severity] > severityPriority[associatedIncident.severity]) {
          const oldSeverity = associatedIncident.severity;
          associatedIncident.severity = alert.severity;
          
          await db.orm.public.Incident.where({ id: incidentId }).update({
            ...associatedIncident,
            severity: alert.severity,
            updatedAt: new Date().toISOString()
          });

          // Log severity upgrade to timeline
          await db.orm.public.EventTimeline.create({
            id: `timeline-${crypto.randomUUID()}`,
            incidentId,
            eventTime: new Date().toISOString(),
            title: 'Incident Severity Upgraded',
            description: `Severity upgraded from ${oldSeverity} to ${alert.severity} due to newly ingested alert: ${alert.ruleName}`,
            source: 'System'
          });
        }

        // Add timeline aggregation log
        await db.orm.public.EventTimeline.create({
          id: `timeline-${crypto.randomUUID()}`,
          incidentId,
          eventTime: new Date().toISOString(),
          title: 'Alert Aggregated',
          description: `Ingested alert "${alert.ruleName}" aggregated into this incident queue. Details: ${alert.details}`,
          source: 'Import'
        });

      } else {
        // Create a new incident
        incidentId = `inc-${crypto.randomUUID()}`;
        const newIncident = await db.orm.public.Incident.create({
          id: incidentId,
          title: `Imported Alert: ${alert.ruleName}`,
          description: alert.details,
          status: 'NEW',
          severity: alert.severity,
          category: alert.category,
          sourceIp: alert.sourceIp || null,
          destIp: alert.destIp || null,
          ruleId: rule.id,
          assignedToId: null,
          createdAt: alert.timestamp,
        });
        allIncidents.push(newIncident);

        // Find and link asset if available
        if (alert.targetHost) {
          const asset = allAssets.find(a => 
            a.hostname.toLowerCase() === alert.targetHost!.toLowerCase() || 
            a.ipAddress === alert.sourceIp || 
            a.ipAddress === alert.destIp
          );
          if (asset) {
            await db.orm.public.IncidentAsset.create({
              incidentId,
              assetId: asset.id,
            });
          }
        }

        // Create timeline log
        await db.orm.public.EventTimeline.create({
          id: `timeline-${crypto.randomUUID()}`,
          incidentId,
          eventTime: new Date().toISOString(),
          title: 'Incident Created from Alert Ingestion',
          description: `New incident automatically created from imported alert: "${alert.ruleName}".`,
          source: 'Import',
        });
      }

      // 3. Create SecurityEvent record
      await db.orm.public.SecurityEvent.create({
        id: `event-${crypto.randomUUID()}`,
        timestamp: alert.timestamp,
        ruleName: alert.ruleName,
        category: alert.category,
        severity: alert.severity,
        sourceIp: alert.sourceIp || null,
        destIp: alert.destIp || null,
        targetHost: alert.targetHost || null,
        details: alert.details,
        mitreAttack: alert.mitreAttack || null,
        incidentId,
        createdAt: new Date().toISOString(),
      });

      importedCount++;
    }

    // Write central audit log
    await db.orm.public.AuditLog.create({
      id: `audit-${crypto.randomUUID()}`,
      userId: session.userId,
      action: 'IMPORT_ALERTS',
      details: `Imported ${importedCount} alerts successfully. Duplicate strategy: ${duplicateHandling}. Errors skipped/logged: ${errors.length}`,
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      importedCount,
      errors: errors.length > 0 ? errors : null,
    });
  } catch (error) {
    console.error('Failed to import alerts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
