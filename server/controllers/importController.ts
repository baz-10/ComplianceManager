import { Request, Response } from 'express';
import multer from 'multer';
import { db } from '@db';
import { manuals, sections, policies, policyVersions, type User } from '@db/schema';
import { eq, asc } from 'drizzle-orm';
import { env } from '../config/environment.ts';
import { ApiError, sendErrorResponse } from '../utils/errorHandler';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

// Memory storage; we don’t persist uploaded docs
const storage = multer.memoryStorage();

// Accept DOCX and PDF
const ACCEPTED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const MAX_DOCX_MB = env.importMaxDocxMb;
export const MAX_PDF_MB = env.importMaxPdfMb;

function getMaxSizeFor(mime: string): number {
  return mime.includes('wordprocessingml') ? MAX_DOCX_MB * 1024 * 1024 : MAX_PDF_MB * 1024 * 1024;
}

// Multer instance with per-file limit enforcement inside handler
export const docUpload = multer({ storage });

type ImportPreview = {
  manualTitle: string;
  sections: Array<{
    title: string;
    policies: Array<{ title: string; contentHtml: string }>;
  }>;
};

async function parseDocxToPreview(buffer: Buffer, manualTitle: string, granularity: 'h2' | 'h3' = 'h2'): Promise<ImportPreview> {
  // Lazy import to avoid requiring mammoth at startup
  let mammoth: any;
  try {
    const mod = await import('mammoth');
    mammoth = mod.default || mod;
  } catch (err) {
    throw new Error('mammoth not installed. Please run: npm install mammoth');
  }

  const result = await mammoth.convertToHtml({ buffer });
  const html: string = result.value || '';

  // Very simple HTML parsing via regex to find headings/content blocks
  // Assumptions: well-formed h1/h2/h3 tags in the generated HTML
  const h1Blocks = html.split(/<h1[^>]*>/i).slice(1).map(block => {
    const [titlePart, ...rest] = block.split(/<\/h1>/i);
    return { title: titlePart?.replace(/<[^>]+>/g, '').trim() || 'Untitled', rest: rest.join('</h1>') };
  });

  const sections: ImportPreview['sections'] = [];
  if (h1Blocks.length === 0) {
    // Fallback: treat entire doc as one section and split on h2
    const policies: Array<{ title: string; contentHtml: string }> = [];
    const h2Parts = html.split(/<h2[^>]*>/i).slice(1);
    if (h2Parts.length > 0) {
      for (const part of h2Parts) {
        const [t, ...bodyParts] = part.split(/<\/h2>/i);
        const title = (t || '').replace(/<[^>]+>/g, '').trim() || 'Untitled';
        const contentHtml = bodyParts.join('</h2>').trim();
        policies.push({ title, contentHtml });
      }
    } else {
      policies.push({ title: 'Imported Content', contentHtml: html });
    }
    sections.push({ title: manualTitle, policies });
  } else {
    for (const h1 of h1Blocks) {
      const h2Split = h1.rest.split(/<h2[^>]*>/i).slice(1);
      const policies: Array<{ title: string; contentHtml: string }> = [];
      if (h2Split.length > 0 && granularity === 'h2') {
        for (const part of h2Split) {
          const [t, ...bodyParts] = part.split(/<\/h2>/i);
          const title = (t || '').replace(/<[^>]+>/g, '').trim() || 'Untitled';
          const contentHtml = bodyParts.join('</h2>').trim();
          policies.push({ title, contentHtml });
        }
      } else {
        // No h2s or not selected; put the rest as a single policy
        policies.push({ title: 'Imported Content', contentHtml: h1.rest });
      }
      sections.push({ title: h1.title, policies });
    }
  }

  return { manualTitle, sections };
}

