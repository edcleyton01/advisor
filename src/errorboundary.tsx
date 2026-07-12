import { Component, type ErrorInfo, type ReactNode } from 'react'

// Última linha de defesa: um erro de render em qualquer tela é capturado aqui
// em vez de virar tela branca. Mostra uma saída clara (recarregar) e o detalhe
// técnico recolhido, sem derrubar a sessão do usuário.
interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ui] erro não tratado:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="login-wrap">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div className="brand-mark" style={{ width: 44, height: 44, fontSize: 20, margin: '0 auto' }}>A</div>
          <div className="display" style={{ fontSize: 20, marginTop: 18 }}>Algo deu errado</div>
          <div className="muted" style={{ marginTop: 10, fontSize: 13.5, lineHeight: 1.55 }}>
            A tela encontrou um erro inesperado. Seus dados estão salvos — recarregar costuma resolver.
          </div>
          <button className="btn" style={{ margin: '20px auto 0', display: 'block' }} onClick={() => location.reload()}>
            Recarregar
          </button>
          <details style={{ marginTop: 16, textAlign: 'left' }}>
            <summary className="muted" style={{ fontSize: 12, cursor: 'pointer' }}>Detalhes técnicos</summary>
            <pre style={{
              marginTop: 8, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 160, overflow: 'auto',
            }}>{error.message}</pre>
          </details>
        </div>
      </div>
    )
  }
}
