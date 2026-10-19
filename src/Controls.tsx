import {
  Children,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type ChangeEvent,
  type SelectHTMLAttributes,
} from "react";
import { ChevronDown, Check } from "lucide-react";

export function Select({
  children,
  value,
  onChange,
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const options = Children.toArray(children).flatMap((child) =>
    isValidElement<{ value: string; children: ReactNode; disabled?: boolean }>(
      child,
    )
      ? [
          {
            value: String(child.props.value),
            label: child.props.children,
            disabled: child.props.disabled,
          },
        ]
      : [],
  );
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    width: 180,
    maxHeight: 220,
  });
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const r = root.current!.getBoundingClientRect();
      const below = window.innerHeight - r.bottom - 12;
      const height = Math.min(
        220,
        Math.max(80, below >= 160 ? below : r.top - 12),
      );
      setPosition({
        left: Math.max(
          8,
          Math.min(r.left, window.innerWidth - Math.max(r.width, 180) - 8),
        ),
        top: below >= 160 ? r.bottom + 5 : Math.max(8, r.top - height - 5),
        width: Math.max(r.width, 180),
        maxHeight: height,
      });
    };
    measure();
    document.addEventListener("scroll", measure, true);
    return () => document.removeEventListener("scroll", measure, true);
  }, [open]);
  useEffect(() => {
    if (open)
      document
        .getElementById(`${id}-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, open, id]);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        root.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("keydown", escape, true);
    const resize = () => setOpen(false);
    window.addEventListener("resize", resize);
    document.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape, true);
      window.removeEventListener("resize", resize);
    };
  }, [open]);
  const choose = (index: number) => {
    if (!options[index] || options[index].disabled) return;
    onChange?.({
      target: { value: options[index].value },
    } as ChangeEvent<HTMLSelectElement>);
    setOpen(false);
  };
  return (
    <div className={`custom-select ${className}`} ref={root}>
      <button
        type="button"
        id={props.id}
        disabled={props.disabled}
        aria-label={props["aria-label"] || props.name || "Choose option"}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        onClick={() => {
          setActive(
            Math.max(
              0,
              options.findIndex((o) => o.value === String(value)),
            ),
          );
          setOpen(!open);
        }}
        onBlur={(e) => {
          if (!e.currentTarget.parentElement?.contains(e.relatedTarget))
            setOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape" && open) {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
          }
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
            e.preventDefault();
            setOpen(true);
            setActive((n) =>
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? options.length - 1
                  : Math.max(
                      0,
                      Math.min(
                        options.length - 1,
                        n + (e.key === "ArrowDown" ? 1 : -1),
                      ),
                    ),
            );
          }
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (open) choose(active);
            else {
              setActive(
                Math.max(
                  0,
                  options.findIndex((o) => o.value === String(value)),
                ),
              );
              setOpen(true);
            }
          }
          if (e.key.length === 1 && e.key !== " ") {
            const i = options.findIndex((o) =>
              String(o.label).toLowerCase().startsWith(e.key.toLowerCase()),
            );
            if (i >= 0) {
              setActive(i);
              setOpen(true);
            }
          }
        }}
      >
        <span>
          {options.find((o) => o.value === String(value))?.label || "Choose…"}
        </span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          id={id}
          role="listbox"
          className="select-menu"
          style={{ position: "fixed", ...position, minWidth: position.width }}
        >
          {options.map((o, i) => (
            <div
              role="option"
              id={`${id}-${i}`}
              key={o.value}
              aria-selected={o.value === String(value)}
              aria-disabled={o.disabled}
              className={active === i ? "highlighted" : ""}
              onPointerMove={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(i)}
            >
              {o.label}
              {o.value === String(value) && <Check size={14} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
export function useStoredWidth(
  key: string,
  fallback: number,
  min: number,
  max: number,
) {
  const [width, setWidth] = useState(() => {
    try {
      const n = Number(localStorage.getItem(key));
      return n ? Math.max(min, Math.min(max, n)) : fallback;
    } catch {
      return fallback;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, String(width));
    } catch {}
  }, [key, width]);
  return [
    width,
    (n: number) => setWidth(Math.max(min, Math.min(max, n))),
  ] as const;
}
export function ResizeHandle({
  width,
  setWidth,
  min,
  max,
  side = "left",
  label,
  centered = false,
}: {
  width: number;
  setWidth: (n: number) => void;
  min: number;
  max: number;
  side?: "left" | "right";
  label: string;
  centered?: boolean;
}) {
  return (
    <div
      className={`resize-handle ${side}`}
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          setWidth(
            width +
              (e.key === "ArrowRight" ? 1 : -1) *
                (side === "right" ? 1 : -1) *
                20,
          );
        }
      }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.dataset.origin = String(e.clientX);
        e.currentTarget.dataset.width = String(width);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId))
          setWidth(
            Number(e.currentTarget.dataset.width) +
              (e.clientX - Number(e.currentTarget.dataset.origin)) *
                (side === "right" ? 1 : -1) *
                (centered ? 2 : 1),
          );
      }}
      onPointerUp={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId))
          e.currentTarget.releasePointerCapture(e.pointerId);
      }}
    />
  );
}
export function DetailPanel({
  children,
  focused,
}: {
  children: ReactNode;
  focused: boolean;
}) {
  const [width, setWidth] = useStoredWidth(
    "clinear-detail-width",
    480,
    400,
    720,
  );
  return (
    <aside className={`detail ${focused ? "focused" : ""}`} style={{ width }}>
      {!focused && (
        <ResizeHandle
          width={width}
          setWidth={setWidth}
          min={400}
          max={720}
          label="Resize issue panel"
        />
      )}
      {children}
    </aside>
  );
}
