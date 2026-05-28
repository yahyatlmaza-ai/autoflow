import { useState, ReactNode, createContext, useContext } from 'react';

interface TooltipProps {
  children: ReactNode;
  content?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

const TooltipCtx = createContext<{ show: boolean; setShow: (v: boolean) => void }>({ show: false, setShow: () => {} });

export function Tooltip({ children, content, side = 'top' }: TooltipProps) {
  const [show, setShow] = useState(false);
  const sideMap = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };
  return (
    <TooltipCtx.Provider value={{ show, setShow }}>
      <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
        {children}
        {content && show && (
          <div className={`absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded-md whitespace-nowrap ${sideMap[side]}`}>
            {content}
          </div>
        )}
      </div>
    </TooltipCtx.Provider>
  );
}

export function TooltipTrigger({ children, asChild }: { children: ReactNode; asChild?: boolean }) {
  const { setShow } = useContext(TooltipCtx);
  return (
    <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} style={{ display: 'contents' }}>
      {children}
    </div>
  );
}

export function TooltipContent({ children, side }: { children: ReactNode; side?: string }) {
  const { show } = useContext(TooltipCtx);
  if (!show) return null;
  const sideMap: Record<string, string> = {
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  };
  return (
    <div className={`absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded-md whitespace-nowrap ${sideMap[side||'top']||''}`}>
      {children}
    </div>
  );
}

export const TooltipProvider = ({ children }: { children: ReactNode }) => <>{children}</>;
