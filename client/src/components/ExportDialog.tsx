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
        tempDiv.style.position = "absolute";
        tempDiv.style.left = "-9999px";
        
        // Create the export content
        const content = document.createElement("div");
        
        // Add the title
        const titleElement = document.createElement("h1");
        titleElement.textContent = manualTitle;
        titleElement.style.fontSize = "24px";
        titleElement.style.marginBottom = "20px";
        titleElement.style.color = "#000";
        content.appendChild(titleElement);
        
        // Add each section
        sections.forEach((section, index) => {
          if (!includeAllSections && section.policies.length === 0) {
            return;
          }
          
          const sectionElement = document.createElement("div");
          sectionElement.style.marginBottom = "30px";
          
          const sectionTitle = document.createElement("h2");
          sectionTitle.textContent = `${index + 1}. ${section.title}`;
          sectionTitle.style.fontSize = "20px";
          sectionTitle.style.marginBottom = "10px";
          sectionTitle.style.color = "#000";
          sectionElement.appendChild(sectionTitle);
          
          if (includeDescription && section.description) {
            const sectionDesc = document.createElement("p");
            sectionDesc.textContent = section.description;
            sectionDesc.style.marginBottom = "15px";
            sectionDesc.style.color = "#333";
            sectionElement.appendChild(sectionDesc);
          }
          
          // Add each policy
          section.policies.forEach((policy, policyIndex) => {
            const policyElement = document.createElement("div");
            policyElement.style.marginBottom = "20px";
            policyElement.style.paddingLeft = "15px";
            
            const policyTitle = document.createElement("h3");
            policyTitle.textContent = `${index + 1}.${policyIndex + 1} ${policy.title}`;
            policyTitle.style.fontSize = "16px";
            policyTitle.style.marginBottom = "10px";
            policyTitle.style.color = "#000";
            policyElement.appendChild(policyTitle);
            
            if (policy.currentVersion) {
              const policyContent = document.createElement("div");
              policyContent.innerHTML = policy.currentVersion.bodyContent;
              policyContent.style.color = "#333";
              policyElement.appendChild(policyContent);
            }
            
            sectionElement.appendChild(policyElement);
          });
          
          content.appendChild(sectionElement);
        });
        
        tempDiv.appendChild(content);
        document.body.appendChild(tempDiv);
        
        // Generate PDF
        try {
          const canvas = await html2canvas(tempDiv, {
            scale: 1.5,
            useCORS: true,
            logging: false
          });
          
          const imgData = canvas.toDataURL("image/jpeg", 0.95);
          
          // Create PDF
          const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
          });
          
          const imgWidth = 210; // A4 width in mm
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          let position = 0;
          pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
          
          // For multiple pages
          const pageHeight = pdf.internal.pageSize.height;
          while (position > -imgHeight) {
            position -= pageHeight;
            pdf.addPage();
            pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
          }
          
          // Save PDF
          pdf.save(`${manualTitle}.pdf`);
          toast({
            title: "Export Successful",
            description: `${manualTitle} has been exported as PDF`,
          });
        } finally {
          // Clean up
          document.body.removeChild(tempDiv);
        }
      } else if (format === "html") {
        // HTML export
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
