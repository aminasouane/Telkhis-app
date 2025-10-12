import SummaryCard from "../SummaryCard";

export default function SummaryCardExample() {
  return (
    <div className="p-8 max-w-4xl">
      <SummaryCard
        summary="تناولت المحاضرة موضوع الذكاء الاصطناعي وتطبيقاته المختلفة، مع التركيز على التعلم العميق والشبكات العصبية ودورها في تطوير التقنيات الحديثة."
        keyPoints={[
          "الذكاء الاصطناعي جزء أساسي من التقنيات الحديثة",
          "التعلم العميق يعتمد على الشبكات العصبية",
          "تطبيقات عملية متعددة في الحياة اليومية",
        ]}
      />
    </div>
  );
}
