import { Link } from 'react-router-dom';

type Mini = { id: number; nome: string; imgUrl: string; preco: number; unit?: string };

export default function ProductMiniCard({ item }: { item: Mini }) {
  return (
    <Link
      to={`/produtos/${item.id}`}
      className="w-40 flex-shrink-0 bg-white border rounded-lg overflow-hidden hover:shadow transition"
      title={item.nome}
    >
      <div className="h-28 flex items-center justify-center bg-white">
        <img
          src={item.imgUrl}
          alt={item.nome}
          className="max-h-full max-w-full object-contain p-2"
          loading="lazy"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            el.onerror = null;
            el.src = `https://placehold.co/300x200/eeeeee/333333?text=${encodeURIComponent(item.nome.slice(0,24))}`;
          }}
        />
      </div>
      <div className="p-2">
        <div className="text-xs font-medium line-clamp-2 h-8">{item.nome}</div>
        <div className="text-sm text-green-600 font-semibold mt-1">
          R$ {item.preco.toFixed(2)}
        </div>
        {item.unit && <div className="text-[11px] text-gray-500">{item.unit}</div>}
      </div>
    </Link>
  );
}