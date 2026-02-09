import { useState, useRef } from "react";
import axios from "axios";
import "./App.css";

interface CorepFieldUpdate {
  field_id: string;
  value: number;
  rule_ref: string;
  reasoning: string;
  source_page?: string;
}

interface ChatMessage {
  sender: "User" | "Bot";
  text: string;
}

interface TableData {
  row_sovereign_exposure: number | string;
  row_retail_exposure: number | string;
}

function App() {
  const [input, setInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tableData, setTableData] = useState<TableData>({
    row_sovereign_exposure: "",
    row_retail_exposure: "",
  });

  // --- NEW: Baseline State for Scenario Comparison ---
  const [baselineData, setBaselineData] = useState<TableData | null>(null);

  const [lastAudit, setLastAudit] = useState<CorepFieldUpdate | null>(null);

  // --- Handlers ---

  const clearChat = () => {
    setChatHistory([]);
    setLastAudit(null);
    setTableData({ row_sovereign_exposure: "", row_retail_exposure: "" });
    setBaselineData(null); // Clear baseline too
  };

  const toggleBaseline = () => {
    if (baselineData) {
      // If baseline exists, clear it (Unlock)
      setBaselineData(null);
    } else {
      // Save current state as baseline (Lock)
      setBaselineData({ ...tableData });
    }
  };

  const downloadCSV = () => {
    const headers = ["Exposure Class, Risk Weight, Value (GBP), Baseline Diff"];

    // Helper to get diff string
    const getDiff = (key: keyof TableData) => {
      if (!baselineData) return "0";
      const current = Number(tableData[key]) || 0;
      const base = Number(baselineData[key]) || 0;
      return current - base;
    };

    const rows = [
      `Central Governments, 0%, ${tableData.row_sovereign_exposure || 0}, ${getDiff("row_sovereign_exposure")}`,
      `Retail Exposures, 75%, ${tableData.row_retail_exposure || 0}, ${getDiff("row_retail_exposure")}`,
    ];
    const csvContent =
      "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "corep_scenario_report.csv";
    link.click();
  };

  const handleCellEdit = (field: keyof TableData, value: string) => {
    setTableData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const newHistory = [
      ...chatHistory,
      {
        sender: "User" as const,
        text: `📄 Uploading document: ${file.name}...`,
      },
    ];
    setChatHistory(newHistory);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        "http://localhost:8000/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      const data = response.data;
      setChatHistory([
        ...newHistory,
        { sender: "Bot" as const, text: data.response_text },
      ]);

      if (data.data_update) {
        const update = data.data_update;
        setTableData((prev) => ({ ...prev, [update.field_id]: update.value }));
        setLastAudit(update);
      }
    } catch (error) {
      setChatHistory([
        ...newHistory,
        { sender: "Bot" as const, text: "Error processing document." },
      ]);
    }
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const newHistory = [
      ...chatHistory,
      { sender: "User" as const, text: input },
    ];
    setChatHistory(newHistory);
    setLoading(true);
    try {
      const response = await axios.post("http://localhost:8000/analyze", null, {
        params: { user_query: input },
      });
      const data = response.data;
      setChatHistory([
        ...newHistory,
        { sender: "Bot" as const, text: data.response_text },
      ]);
      if (data.data_update) {
        setTableData((prev) => ({
          ...prev,
          [data.data_update.field_id]: data.data_update.value,
        }));
        setLastAudit(data.data_update);
      }
    } catch (error) {
      setChatHistory([
        ...newHistory,
        { sender: "Bot" as const, text: "Connection Error." },
      ]);
    }
    setLoading(false);
    setInput("");
  };

  // Helper component to render the Diff
  const RenderDiff = ({ field }: { field: keyof TableData }) => {
    if (!baselineData) return null;

    const current = Number(tableData[field]) || 0;
    const base = Number(baselineData[field]) || 0;
    const diff = current - base;

    if (diff === 0) return null;

    return (
      <span className={`diff-tag ${diff > 0 ? "pos" : "neg"}`}>
        {diff > 0 ? "+" : ""}
        {diff}m
      </span>
    );
  };

  return (
    <div className="app-container">
      {/* LEFT PANEL */}
      <div className="chat-panel">
        <header>
          <h2>PRA Assistant</h2>
          <button onClick={clearChat} className="secondary-btn">
            Reset
          </button>
        </header>

        <div className="chat-window">
          {chatHistory.length === 0 && (
            <p className="placeholder">
              Upload a Balance Sheet or describe a scenario...
            </p>
          )}
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`message ${msg.sender.toLowerCase()}`}>
              <strong>{msg.sender === "User" ? "You" : "Bot"}:</strong>{" "}
              {msg.text}
            </div>
          ))}
          {loading && <div className="message bot">Thinking...</div>}
        </div>

        <div className="input-area">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileUpload}
            accept=".pdf,.txt"
          />
          <button
            className="attach-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            📎
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type message..."
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button onClick={handleSend} disabled={loading}>
            Send
          </button>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="report-panel">
        <header>
          <div>
            <h2>COREP: Own Funds</h2>
            {baselineData && (
              <span className="scenario-badge">Comparing to Baseline</span>
            )}
          </div>
          <div className="header-actions">
            <button
              onClick={toggleBaseline}
              className={`baseline-btn ${baselineData ? "active" : ""}`}
            >
              {baselineData ? "🔓 Unlock Baseline" : "🔒 Lock Baseline"}
            </button>
            <button onClick={downloadCSV} className="download-btn">
              Download CSV ⬇️
            </button>
          </div>
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
              {/* Row 1 */}
              <tr
                className={
                  lastAudit?.field_id === "row_sovereign_exposure"
                    ? "highlight-row"
                    : ""
                }
              >
                <td>Central Governments (Sovereign)</td>
                <td>0%</td>
                <td className="data-cell input-cell">
                  <span className="currency-symbol">£</span>
                  <input
                    type="number"
                    value={tableData.row_sovereign_exposure}
                    onChange={(e) =>
                      handleCellEdit("row_sovereign_exposure", e.target.value)
                    }
                    placeholder="0"
                  />
                  <span className="unit">m</span>
                  <RenderDiff field="row_sovereign_exposure" />
                </td>
              </tr>

              {/* Row 2 */}
              <tr
                className={
                  lastAudit?.field_id === "row_retail_exposure"
                    ? "highlight-row"
                    : ""
                }
              >
                <td>Retail Exposures</td>
                <td>75%</td>
                <td className="data-cell input-cell">
                  <span className="currency-symbol">£</span>
                  <input
                    type="number"
                    value={tableData.row_retail_exposure}
                    onChange={(e) =>
                      handleCellEdit("row_retail_exposure", e.target.value)
                    }
                    placeholder="0"
                  />
                  <span className="unit">m</span>
                  <RenderDiff field="row_retail_exposure" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="audit-log">
          <h3>🧾 Regulatory Audit Trail</h3>
          {lastAudit ? (
            <div className="audit-card">
              <p>
                <strong>Field Updated:</strong> {lastAudit.field_id}
              </p>
              <p>
                <strong>Rule Applied:</strong> {lastAudit.rule_ref}
              </p>
              <p>
                <strong>Source:</strong>{" "}
                {lastAudit.source_page || "System Memory"}
              </p>
              <p>
                <strong>Reasoning:</strong> {lastAudit.reasoning}
              </p>
            </div>
          ) : (
            <p style={{ color: "#999" }}>No updates yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
