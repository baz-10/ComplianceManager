import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Upload, 
  FileText, 
  File, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft,
  ArrowRight,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PreviewResponse {
  preview: {
    manualTitle: string;
    sections: Array<{
      title: string;
      policies: Array<{
        title: string;
        contentHtml: string;
      }>;
    }>;
  };
  message: string;
}

interface CommitResponse {
  message: string;
  manualId: number;
}

export function ImportDocument() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [granularity, setGranularity] = useState<"h2" | "h3">("h2");
  const [manualTitle, setManualTitle] = useState("");
  const [dryRun, setDryRun] = useState(true);
  
  // Step management
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  
  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
        'application/pdf', // PDF
        'application/msword' // DOC (fallback)
      ];
      
      if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.docx') && !file.name.toLowerCase().endsWith('.pdf')) {
        toast({
          title: "Unsupported File Type",
          description: "Please select a DOCX or PDF file.",
          variant: "destructive"
        });
        return;
      }
      
      setSelectedFile(file);
      // Reset preview when new file is selected
      setPreviewData(null);
      setCurrentStep(1);
    }
  };

  // Preview mutation (dry run)
  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No file selected");
      
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('dryRun', 'true');
      formData.append('granularity', granularity);
      if (manualTitle) {
        formData.append('manualTitle', manualTitle);
      }
      
      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 413) {
          throw new Error("File too large. Maximum size: 50MB for PDFs, 20MB for DOCX files.");
        } else if (response.status === 400) {
          throw new Error("Unsupported file type or corrupted file.");
        } else if (response.status === 500) {
          throw new Error("Failed to parse document. Please check if the file is valid.");
        }
        throw new Error(errorText || "Failed to preview document");
      }
      
      return response.json() as Promise<PreviewResponse>;
    },
    onSuccess: (data) => {
      setPreviewData(data);
      setCurrentStep(2);
      toast({
        title: "Preview Generated",
        description: "Document structure has been analyzed successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Preview Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Commit mutation (actual import)
  const commitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No file selected");
      
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('dryRun', 'false');
      formData.append('granularity', granularity);
      if (manualTitle) {
        formData.append('manualTitle', manualTitle);
      }
      
      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to import document");
      }
      
      return response.json() as Promise<CommitResponse>;
    },
    onSuccess: (data) => {
      setCurrentStep(3);
      toast({
        title: "Import Successful",
        description: data.message
      });
      // Navigate to the new manual after a short delay
      setTimeout(() => {
        navigate(`/manuals/${data.manualId}`);
      }, 2000);
    },
    onError: (error) => {
      toast({
        title: "Import Failed", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handlePreview = () => {
    previewMutation.mutate();
  };

  const handleCommit = () => {
    commitMutation.mutate();
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.toLowerCase().endsWith('.pdf')) {
      return <File className="h-8 w-8 text-red-500" />;
    }
    return <FileText className="h-8 w-8 text-blue-500" />;
  };

  const getFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/manuals')}
              className="px-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Import Document</h1>
          </div>
          <p className="text-muted-foreground">
            Import a DOCX or PDF document to automatically create a structured manual.
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center space-x-4">
        <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}>
            1
          </div>
          <span className="text-sm font-medium">Upload & Configure</span>
        </div>
        <Separator className="flex-1" />
        <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}>
            2
          </div>
          <span className="text-sm font-medium">Preview</span>
        </div>
        <Separator className="flex-1" />
        <div className={`flex items-center space-x-2 ${currentStep >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}>
            3
          </div>
          <span className="text-sm font-medium">Complete</span>
        </div>
      </div>

      {/* Step 1: Upload & Configure */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Upload & Configure</CardTitle>
            <CardDescription>
              Select your document and configure import settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload */}
            <div className="space-y-2">
              <Label>Document File</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                {selectedFile ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center space-x-3">
                      {getFileIcon(selectedFile.name)}
                      <div className="text-left">
                        <div className="font-medium">{selectedFile.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {getFileSize(selectedFile.size)}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <div className="text-lg font-medium">Upload Document</div>
                      <div className="text-sm text-muted-foreground">
                        Select a DOCX or PDF file to import
                      </div>
                    </div>
                    <Button onClick={() => fileInputRef.current?.click()}>
                      Choose File
                    </Button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            {selectedFile && (
              <>
                {/* Manual Title Override */}
                <div className="space-y-2">
                  <Label htmlFor="manualTitle">Manual Title (Optional)</Label>
                  <Input
                    id="manualTitle"
                    placeholder="Leave empty to use document title"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                  />
                </div>

                {/* Granularity (DOCX only) */}
                {selectedFile.name.toLowerCase().endsWith('.docx') && (
                  <div className="space-y-3">
                    <Label>Section Granularity</Label>
                    <RadioGroup value={granularity} onValueChange={(value: "h2" | "h3") => setGranularity(value)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="h2" id="h2" />
                        <Label htmlFor="h2" className="cursor-pointer">
                          <div>
                            <div className="font-medium">Heading 2 (h2)</div>
                            <div className="text-sm text-muted-foreground">
                              Create sections from major headings only
                            </div>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="h3" id="h3" />
                        <Label htmlFor="h3" className="cursor-pointer">
                          <div>
                            <div className="font-medium">Heading 3 (h3)</div>
                            <div className="text-sm text-muted-foreground">
                              Create sections from both major and minor headings
                            </div>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {/* Preview Button */}
                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handlePreview}
                    disabled={previewMutation.isPending}
                  >
                    {previewMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating Preview...
                      </>
                    ) : (
                      <>
                        Preview Structure
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Preview */}
      {currentStep === 2 && previewData && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Preview Structure</CardTitle>
            <CardDescription>
              Review the document structure before importing. You can adjust settings and regenerate the preview if needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {previewData.message}
              </AlertDescription>
            </Alert>

            {/* Manual Title */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Manual: {previewData.preview.manualTitle}</h3>
              <div className="text-sm text-muted-foreground mb-4">
                {previewData.preview.sections.length} sections • {' '}
                {previewData.preview.sections.reduce((sum, section) => sum + section.policies.length, 0)} policies
              </div>
            </div>

            {/* Sections Preview */}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {previewData.preview.sections.map((section, sectionIndex) => (
                <Card key={sectionIndex} className="border-l-4 border-l-primary/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{section.title}</CardTitle>
                    <CardDescription>
                      {section.policies.length} policies
                    </CardDescription>
                  </CardHeader>
                  {section.policies.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="space-y-1">
                        {section.policies.map((policy, policyIndex) => (
                          <div key={policyIndex} className="flex items-center space-x-2 text-sm">
                            <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{policy.title}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Settings
              </Button>
              <Button 
                onClick={handleCommit}
                disabled={commitMutation.isPending}
              >
                {commitMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    Import Manual
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Complete */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <span>Import Complete!</span>
            </CardTitle>
            <CardDescription>
              Your document has been successfully imported and converted into a structured manual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Manual created successfully! You will be redirected to the manual page shortly.
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-center pt-4">
              <Button onClick={() => navigate('/manuals')}>
                Back to Manuals
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}