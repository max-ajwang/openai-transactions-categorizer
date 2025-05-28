import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append('bankStatement', file);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/analyze',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      setAnalysis(response.data);
    } catch (err) {
      setError(
        err.response?.data?.error || 'Failed to analyze the bank statement'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSampleAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await axios.get(
        'http://localhost:5000/api/analyze/sample'
      );
      setAnalysis(response.data);
    } catch (err) {
      setError(
        err.response?.data?.error || 'Failed to analyze sample statement'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="container">
      <h1>Bank Statement Analyzer</h1>
      <p className="subtitle">
        Upload your bank statement PDF to get categorized transactions and
        spending insights
      </p>

      <div className="upload-section">
        <form onSubmit={handleSubmit}>
          <div className="file-input">
            <label>
              Select Bank Statement (PDF):
              <input type="file" onChange={handleFileChange} accept=".pdf" />
            </label>
            {file && <p>Selected: {file.name}</p>}
          </div>
          <button type="submit" disabled={isAnalyzing}>
            {isAnalyzing ? 'Analyzing...' : 'Analyze Statement'}
          </button>
        </form>

        <div className="sample-section">
          <p>Or try with a sample statement:</p>
          <button onClick={handleSampleAnalysis} disabled={isAnalyzing}>
            Analyze Sample
          </button>
        </div>

        {error && <div className="error">{error}</div>}
      </div>

      {analysis && (
        <div className="results">
          <h2>Analysis Results</h2>

          <div className="transactions-section">
            <h3>Transactions ({analysis.transactions.length})</h3>
            <div className="transaction-list">
              {analysis.transactions.map((t, i) => (
                <div
                  key={i}
                  className={`transaction ${t.category.toLowerCase()}`}
                >
                  <div className="transaction-header">
                    <span className="date">{t.date}</span>
                    <span className="category">{t.category}</span>
                    <span className="amount">
                      {t.currency} {t.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="description">{t.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="insights-section">
            <h3>Spending Insights</h3>
            <div className="insights-content">
              {analysis.insights.split('\n').map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
