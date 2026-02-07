import { useState } from 'react';
import axios from 'axios';
import './App.css';

interface CorepFieldUpdate {
  field_id: string;
  value: number;
  rule_ref: string;
  reasoning: string;
}

interface ChatMessage {
  sender: 'User' | 'Bot';
  text: string;
}

interface TableData {
  row_sovereign_exposure: number | null;
  row_retail_exposure: number | null;
}

function App() {
  const [input, setInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [tableData, setTableData] = useState<TableData>({
    row_sovereign_exposure: null,
    row_retail_exposure: null,
  });

  const [lastAudit, setLastAudit] = useState<CorepFieldUpdate | null>(null);

  // --- NEW: Clear Chat Function ---
  const clearChat = () => {
    setChatHistory([]);
    setLastAudit(null);
    // Optional: clear table too if you want a full reset
    // setTableData({ row_sovereign_exposure: null, row_retail_exposure: null });
  };

  // --- NEW: Download CSV Function ---
  const downloadCSV = () => {
    // 1. Define the headers
    const headers = ["Exposure Class, Risk Weight, Value (GBP)"];
    
    // 2. Create the rows based on current data
    const rows = [
      `Central Governments, 0%, ${tableData.row_sovereign_exposure ?? 0}`,
      `Retail Exposures, 75%, ${tableData.row_retail_exposure ?? 0}`
    ];

    // 3. Combine them
    const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
    
    // 4. Create a download link and click it programmatically
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "corep_own_funds_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const newHistory = [...chatHistory, { sender: 'User', text: input }];
    setChatHistory(newHistory as ChatMessage[]);
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:8000/analyze', null, {
        params: { user_query: input }
      });

      const data = response.data;
      setChatHistory([...newHistory, { sender: 'Bot', text: data.response_text }]);

      if (data.data_update) {
        const update = data.data_update;
        setTableData(prev => ({
          ...prev,
          [update.field_id]: update.value
        }));
        setLastAudit(update);
      }

    } catch (error) {
      console.error("Connection Error:", error);
      setChatHistory([...newHistory, { sender: 'Bot', text: "Error: Could not connect to backend." }]);
    }
    
    setLoading(false);
    setInput("");
  };

  return (
    <div className="app-container">
      
      {/* LEFT PANEL: Chat Interface */}
      <div className="chat-panel">
        <header>
          <h2>PRA Assistant</h2>
          <button onClick={clearChat} className="secondary-btn">Clear Chat</button>
        </header>
        
        <div className="chat-window">
          {chatHistory.length === 0 && <p className="placeholder">Describe a scenario to fill the report...</p>}
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`message ${msg.sender.toLowerCase()}`}>
              <strong>{msg.sender}:</strong> {msg.text}
            </div>
          ))}
          {loading && <div className="message bot">Thinking...</div>}
        </div>

        <div className="input-area">
          <input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="e.g. 'We invested 10m in UK Gilts'"
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button onClick={handleSend} disabled={loading}>Send</button>
        </div>
      </div>

      {/* RIGHT PANEL: COREP Report Template */}
      <div className="report-panel">
        <header>
          <h2>COREP: Own Funds (C 01.00)</h2>
          <button onClick={downloadCSV} className="download-btn">Download CSV ⬇️</button>
        </header>

        <div className="table-wrapper">
          <table className="corep-table">
            <thead>
              <tr>
                <th>Exposure Class</th>
                <th>Risk Weight</th>
                <th>Risk Weighted Assets (Value)</th>
              </tr>
            </thead>
            <tbody>
              <tr className={lastAudit?.field_id === "row_sovereign_exposure" ? "highlight-row" : ""}>
                <td>Central Governments (Sovereign)</td>
                <td>0%</td>
                <td className="data-cell">
                  {tableData.row_sovereign_exposure !== null ? `£${tableData.row_sovereign_exposure}m` : <span className="empty">-</span>}
                </td>
              </tr>
              <tr className={lastAudit?.field_id === "row_retail_exposure" ? "highlight-row" : ""}>
                <td>Retail Exposures</td>
                <td>75%</td>
                <td className="data-cell">
                  {tableData.row_retail_exposure !== null ? `£${tableData.row_retail_exposure}m` : <span className="empty">-</span>}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="audit-log">
          <h3>🧾 Regulatory Audit Trail</h3>
          {lastAudit ? (
            <div className="audit-card">
              <p><strong>Field Updated:</strong> {lastAudit.field_id}</p>
              <p><strong>Rule Applied:</strong> {lastAudit.rule_ref}</p>
              <p><strong>Reasoning:</strong> {lastAudit.reasoning}</p>
            </div>
          ) : (
            <p className="audit-placeholder">No updates yet.</p>
          )}
        </div>

      </div>
    </div>
  );
}

export default App;