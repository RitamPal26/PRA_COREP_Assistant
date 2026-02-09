# PRA COREP Reporting Assistant

This project is an LLM-assisted prototype designed to help UK banks automate the completion of COREP (Common Reporting) regulatory returns. It utilizes a Retrieval-Augmented Generation (RAG) pipeline to interpret natural language scenarios and financial documents, retrieve relevant Prudential Regulation Authority (PRA) rules, and populate a structured reporting template with a complete audit trail.

## Features

* **Regulatory RAG Pipeline:** Retrieves relevant PRA rules and instructions based on user input or uploaded documents.
* **Document Ingestion:** Supports uploading PDF or TXT files (e.g., Balance Sheets). The system extracts financial data automatically to populate the report.
* **Automated Template Population:** Converts unstructured text (e.g., "We invested 20m in UK Gilts") into structured data for the COREP Own Funds (C 01.00) template.
* **Human-in-the-Loop Editing:** Allows analysts to manually override AI-generated values directly in the table.
* **Scenario Comparison (A/B Testing):** Features a "Lock Baseline" mode to compare current data against a saved snapshot, visualizing differences (e.g., `+£5m`) for stress testing.
* **Source Highlighting:** Provides specific rule references (e.g., "Article 114(4)") and source metadata (Filename + Page Number) to justify every data entry.
* **Split-Screen Interface:** Displays the chat interaction alongside the live-updating report.
* **CSV Export:** Allows users to download the populated report, including scenario differences, for further analysis.
* **Local Embeddings:** Uses HuggingFace embeddings running locally for privacy and speed.

## Tech Stack

* **Frontend:** React, TypeScript, Vite
* **Backend:** Python, FastAPI, Uvicorn
* **AI/LLM:** LangChain, Google Gemini (via API), FAISS (Vector Store), HuggingFace (Embeddings)
* **Data Processing:** PyPDF (PDF Extraction), Pandas

## Prerequisites

Ensure you have the following installed on your system:

* Python 3.10 or higher
* Node.js and npm
* Git

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/RitamPal26/PRA_COREP_Assistant.git
cd PRA_COREP_Assistant
```

### 2. Backend Setup

Navigate to the backend directory and set up the Python environment.

```bash
cd backend
python -m venv venv
```

Activate the virtual environment:

* **Windows:** `venv\Scripts\activate`
* **Mac/Linux:** `source venv/bin/activate`

Install the dependencies:

```bash
pip install -r requirements.txt
```

**Configuration:**

1. Get a Google Gemini API Key from Google AI Studio.
2. Create a file named `.env` inside the `backend` folder.
3. Add your API key to the file:

```text
GOOGLE_API_KEY=your_api_key_here
```

**Optional Data Source:**
The system uses an in-memory database of dummy rules by default. To use real data, place a PDF of the PRA Rulebook named `pra_rulebook.pdf` inside the `backend` directory.

### 3. Frontend Setup

Open a new terminal, navigate to the frontend directory, and install dependencies.

```bash
cd frontend
npm install
```

## Running the Application

You must run the backend and frontend in separate terminals.

**Terminal 1: Start Backend**
(Ensure your virtual environment is active)

```bash
cd backend
uvicorn main:app --reload
```

The backend will run at `http://127.0.0.1:8000`.

**Terminal 2: Start Frontend**

```bash
cd frontend
npm run dev
```

The frontend will run at `http://localhost:5173`.

## Usage Guide

1. **Access the App:** Open your browser and navigate to the frontend URL (usually `http://localhost:5173`).
2. **Input Data (Two Methods):**
* **Chat:** Type a scenario like "We have invested 50m GBP in UK Government Gilts."
* **Upload:** Click the Paperclip icon (📎) to upload a PDF or TXT file (e.g., a balance sheet). The AI will read the file and auto-fill the table.


3. **Verify and Audit:**
* Hover over the "Regulatory Audit Trail" section to see the specific rule and page number used for the calculation.
* If a value is incorrect, click on the cell in the table to **manually edit** the number.


4. **Run a Comparison:**
* Click **"Lock Baseline"** to save the current state.
* Change a value (via chat or manual edit).
* Observe the green/red badges indicating the difference (e.g., `+10m`) relative to the locked baseline.


5. **Export:** Click "Download CSV" to save the report, including any scenario differences.

## Project Structure

```text
PRA_COREP_Assistant/
├── backend/
│   ├── main.py          # FastAPI application entry point and file upload routes
│   ├── service.py       # RAG logic, PDF processing, and LLM handling
│   ├── schemas.py       # Pydantic data models
│   ├── requirements.txt # Python dependencies
│   └── .env             # API Keys (Not committed to repo)
├── frontend/
│   ├── src/
│   │   ├── App.tsx      # Main React component (State management, UI logic)
│   │   └── App.css      # Styling, Responsive Design, and Layouts
│   ├── package.json     # Node.js dependencies
│   └── vite.config.ts   # Vite configuration
└── .gitignore           # Git ignore rules

```

## License

This project is a prototype developed for educational and demonstration purposes.