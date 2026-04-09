import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0a0a0a',
            color: '#adaaaa',
            fontFamily: 'Inter, sans-serif',
            gap: 16,
          }}
          onClick={() => this.setState({ hasError: false, error: '' })}
        >
          <p style={{ fontSize: '1rem', color: '#85adff' }}>JARVIS encountered an error</p>
          <p style={{ fontSize: '0.75rem', opacity: 0.6, maxWidth: 400, textAlign: 'center' }}>
            {this.state.error}
          </p>
          <p style={{ fontSize: '0.75rem', opacity: 0.4, marginTop: 16 }}>Tap to recover</p>
        </div>
      )
    }
    return this.props.children
  }
}
