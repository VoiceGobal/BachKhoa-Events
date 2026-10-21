import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, Heart } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      if (typeof window !== 'undefined') {
        window.location.hash = '';
        window.location.reload();
      }
    } catch {
      this.setState({ hasError: false, error: null });
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FFFDF9] dark:bg-[#120216] text-stone-800 dark:text-stone-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 sm:p-8 bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border-2 border-rose-200 dark:border-rose-900 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-700 via-rose-600 to-amber-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-rose-300 dark:shadow-rose-950">
              <Heart className="w-8 h-8 fill-white" />
            </div>

            <div className="space-y-1">
              <h2 className="font-serif text-2xl font-black text-stone-900 dark:text-white">
                Chào Mừng Bạn Đến Với Sự Kiện
              </h2>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold uppercase tracking-wider">
                Trường Trung Cấp Công Nghiệp Bách Khoa Sầm Sơn – Thanh Hóa
              </p>
            </div>

            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              Trang web đang được tải lại để kết nối hệ thống. Xin vui lòng bấm nút bên dưới để bắt đầu trải nghiệm!
            </p>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-left text-xs text-rose-800 dark:text-rose-300 font-mono break-all line-clamp-3">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-700 via-rose-600 to-amber-500 hover:opacity-95 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Tải lại trang</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
