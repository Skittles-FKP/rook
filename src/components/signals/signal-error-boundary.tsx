"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type BoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
  label: string;
};

type BoundaryState = {
  error: Error | null;
};

export class SignalErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[signal-error-boundary]", {
      label: this.props.label,
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div className="surface-card rounded-xl border-rook-amber/30 p-4">
          <p className="text-sm font-black text-rook-amber">{this.props.label} unavailable</p>
          <p className="mt-2 text-sm leading-6 text-rook-muted">
            Rook isolated this panel so the rest of the Signal can continue rendering.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export function CommentThreadBoundary({ children }: { children: ReactNode }) {
  return (
    <SignalErrorBoundary label="Comment thread">
      {children}
    </SignalErrorBoundary>
  );
}

export function MediaBoundary({ children }: { children: ReactNode }) {
  return (
    <SignalErrorBoundary label="Media">
      {children}
    </SignalErrorBoundary>
  );
}
