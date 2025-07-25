import { Request } from 'express';
import { db } from '@db';
import { auditLogs, type NewAuditLog, type User } from '@db/schema';
import crypto from 'crypto';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

export class AuditService {
  /**
   * Log an audit event for CASA compliance tracking
   */
  static async logEvent(
    req: Request,
    entityType: string,
    entityId: number,
    action: string,
    options: {
      previousState?: any;
      newState?: any;
      changeDetails?: string;
      severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      complianceFlags?: string[];
    } = {}
  ): Promise<void> {
    try {
      const auditData: NewAuditLog = {
        userId: req.user?.id || null,
        entityType,
        entityId,
        action,
        previousState: options.previousState || null,
        newState: options.newState || null,
        changeDetails: options.changeDetails || null,
        ipAddress: this.getClientIP(req),
        userAgent: req.get('User-Agent') || null,
        sessionId: this.getSessionId(req),
        severity: options.severity || 'INFO',
        complianceFlags: options.complianceFlags || []
      };

      await db.insert(auditLogs).values(auditData);

      // Log critical events to console for immediate attention
      if (options.severity === 'CRITICAL') {
        console.warn(`CRITICAL AUDIT EVENT: ${action} on ${entityType} ${entityId} by user ${req.user?.username || 'anonymous'}`);
      }
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw - audit logging shouldn't break business logic
    }
  }

  /**
   * Log user authentication events
   */
  static async logAuth(
    req: Request,
    action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED',
    userId?: number,
    details?: string
  ): Promise<void> {
    await this.logEvent(req, 'user', userId || 0, action, {
      changeDetails: details,
      severity: action === 'LOGIN_FAILED' ? 'MEDIUM' : 'LOW',
      complianceFlags: ['authentication']
    });
  }

  /**
   * Log policy version publishing events
   */
  static async logPolicyPublish(
    req: Request,
    policyVersionId: number,
    previousState: any,
    newState: any
  ): Promise<void> {
    await this.logEvent(req, 'policy_version', policyVersionId, 'PUBLISH', {
      previousState,
      newState,
      changeDetails: 'Policy version published to LIVE status',
      severity: 'HIGH',
      complianceFlags: ['policy_lifecycle', 'casa_compliance']
    });
  }

  /**
   * Log document export events
   */
  static async logExport(
    req: Request,
    entityType: 'manual' | 'policy',
    entityId: number,
    format: string,
    details: string
  ): Promise<void> {
    await this.logEvent(req, entityType, entityId, 'EXPORT', {
      changeDetails: `Exported as ${format}: ${details}`,
      severity: 'MEDIUM',
      complianceFlags: ['document_export', 'casa_compliance']
    });
  }

  /**
   * Log policy acknowledgment events
   */
  static async logAcknowledgment(
    req: Request,
    policyVersionId: number,
    acknowledgmentDetails: string
  ): Promise<void> {
    await this.logEvent(req, 'policy_version', policyVersionId, 'ACKNOWLEDGE', {
      changeDetails: acknowledgmentDetails,
      severity: 'MEDIUM',
      complianceFlags: ['policy_acknowledgment', 'compliance_tracking']
    });
  }

  /**
   * Log administrative actions
   */
  static async logAdminAction(
    req: Request,
    entityType: string,
    entityId: number,
    action: string,
    details: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'HIGH'
  ): Promise<void> {
    await this.logEvent(req, entityType, entityId, action, {
      changeDetails: details,
      severity,
      complianceFlags: ['admin_action', 'privileged_operation']
    });
  }

  /**
   * Get client IP address from request
   */
  private static getClientIP(req: Request): string {
    return (
      req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Get session ID from request
   */
  private static getSessionId(req: Request): string {
    return req.sessionID || this.generateSessionId();
  }

  /**
   * Generate a unique session ID
   */
  private static generateSessionId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Create a hash for digital signatures
   */
  static createDocumentHash(content: string, metadata: any = {}): string {
    const combined = JSON.stringify({ content, metadata, timestamp: Date.now() });
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Verify document integrity
   */
  static verifyDocumentHash(content: string, hash: string, metadata: any = {}): boolean {
    const expectedHash = this.createDocumentHash(content, metadata);
    return expectedHash === hash;
  }
}