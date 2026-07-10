type Props = {
  onStart: () => void;
};

export default function Welcome({ onStart }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-10 max-w-xl w-full text-center">
      <h1 className="text-4xl font-bold mb-4">
        🚴 Trova la bici perfetta
      </h1>

      <p className="text-gray-600 mb-8">
        Ti faremo 6 domande.
        <br />
        Ci vorrà meno di un minuto.
      </p>

      <button
        onClick={onStart}
        className="bg-black text-white px-8 py-4 rounded-xl text-lg hover:bg-gray-800"
      >
        Inizia
      </button>
    </div>
  );
}