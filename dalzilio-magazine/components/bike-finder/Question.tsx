type Props = {
  title: string;
  options: string[];
  onSelect: (value: string) => void;
};

export default function Question({ title, options, onSelect }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-10 max-w-xl w-full">
      <h2 className="text-3xl font-bold text-center mb-8">
        {title}
      </h2>

      <div className="grid gap-4">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onSelect(option)}
            className="border rounded-xl p-4 hover:bg-gray-100 text-left"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}