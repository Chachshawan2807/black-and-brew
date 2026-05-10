import { Package, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface InventorySummaryCardProps {
  locale: string;
  totalItems: number;
}

export default function InventorySummaryCard({ locale, totalItems }: InventorySummaryCardProps) {
  const t = useTranslations('Inventory');

  return (
    <Link href={`/${locale}/inventory`} className="glass-card p-4 flex flex-col justify-between h-full hover:border-blue-400 hover:-translate-y-[2px] hover:shadow-xl transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
          <Package className="w-5 h-5 text-emerald-500" strokeWidth={1.5} />
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
      </div>
      <div className="mt-4">
        <h3 className="text-xl font-normal tracking-tight text-[#000000] leading-tight">
          {t('title')}
        </h3>
        <p className="text-sm text-gray-500 font-normal mt-1">
          {t('description')}
        </p>
        <div className="mt-4 flex items-baseline">
          <span className="text-3xl font-normal text-[#000000]">{totalItems}</span>
          <span className="text-base text-[#000000] ml-2">{t('items')}</span>
        </div>
      </div>
    </Link>
  );
}
