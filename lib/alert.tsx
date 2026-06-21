import * as React from "react";
import { createRoot } from "react-dom/client";
import {
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle,
} from "lucide-react";

type AlertType = "success" | "error" | "info" | "warning";

interface AlertOptions {
  title?: string;
  type?: AlertType;
  autoClose?: number;
}

const iconMap: Record<AlertType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const colorMap: Record<AlertType, { icon: string; bg: string; border: string; btn: string }> = {
  success: {
    icon: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    btn: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  error: {
    icon: "text-red-500",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    btn: "bg-red-600 hover:bg-red-700 text-white",
  },
  info: {
    icon: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    btn: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  warning: {
    icon: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    btn: "bg-amber-600 hover:bg-amber-700 text-white",
  },
};

function detectType(message: string): AlertType {
  if (/成功|已复制|已移除|已发布/.test(message)) return "success";
  if (/失败|错误|无法/.test(message)) return "error";
  if (/请输入|暂无/.test(message)) return "warning";
  return "info";
}

function CustomAlert({
  message,
  type,
  onClose,
  autoClose,
}: {
  message: string;
  type: AlertType;
  onClose: () => void;
  autoClose?: number;
}) {
  const Icon = iconMap[type];
  const colors = colorMap[type];

  React.useEffect(() => {
    if (autoClose && autoClose > 0) {
      const timer = setTimeout(onClose, autoClose);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" />
      <div
        className={`relative z-10 w-full max-w-sm mx-4 rounded-2xl border ${colors.border} ${colors.bg} shadow-2xl animate-in zoom-in-95 fade-in duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center p-6 text-center">
          <div className={`mb-3 ${colors.icon}`}>
            <Icon className="h-12 w-12" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-foreground leading-relaxed">
            {message}
          </p>
        </div>
        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className={`w-full h-10 rounded-xl text-sm font-medium transition-colors ${colors.btn}`}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

export function showAlert(message: string, options?: AlertOptions) {
  const type = options?.type || detectType(message);
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);

  const cleanup = () => {
    root.unmount();
    container.remove();
  };

  const autoClose = options?.autoClose ?? (type === "success" ? 2000 : undefined);

  root.render(
    <CustomAlert message={message} type={type} onClose={cleanup} autoClose={autoClose} />
  );
}

function CustomConfirm({
  message,
  onConfirm,
  onCancel,
  confirmText,
  loading,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  loading?: boolean;
}) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
      if (e.key === "Enter" && !loading) {
        onConfirm();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, onConfirm, loading]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
    >
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onCancel} />
      <div
        className="relative z-10 w-full max-w-sm mx-4 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 shadow-2xl animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center p-6 text-center">
          <div className="mb-3 text-amber-500">
            <AlertTriangle className="h-12 w-12" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-foreground leading-relaxed">
            {message}
          </p>
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 h-10 rounded-xl text-sm font-medium transition-colors bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-10 rounded-xl text-sm font-medium transition-colors bg-white dark:bg-zinc-800 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {confirmText || "确定删除"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function showConfirm(
  message: string,
  options?: { confirmText?: string }
): Promise<boolean> {
  return new Promise((resolve) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const cleanup = () => {
      root.unmount();
      container.remove();
    };

    root.render(
      <ConfirmWithState
        message={message}
        confirmText={options?.confirmText}
        onResolve={(result) => { cleanup(); resolve(result); }}
      />
    );
  });
}

function ConfirmWithState({
  message,
  confirmText,
  onResolve,
}: {
  message: string;
  confirmText?: string;
  onResolve: (result: boolean) => void;
}) {
  const [loading, setLoading] = React.useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    onResolve(true);
  };

  return (
    <CustomConfirm
      message={message}
      onConfirm={handleConfirm}
      onCancel={() => onResolve(false)}
      confirmText={confirmText}
      loading={loading}
    />
  );
}
