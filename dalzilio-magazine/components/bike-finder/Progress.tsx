type Props = {
  step: number;
  total: number;
};

export default function Progress({ step, total }: Props) {
  const percent = (step / total) * 100;

  return (
    <div className="mb-8">
      <div className="flex justify-between text-sm mb-2">
        <span>Domanda {step}</span>
        <span>{step}/{total}</span>
      </div>

      <div className="w-full h-2 bg-gray-200 rounded-full">
        <div
          className="h-2 bg-black rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}