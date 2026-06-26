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
        <div className="min-h-dvh flex items-center justify-center" style={{ background: '#0A0E17' }}>
          <div className="max-w-md text-center space-y-4 px-6">
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.12)' }}>
              <span className="text-lg" style={{ color: '#EF4444' }}>!</span>
            </div>
            <p className="text-sm font-medium" style={{ color: '#F87171' }}>Something went wrong</p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              {this.state.error?.message ?? 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="text-xs font-medium px-4 py-2 rounded-md border transition-colors cursor-pointer"
              style={{
                color: '#9CA3AF',
                borderColor: 'rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
              }}
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
