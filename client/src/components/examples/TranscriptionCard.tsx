import TranscriptionCard from "../TranscriptionCard";

export default function TranscriptionCardExample() {
  return (
    <div className="p-8 max-w-4xl">
      <TranscriptionCard
        text="مرحباً بكم في محاضرة اليوم حول الذكاء الاصطناعي. سنتحدث عن تطبيقات التعلم العميق والشبكات العصبية."
        timestamps={[
          { time: "00:00", text: "مرحباً بكم في محاضرة اليوم حول الذكاء الاصطناعي." },
          { time: "00:05", text: "سنتحدث عن تطبيقات التعلم العميق والشبكات العصبية." },
          { time: "00:12", text: "الذكاء الاصطناعي أصبح جزءاً أساسياً من حياتنا اليومية." },
        ]}
      />
    </div>
  );
}