async function parsePdfToPreview(buffer: Buffer, manualTitle: string): Promise<ImportPreview> {
  // Try pdf-parse first; fallback to single policy if not installed
  let pdfParse: any;
  try {
    const mod = await import('pdf-parse');
    pdfParse = (mod as any).default || mod;
  } catch (err) {
    // No parser available; store raw text placeholder
    return {
      manualTitle,
      sections: [{ title: 'Imported Document', policies: [{ title: 'Main Content', contentHtml: '<p>PDF parser not installed. Please run: npm install pdf-parse</p>' }] }]
    };
  }

  const data = await pdfParse(buffer);
  const text: string = data?.text || '';
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Simple heuristic: create a section for each top-level numbering like "1.0 ..."; policies for "1.1 ..."
  const sections: ImportPreview['sections'] = [];
  let currentSection: { title: string; policies: Array<{ title: string; contentHtml: string }> } | null = null;
  let currentPolicy: { title: string; contentHtml: string } | null = null;

  const flushPolicy = () => {
    if (currentSection && currentPolicy) {
      currentSection.policies.push({ ...currentPolicy });
      currentPolicy = null;
    }
  };
  const flushSection = () => {
    flushPolicy();
    if (currentSection) {
      sections.push({ ...currentSection });
      currentSection = null;
    }
  };

  for (const line of lines) {
    if (/^\d+\.0\b/.test(line)) {
      flushSection();
      currentSection = { title: line, policies: [] };
    } else if (/^\d+\.\d+\b/.test(line)) {
      flushPolicy();
      currentPolicy = { title: line, contentHtml: '' };
    } else {
      if (!currentSection) {
        currentSection = { title: manualTitle, policies: [] };
      }
      if (!currentPolicy) {
        currentPolicy = { title: 'Imported Content', contentHtml: '' };
      }
      currentPolicy.contentHtml += `<p>${line}</p>`;
    }
  }
  flushSection();

  if (sections.length === 0) {
    sections.push({ title: manualTitle, policies: [{ title: 'Imported Content', contentHtml: `<p>${lines.join('</p><p>')}</p>` }] });
  }

  return { manualTitle, sections };
}

async function commitPreview(preview: ImportPreview, req: Request) {
  if (!req.user?.id || !req.user.organizationId) {
    throw new Error('Authentication and organization context required');
  }

  // Create manual (DRAFT)
  const [manual] = await db.insert(manuals).values({
    title: preview.manualTitle || 'Imported Manual',
    description: 'Imported via document import',
    status: 'DRAFT',
    organizationId: req.user.organizationId,
    createdById: req.user.id
  }).returning();

  // Insert sections and policies
  let sectionOrder = 0;
  for (const s of preview.sections) {
    const [section] = await db.insert(sections).values({
      manualId: manual.id,
      title: s.title,
      description: '',
      level: 0,
      sectionNumber: `${sectionOrder + 1}.0`,
      orderIndex: sectionOrder,
      createdById: req.user.id
    }).returning();
    sectionOrder++;

    let policyOrder = 0;
    for (const p of s.policies) {
      const [policy] = await db.insert(policies).values({
        sectionId: section.id,
        title: p.title,
        status: 'DRAFT',
        orderIndex: policyOrder,
        createdById: req.user.id
      }).returning();
      policyOrder++;

      const [version] = await db.insert(policyVersions).values({
        policyId: policy.id,
        versionNumber: 1,
        bodyContent: p.contentHtml || '<p>Imported content</p>',
        effectiveDate: new Date(),
        authorId: req.user.id
      }).returning();

      await db.update(policies).set({ currentVersionId: version.id, updatedAt: new Date() }).where(eq(policies.id, policy.id));
    }
  }

  return manual;
}

export const ImportController = {
  // POST /api/import (multipart form-data: document, options: { dryRun, granularity, manualTitle })
  async importDocument(req: Request, res: Response) {
    try {
      const file = (req as any).file as Express.Multer.File;
      const { dryRun, granularity, manualTitle } = req.body as any;

      if (!file) {
        return sendErrorResponse(res, new ApiError('No file uploaded. Use field name "document".', 400, 'BAD_REQUEST'));
      }
      if (!ACCEPTED_MIME.has(file.mimetype)) {
        return sendErrorResponse(res, new ApiError('Unsupported file type. Only PDF and DOCX are accepted.', 400, 'UNSUPPORTED_MEDIA_TYPE'));
      }
      const max = getMaxSizeFor(file.mimetype);
      if (file.size > max) {
        return sendErrorResponse(
          res,
          new ApiError(
            `File too large. Max size is ${Math.round(max / (1024 * 1024))} MB for this type.`,
            413,
            'PAYLOAD_TOO_LARGE',
          ),
        );
      }

      const title = manualTitle?.trim() || file.originalname.replace(/\.(pdf|docx)$/i, '') || 'Imported Manual';

      let preview: ImportPreview;
      if (file.mimetype === 'application/pdf') {
        preview = await parsePdfToPreview(file.buffer, title);
      } else {
        preview = await parseDocxToPreview(file.buffer, title, (granularity === 'h3' ? 'h3' : 'h2'));
      }

      const isDryRun = String(dryRun).toLowerCase() === 'true' || String(dryRun) === '1';
      if (isDryRun) {
        return res.json({ preview, message: 'Dry run successful' });
      }

      // Commit to DB
      const manual = await commitPreview(preview, req);
      return res.json({ message: 'Import completed', manualId: manual.id });
    } catch (error: any) {
      console.error('Import failed:', error);
      return sendErrorResponse(res, error);
    }
  }
};
