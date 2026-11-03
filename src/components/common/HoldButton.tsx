import { forwardRef } from 'react';
import { useLongPress } from '@/hooks/useLongPress';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { onHold?: () => void };

/** A button that also does something when held (a chat's preview, like WhatsApp) */
const HoldButton = forwardRef<HTMLButtonElement, Props>(({ onHold, style, ...rest }, ref) => {
  const hold = useLongPress(() => onHold?.());
  if (!onHold) return <button ref={ref} style={style} {...rest} />;
  const { style: holdStyle, ...handlers } = hold;
  return <button ref={ref} style={{ ...holdStyle, ...style }} {...rest} {...handlers} />;
});
HoldButton.displayName = 'HoldButton';

export default HoldButton;
