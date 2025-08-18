import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, CheckCircle } from "lucide-react";

interface QuoteUploaderProps {
  quoteId: string;
  onUploadComplete: () => void;
}

export function QuoteUploader({ quoteId, onUploadComplete }: QuoteUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadStatus("");
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadStatus("Getting upload URL...");

    try {
      // Get presigned upload URL
      const uploadResponse = await fetch('/api/quotes/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadURL } = await uploadResponse.json();
      setUploadStatus("Uploading document...");

      // Upload file to object storage
      const fileUploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!fileUploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      setUploadStatus("Updating quote record...");

      // Update quote with document info
      const updateResponse = await fetch(`/api/quotes/${quoteId}/document`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          documentUrl: uploadURL.split('?')[0], // Remove query parameters
          documentName: file.name,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update quote');
      }

      setUploadStatus("Upload completed!");
      setFile(null);
      onUploadComplete();

      setTimeout(() => {
        setUploadStatus("");
      }, 3000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="w-5 h-5" />
          <span>Upload Quote Document</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="quote-file">Select Quote Document (PDF, Word, etc.)</Label>
          <Input
            id="quote-file"
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </div>

        {file && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <FileText className="w-4 h-4" />
            <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
          </div>
        )}

        {uploadStatus && (
          <div className={`flex items-center space-x-2 text-sm ${
            uploadStatus.includes('completed') ? 'text-green-600' : 
            uploadStatus.includes('failed') ? 'text-red-600' : 'text-blue-600'
          }`}>
            {uploadStatus.includes('completed') && <CheckCircle className="w-4 h-4" />}
            <span>{uploadStatus}</span>
          </div>
        )}

        <Button 
          onClick={handleUpload} 
          disabled={!file || isUploading}
          className="w-full"
        >
          {isUploading ? 'Uploading...' : 'Upload Quote Document'}
        </Button>
      </CardContent>
    </Card>
  );
}