import { useState } from "react";
import { Upload, File } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FileUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      console.log("File dropped:", file.name);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      console.log("File selected:", file.name);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative rounded-md border-2 border-dashed p-8 sm:p-12 transition-all",
        "hover-elevate active-elevate-2 cursor-pointer",
        isDragging ? "border-primary bg-primary/5" : "border-border"
      )}
      data-testid="dropzone-upload"
    >
      <input
        type="file"
        accept=".mp3,.wav,.m4a,.ogg"
        onChange={handleFileSelect}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        data-testid="input-file"
      />

      <div className="flex flex-col items-center gap-4 text-center pointer-events-none">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          {selectedFile ? (
            <File className="h-8 w-8 text-primary" />
          ) : (
            <Upload className="h-8 w-8 text-primary" />
          )}
        </div>

        {selectedFile ? (
          <>
            <div>
              <p className="font-medium" data-testid="text-filename">
                {selectedFile.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} ميجابايت
              </p>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="font-medium">اسحب الملف الصوتي هنا</p>
              <p className="text-sm text-muted-foreground mt-1">
                أو انقر للاختيار من جهازك
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              الصيغ المدعومة: MP3, WAV, M4A, OGG
            </p>
          </>
        )}
      </div>
    </div>
  );
}
