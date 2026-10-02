import React from 'react';

/**
 * Application-level error boundary.
 *
 * Catches render-time throws so a single failing page (or a failing lazy
 * chunk) degrades to a recoverable panel instead of blanking the SPA.
 * Must be a class component: hooks have no equivalent of
 * componentDidCatch / getDerivedStateFromError.
 */
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null, info: null, showDetails: false };
        this.handleReset = this.handleReset.bind(this);
        this.toggleDetails = this.toggleDetails.bind(this);
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        this.setState({ info });
        // Surface the stack for debugging; harmless in production.
        console.error('ErrorBoundary caught:', error, info);
    }

    handleReset() {
        this.setState({ error: null, info: null, showDetails: false });
    }

    toggleDetails() {
        this.setState((prev) => ({ showDetails: !prev.showDetails }));
    }

    render() {
        const { error, info, showDetails } = this.state;
        const { children, label } = this.props;

        if (!error) return children;

        return (
            <div
                role="alert"
                aria-live="assertive"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '60vh',
                    padding: '32px 20px',
                }}
            >
                <div
                    style={{
                        width: '100%',
                        maxWidth: '560px',
                        background: 'var(--s2)',
                        border: '1px solid var(--bd)',
                        borderRadius: 'var(--rad)',
                        padding: '28px',
                        color: 'var(--tx)',
                    }}
                >
                    <h2 style={{ margin: '0 0 8px', fontSize: '1.25rem' }}>
                        Something went wrong{label ? ` in the ${label} view` : ''}
                    </h2>
                    <p style={{ margin: '0 0 20px', color: 'var(--tx2)', lineHeight: 1.6 }}>
                        Your conlang data is saved locally and is unaffected. You can try
                        loading this view again, or return home.
                    </p>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={this.handleReset}
                            style={{
                                background: 'var(--acc)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 'var(--rad)',
                                padding: '10px 18px',
                                cursor: 'pointer',
                                fontWeight: 600,
                            }}
                        >
                            Try again
                        </button>
                        <button
                            type="button"
                            onClick={() => { window.location.href = '/'; }}
                            style={{
                                background: 'transparent',
                                color: 'var(--tx)',
                                border: '1px solid var(--bd)',
                                borderRadius: 'var(--rad)',
                                padding: '10px 18px',
                                cursor: 'pointer',
                            }}
                        >
                            Go home
                        </button>
                    </div>

                    <div style={{ marginTop: '20px' }}>
                        <button
                            type="button"
                            onClick={this.toggleDetails}
                            aria-expanded={showDetails}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--tx3)',
                                cursor: 'pointer',
                                padding: 0,
                                fontSize: '0.85rem',
                                textDecoration: 'underline',
                            }}
                        >
                            {showDetails ? 'Hide technical details' : 'Show technical details'}
                        </button>

                        {showDetails && (
                            <pre
                                style={{
                                    marginTop: '12px',
                                    padding: '14px',
                                    background: 'var(--s4)',
                                    border: '1px solid var(--bd)',
                                    borderRadius: 'var(--rad)',
                                    color: 'var(--tx2)',
                                    fontSize: '0.78rem',
                                    overflowX: 'auto',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    maxHeight: '280px',
                                }}
                            >
                                {String(error && (error.stack || error.message || error))}
                                {info && info.componentStack ? `\n${info.componentStack}` : ''}
                            </pre>
                        )}
                    </div>
                </div>
            </div>
        );
    }
}
