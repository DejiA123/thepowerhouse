import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ListRow, PictureTile } from '@/components/page/PageKit';
import { TILE, destination, pathOf, type TileColor } from '@/data/appDirectory';

/** A coloured picture for a list row, a little bigger than the usual badge. */
export const RowPicture = ({ icon: Icon, color }: { icon: LucideIcon; color: TileColor }) => (
  <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] text-white shadow-sm', TILE[color])}>
    <Icon className="h-[22px] w-[22px]" />
  </span>
);

const useOpen = () => {
  const navigate = useNavigate();
  return (to: string) => (/^https?:/.test(to) ? window.open(to, '_blank', 'noopener') : navigate(to));
};

/** A place in the app as a list row (picture, name, one line). */
export const PlaceRow = ({ id, title, subtitle, trailing }: { id: string; title?: ReactNode; subtitle?: ReactNode; trailing?: ReactNode }) => {
  const open = useOpen();
  const d = destination(id);
  return (
    <ListRow
      leading={<RowPicture icon={d.icon} color={d.color} />}
      title={title ?? d.title}
      subtitle={subtitle ?? d.subtitle}
      onClick={() => open(pathOf(d))}
      trailing={trailing}
      chevron
      className="min-h-[68px] py-3"
    />
  );
};

/** A place in the app as a big picture button. */
export const PlaceTile = ({ id, title, subtitle, layout }: { id: string; title?: ReactNode; subtitle?: ReactNode; layout?: 'stack' | 'row' }) => {
  const open = useOpen();
  const d = destination(id);
  return (
    <PictureTile
      icon={d.icon}
      tint={TILE[d.color]}
      title={title ?? d.title}
      subtitle={subtitle ?? d.subtitle}
      layout={layout}
      onClick={() => open(pathOf(d))}
    />
  );
};
