import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [pastAnalyses, setPastAnalyses] = useState([]);
  const [selectedPastIndex, setSelectedPastIndex] = useState(null);

  // Load past analyses from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('pastAnalyses');
    if (stored) {
      setPastAnalyses(JSON.parse(stored));
    }
  }, []);

  // Save past analyses to localStorage when changed
  useEffect(() => {
    localStorage.setItem('pastAnalyses', JSON.stringify(pastAnalyses));
  }, [pastAnalyses]);

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
      setPastAnalyses([
        {
          name: file.name,
          date: new Date().toLocaleString(),
          data: response.data,
        },
        ...pastAnalyses,
      ]);
      setSelectedPastIndex(null);
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
      setPastAnalyses([
        {
          name: 'Sample Statement',
          date: new Date().toLocaleString(),
          data: response.data,
        },
        ...pastAnalyses,
      ]);
      setSelectedPastIndex(null);
    } catch (err) {
      setError(
        err.response?.data?.error || 'Failed to analyze sample statement'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectPast = (index) => {
    setAnalysis(pastAnalyses[index].data);
    setSelectedPastIndex(index);
  };

  const handleDeletePast = (index, e) => {
    e.stopPropagation();
    const updated = pastAnalyses.filter((_, i) => i !== index);
    setPastAnalyses(updated);
    if (selectedPastIndex === index) {
      setAnalysis(null);
      setSelectedPastIndex(null);
    }
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <h2>Past Analyses</h2>
        {pastAnalyses.length === 0 && <p>No past analyses</p>}
        <ul className="past-list">
          {pastAnalyses.map((item, idx) => (
            <li
              key={idx}
              className={selectedPastIndex === idx ? 'selected' : ''}
              onClick={() => handleSelectPast(idx)}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>
                {item.name} <br />
                <small>{item.date}</small>
              </span>
              <button
                className="delete-btn"
                onClick={(e) => handleDeletePast(idx, e)}
                title="Delete"
                style={{ marginLeft: 8 }}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main className="container">
        <h1>Bank Statement Categorizer/Analyzer</h1>
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
      </main>
    </div>
  );
}

export default App;
