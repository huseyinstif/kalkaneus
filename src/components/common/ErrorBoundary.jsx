import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Error Boundary Component for catching React errors
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-dark-900 border border-dark-700 rounded-lg p-8">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-red-900/20 rounded-lg">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-dark-100 mb-2">
                  Something went wrong
                </h1>
                <p className="text-dark-400 mb-4">
                  The application encountered an unexpected error. This has been logged for investigation.
                </p>
                
                {this.state.error && (
                  <div className="bg-dark-950 border border-dark-800 rounded p-4 mb-4">
                    <p className="text-sm font-mono text-red-400 mb-2">
                      {this.state.error.toString()}
                    </p>
                    {this.state.errorInfo && (
                      <details className="text-xs font-mono text-dark-500">
                        <summary className="cursor-pointer hover:text-dark-400">
                          Stack trace
                        </summary>
                        <pre className="mt-2 overflow-auto">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={this.handleReset}
                    className="btn btn-primary flex items-center space-x-2"
                  >
                    <RefreshCw size={16} />
                    <span>Try Again</span>
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="btn btn-secondary"
                  >
                    Reload Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
