import FileUpload from "../FileUpload";

export default function FileUploadExample() {
  const handleFileSelect = (file: File) => {
    console.log("File selected:", file.name);
  };

  return (
    <div className="p-8 max-w-2xl">
      <FileUpload onFileSelect={handleFileSelect} />
    </div>
  );
}
