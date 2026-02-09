# PRA COREP Reporting Assistant

This project is an LLM-assisted prototype designed to help UK banks automate the completion of COREP (Common Reporting) regulatory returns. It utilizes a Retrieval-Augmented Generation (RAG) pipeline to interpret natural language scenarios, retrieve relevant Prudential Regulation Authority (PRA) rules, and populate a structured reporting template with an audit trail.

## Features

* **Regulatory RAG Pipeline:** Retrieves relevant PRA rules and instructions based on user input.
* **Automated Template Population:** Converts unstructured text (e.g., "We invested 20m in UK Gilts") into structured data for the COREP Own Funds (C 01.00) template.
* **Audit Trail:** Provides specific rule references (e.g., "Article 114(4)") to justify every data entry.
* **Split-Screen Interface:** displays the chat interaction alongside the live-updating report.
* **CSV Export:** Allows users to download the populated report for further analysis.
* **Local Embeddings:** Uses HuggingFace embeddings running locally for privacy and speed.

## Tech Stack

* **Frontend:** React, TypeScript, Vite
* **Backend:** Python, FastAPI, Uvicorn
* **AI/LLM:** LangChain, Google Gemini (via API), FAISS (Vector Store), HuggingFace (Embeddings)

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

1. Open your browser and navigate to the frontend URL provided by the terminal (usually `http://localhost:5173`).
2. In the chat window, describe a financial scenario.
* *Example:* "We have invested 50m GBP in UK Government Gilts."
* *Example:* "The bank has retail exposures amounting to 100m."


3. The assistant will process the request, retrieve the relevant regulation, and update the table on the right.
4. Hover over or view the "Regulatory Audit Trail" section to see the specific rule used for the calculation.
5. Click "Download CSV" to save the report.

## Project Structure

```text
PRA_COREP_Assistant/
├── backend/
│   ├── main.py          # FastAPI application entry point
│   ├── service.py       # RAG logic, Vector Store, and LLM handling
│   ├── schemas.py       # Pydantic data models
│   ├── requirements.txt # Python dependencies
│   └── .env             # API Keys (Not committed to repo)
├── frontend/
│   ├── src/
│   │   ├── App.tsx      # Main React component
│   │   └── App.css      # Styling and Responsive Design
│   ├── package.json     # Node.js dependencies
│   └── vite.config.ts   # Vite configuration
└── .gitignore           # Git ignore rules

```

## License

This project is a prototype developed for educational and demonstration purposes.