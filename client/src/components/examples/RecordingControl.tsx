import RecordingControl from "../RecordingControl";

export default function RecordingControlExample() {
  const handleRecordingComplete = (audioBlob: Blob) => {
    console.log("Recording complete:", audioBlob);
  };

  return (
    <div className="p-8">
      <RecordingControl onRecordingComplete={handleRecordingComplete} language="ar" />
    </div>
  );
}
