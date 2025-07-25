import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { Download, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Policy {
  id: number;
  title: string;
  currentVersion?: {
    bodyContent: string;
  };
}

interface Section {
  id: number;
  title: string;
  description?: string;
  policies: Policy[];
}

interface ExportDialogProps {
  manualTitle: string;
  sections: Section[];
}

export function ExportDialog({ manualTitle, sections }: ExportDialogProps) {
  const [format, setFormat] = useState("pdf");
  const [includeAllSections, setIncludeAllSections] = useState(true);
  const [includeDescription, setIncludeDescription] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      if (format === "pdf") {
        // Initialize PDF with better settings
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
          compress: true
        });

        // PDF dimensions and styling
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pageWidth - (margin * 2);
        
        let yPos = margin;
        const lineHeight = 6;
        const sectionSpacing = 12;
        const policySpacing = 8;

        // Helper function to check for page break
        const checkPageBreak = (requiredSpace: number) => {
          if (yPos + requiredSpace > pageHeight - margin) {
            pdf.addPage();
            yPos = margin;
            return true;
          }
          return false;
        };

        // Helper function to add text with word wrapping
        const addWrappedText = (text: string, fontSize: number, style: 'normal' | 'bold' | 'italic' = 'normal', maxWidth?: number) => {
          pdf.setFontSize(fontSize);
          pdf.setFont("helvetica", style);
          
          const width = maxWidth || contentWidth;
          const lines = pdf.splitTextToSize(text, width);
          
          checkPageBreak(lines.length * lineHeight + 5);
          
          lines.forEach((line: string) => {
            pdf.text(line, margin, yPos);
            yPos += lineHeight;
          });
          
          return lines.length * lineHeight;
        };

        // Helper function to process HTML content and convert to plain text
        const htmlToText = (html: string): string => {
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = html;
          
          // Handle common HTML elements
          const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
          headings.forEach(heading => {
            heading.textContent = `\n${heading.textContent}\n`;
          });
          
          const paragraphs = tempDiv.querySelectorAll('p');
          paragraphs.forEach(p => {
            p.textContent = `${p.textContent}\n\n`;
          });
          
          const lists = tempDiv.querySelectorAll('ul, ol');
          lists.forEach(list => {
            const items = list.querySelectorAll('li');
            items.forEach((item, index) => {
              const prefix = list.tagName === 'OL' ? `${index + 1}. ` : '• ';
              item.textContent = `${prefix}${item.textContent}\n`;
            });
          });
          
          // Clean up extra whitespace
          return tempDiv.textContent?.replace(/\n\s*\n\s*\n/g, '\n\n').trim() || '';
        };

        // Add header with metadata
        const addHeader = () => {
          pdf.setFontSize(18);
          pdf.setFont("helvetica", "bold");
          pdf.text(manualTitle, pageWidth / 2, yPos + 8, { align: "center" });
          yPos += 15;
          
          // Add generation date and metadata
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "normal");
          const now = new Date();
          const dateStr = `Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
          pdf.text(dateStr, pageWidth / 2, yPos, { align: "center" });
          yPos += 10;
          
          // Add separator line
          pdf.setLineWidth(0.5);
          pdf.line(margin, yPos, pageWidth - margin, yPos);
          yPos += sectionSpacing;
        };

        addHeader();

        // Process each section with improved formatting
        for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
          const section = sections[sectionIndex];

          if (!includeAllSections && section.policies.length === 0) {
            continue;
          }

          // Add section header
          checkPageBreak(25);
          yPos += sectionSpacing / 2;
          
          const sectionTitle = `${sectionIndex + 1}. ${section.title}`;
          addWrappedText(sectionTitle, 14, 'bold');
          yPos += 2;

          // Add section description if included
          if (includeDescription && section.description) {
            addWrappedText(section.description, 10, 'italic');
            yPos += policySpacing / 2;
          }

          // Process each policy in the section
          for (let policyIndex = 0; policyIndex < section.policies.length; policyIndex++) {
            const policy = section.policies[policyIndex];

            // Add policy title with consistent numbering
            checkPageBreak(20);
            yPos += policySpacing / 2;
            
            const policyTitle = `${sectionIndex + 1}.${policyIndex + 1} ${policy.title}`;
            addWrappedText(policyTitle, 12, 'bold');
            yPos += 3;

            // Add policy content if available
            if (policy.currentVersion && policy.currentVersion.bodyContent) {
              const cleanContent = htmlToText(policy.currentVersion.bodyContent);
              if (cleanContent.trim()) {
                // Indent policy content slightly
                pdf.setFontSize(10);
                pdf.setFont("helvetica", "normal");
                
                const contentLines = pdf.splitTextToSize(cleanContent, contentWidth - 10);
                
                contentLines.forEach((line: string) => {
                  checkPageBreak(lineHeight + 2);
                  pdf.text(line, margin + 5, yPos);
                  yPos += lineHeight;
                });
              }
            }

            yPos += policySpacing;
          }

          yPos += sectionSpacing;
        }

        // Add page numbers and footer to all pages
        const totalPages = pdf.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          
          // Page number
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "normal");
          pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - margin, { align: "right" });
          
          // Footer with manual title on left
          pdf.text(manualTitle, margin, pageHeight - margin);
        }

        // Save PDF with timestamp
        const timestamp = new Date().toISOString().split('T')[0];
        pdf.save(`${manualTitle}_${timestamp}.pdf`);

        // Log export event for audit trail
        try {
          await fetch('/api/admin/log-export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              entityType: 'manual',
              entityId: sections[0]?.id || 0, // Use first section's manual ID
              format: 'PDF',
              details: `Manual exported with ${totalPages} pages, ${sections.length} sections`,
              fileName: `${manualTitle}_${timestamp}.pdf`
            })
          });
        } catch (error) {
          console.warn('Failed to log export event:', error);
        }

        toast({
          title: "Export Successful",
          description: `${manualTitle} exported as PDF (${totalPages} pages) with improved formatting`,
        });
      } else if (format === "html") {
        // HTML export - using original code
        let html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>${manualTitle}</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
              h1 { font-size: 24px; color: #333; }
              h2 { font-size: 20px; color: #444; margin-top: 30px; }
              h3 { font-size: 16px; color: #555; margin-top: 20px; }
              .policy { margin-left: 20px; }
              .section { margin-bottom: 30px; }
            </style>
          </head>
          <body>
            <h1>${manualTitle}</h1>
        `;

        sections.forEach((section, index) => {
          if (!includeAllSections && section.policies.length === 0) {
            return;
          }

          html += `<div class="section">
            <h2>${index + 1}. ${section.title}</h2>
          `;

          if (includeDescription && section.description) {
            html += `<p>${section.description}</p>`;
          }

          section.policies.forEach((policy, policyIndex) => {
            html += `<div class="policy">
              <h3>${index + 1}.${policyIndex + 1} ${policy.title}</h3>
              ${policy.currentVersion ? policy.currentVersion.bodyContent : ''}
            </div>`;
          });

          html += `</div>`;
        });

        html += `
          </body>
          </html>
        `;

        // Create download link
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${manualTitle}.html`;
        a.click();
        URL.revokeObjectURL(url);

        // Log export event for audit trail
        try {
          await fetch('/api/admin/log-export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              entityType: 'manual',
              entityId: sections[0]?.id || 0,
              format: 'HTML',
              details: `Manual exported as HTML with ${sections.length} sections`,
              fileName: `${manualTitle}.html`
            })
          });
        } catch (error) {
          console.warn('Failed to log export event:', error);
        }

        toast({
          title: "Export Successful",
          description: `${manualTitle} has been exported as HTML`,
        });
      }
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting the content",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Manual</DialogTitle>
          <DialogDescription>
            Export manual content as PDF or HTML for offline viewing and sharing.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="format" className="text-right">
              Format
            </Label>
            <Select
              value={format}
              onValueChange={(value) => setFormat(value)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF Document</SelectItem>
                <SelectItem value="html">HTML Document</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="col-span-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeAllSections"
                  checked={includeAllSections}
                  onCheckedChange={(checked) => setIncludeAllSections(checked as boolean)}
                />
                <Label htmlFor="includeAllSections">
                  Include sections with no policies
                </Label>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="col-span-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeDescription"
                  checked={includeDescription}
                  onCheckedChange={(checked) => setIncludeDescription(checked as boolean)}
                />
                <Label htmlFor="includeDescription">
                  Include section descriptions
                </Label>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>Export</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}