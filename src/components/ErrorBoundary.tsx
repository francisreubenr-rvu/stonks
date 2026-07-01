import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Stonks error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="min-h-dvh flex items-center justify-center bg-background">
          <div className="max-w-md text-center space-y-4 px-6">
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center" style={{ background: 'var(--delta-negative-bg)' }}>
              <span className="text-lg" style={{ color: 'var(--delta-negative)' }}>!</span>
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--delta-negative)' }}>Something went wrong</p>
            <p className="text-xs text-muted-foreground">
              {this.state.error?.message ?? 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="text-xs font-medium px-4 py-2 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
