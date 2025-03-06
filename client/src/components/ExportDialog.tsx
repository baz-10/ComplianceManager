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
        // Create a temporary div to render the content
        const tempDiv = document.createElement("div");
        tempDiv.className = "pdf-export";
        tempDiv.style.width = "793px"; // A4 width at 96 DPI
        tempDiv.style.padding = "40px";
        tempDiv.style.backgroundColor = "#fff";
        tempDiv.style.color = "#000";
        tempDiv.style.fontFamily = "Arial, sans-serif";
        tempDiv.style.position = "absolute";
        tempDiv.style.left = "-9999px";
        document.body.appendChild(tempDiv);

        // Add the title
        const titleElement = document.createElement("h1");
        titleElement.textContent = manualTitle;
        titleElement.style.fontSize = "24px";
        titleElement.style.marginBottom = "20px";
        titleElement.style.color = "#000";
        titleElement.style.fontWeight = "bold";
        titleElement.style.textAlign = "center";
        tempDiv.appendChild(titleElement);

        try {
          // Initialize PDF
          const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
          });

          // PDF dimensions (A4)
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const margin = 10; // mm

          // Keep track of current Y position
          let yPos = margin;
          let currentPage = 1;

          // Add title to PDF
          pdf.setFontSize(24);
          pdf.setFont("helvetica", "bold");
          pdf.text(manualTitle, pageWidth / 2, yPos + 10, { align: "center" });
          yPos += 20;

          // Process each section
          for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
            const section = sections[sectionIndex];

            if (!includeAllSections && section.policies.length === 0) {
              continue;
            }

            // Check if we need a page break before the section
            if (yPos > pageHeight - 50) {
              pdf.addPage();
              currentPage++;
              yPos = margin;
            }

            // Add section header
            pdf.setFontSize(16);
            pdf.setFont("helvetica", "bold");
            const sectionTitle = `${sectionIndex + 1}. ${section.title}`;
            pdf.text(sectionTitle, margin, yPos + 8);
            yPos += 15;

            // Add section description if needed
            if (includeDescription && section.description) {
              if (yPos > pageHeight - 30) {
                pdf.addPage();
                currentPage++;
                yPos = margin;
              }

              pdf.setFontSize(11);
              pdf.setFont("helvetica", "italic");

              // Handle multiline descriptions
              const splitDesc = pdf.splitTextToSize(section.description, pageWidth - (margin * 2));
              pdf.text(splitDesc, margin, yPos + 5);
              yPos += (10 * splitDesc.length);
            }

            // Process each policy
            for (let policyIndex = 0; policyIndex < section.policies.length; policyIndex++) {
              const policy = section.policies[policyIndex];

              // Check if we need a page break before the policy
              if (yPos > pageHeight - 40) {
                pdf.addPage();
                currentPage++;
                yPos = margin;
              }

              // Add policy title
              pdf.setFontSize(13);
              pdf.setFont("helvetica", "bold");
              const policyTitle = `${sectionIndex + 1}.${policyIndex + 1} ${policy.title}`;
              pdf.text(policyTitle, margin + 5, yPos + 8);
              yPos += 15;

              if (policy.currentVersion) {
                // Create a temporary element to render the HTML content
                const contentDiv = document.createElement("div");
                contentDiv.innerHTML = policy.currentVersion.bodyContent;
                contentDiv.style.width = (pageWidth - (margin * 2)) + "mm";
                contentDiv.style.fontSize = "11px";
                contentDiv.style.fontFamily = "Arial, sans-serif";
                contentDiv.style.color = "#000";

                // Process any images to ensure they fit
                const images = contentDiv.querySelectorAll("img");
                images.forEach(img => {
                  img.style.maxWidth = "100%";
                  img.style.height = "auto";
                });

                tempDiv.appendChild(contentDiv);

                try {
                  // Convert the HTML content to an image
                  const canvas = await html2canvas(contentDiv, {
                    scale: 2,
                    logging: false,
                    useCORS: true
                  });

                  // Remove from DOM after capturing
                  tempDiv.removeChild(contentDiv);

                  // Calculate scaling to fit width
                  const imgWidth = pageWidth - (margin * 2);
                  const imgHeight = (canvas.height * imgWidth) / canvas.width;

                  // Handle page breaking for content
                  let remainingHeight = imgHeight;
                  let offsetY = 0;

                  while (remainingHeight > 0) {
                    // How much can fit on this page
                    const availableHeight = pageHeight - yPos - margin;
                    const heightToRender = Math.min(availableHeight, remainingHeight);

                    if (heightToRender < 5) { // If we can't even fit a tiny bit, go to next page
                      pdf.addPage();
                      currentPage++;
                      yPos = margin;
                      continue;
                    }

                    // Calculate positioning for cropping
                    const scaleFactor = imgWidth / canvas.width;
                    const sourceHeight = heightToRender / scaleFactor;

                    // Add portion of the image to the PDF
                    pdf.addImage(
                      canvas.toDataURL("image/jpeg", 0.95),
                      "JPEG",
                      margin,
                      yPos,
                      imgWidth,
                      heightToRender,
                      undefined,
                      "FAST",
                      0,
                      offsetY / scaleFactor,
                      canvas.width,
                      sourceHeight
                    );

                    // Update tracking variables
                    offsetY += sourceHeight;
                    remainingHeight -= heightToRender;
                    yPos += heightToRender;

                    // If there's more content and we've reached the end of the page, add a new page
                    if (remainingHeight > 0) {
                      pdf.addPage();
                      currentPage++;
                      yPos = margin;
                    }
                  }

                  // Add space after policy content
                  yPos += 10;

                } catch (err) {
                  console.error("Error rendering policy content:", err);
                  // If rendering fails, add a placeholder message
                  pdf.setFontSize(10);
                  pdf.setFont("helvetica", "italic");
                  pdf.text("(Content could not be rendered)", margin + 5, yPos + 5);
                  yPos += 10;
                }
              }

              // Add space between policies
              yPos += 10;
            }

            // Add space between sections
            yPos += 15;
          }

          // Add page numbers
          const totalPages = pdf.getNumberOfPages();
          for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "italic");
            pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - margin);
          }

          // Save PDF
          pdf.save(`${manualTitle}.pdf`);

          toast({
            title: "Export Successful",
            description: `${manualTitle} has been exported as PDF (${totalPages} pages)`,
          });
        } finally {
          // Clean up
          document.body.removeChild(tempDiv);
        }
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