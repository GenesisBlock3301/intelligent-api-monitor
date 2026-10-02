# Technical Interview Task

## 1. Overview

This assignment evaluates practical skills in AI integration, backend engineering, and system design. The goal is to simulate a real-world scenario involving API monitoring and intelligent alert generation.

## 2. Task

### Intelligent API Monitoring & Alert System

## 3. Objective

Design and implement a system that:

- Automatically monitors API responses
- Detects anomalies
- Generates AI-powered, human-readable alerts

## 4. Scenario

The company integrates with multiple external APIs for patient and operational data. These APIs may:

- Fail intermittently
- Return inconsistent data
- Produce abnormal responses

Your task is to proactively detect such issues and automate alerting.

## 5. Input Methods

You may provide input to the system using either of the following:

1. A static JSON file containing API responses
2. POST requests to a Node.js backend endpoint (`/monitor`)

Example JSON input:

```json
[
  {
    "api_name": "PatientDataAPI",
    "response_time_ms": 1200,
    "status_code": 200,
    "records_returned": 50
  },
  {
    "api_name": "AppointmentAPI",
    "response_time_ms": 5500,
    "status_code": 500,
    "records_returned": 0
  }
]
```

## 6. Processing Requirements

The system must meet the following requirements.

### 6.1 API Health Monitoring

- Evaluate response time
- Check HTTP status codes
- Validate returned data

### 6.2 Anomaly Detection

Detect conditions such as:

- High response time
- Failed requests (for example, 500 errors)
- Missing or zero records

### 6.3 AI-Powered Alert Generation

Use an AI model (LLM API) to generate human-readable alerts.

Example alert:

> AppointmentAPI failed with status 500 and returned 0 records. Possible outage or data issue.

## 7. Expected Output

### 7.1 Data Storage

- Store detected anomalies in a database (SQL, NoSQL, or MongoDB)

### 7.2 API Endpoint

- Create a REST endpoint: `/alerts`
- Fetch all active anomalies

### 7.3 Frontend

- Build a clean and user-friendly UI to display alerts

### 7.4 Optional Feature

- Send anomaly reports via email

## 8. Technical Requirements

### Backend

- Node.js (Express recommended)
- Modular and scalable architecture

### AI Integration

- Integrate an LLM API (for example, OpenAI or Gemini)
- Generate descriptive alerts

### System Capabilities

- Handle batch processing of multiple API inputs
- Implement proper error handling
- Include a logging system

## 9. AI Usage Instructions

If AI is used for code generation, prompt design, or logic building, you must:

- Document all prompts used
- Submit them in a separate file: `AI_Prompts.docx`

## 10. Evaluation Criteria

| Criteria | Description |
| --- | --- |
| Backend & API Design | Clean, modular, maintainable |
| Frontend | User-friendly UI |
| AI Usage | Quality of generated alerts |
| Data Handling | Proper anomaly storage |
| Automation Logic | Correct anomaly detection |
| Scalability | Handles multiple APIs efficiently |

## 11. Submission Guidelines

Required deliverables:

1. **Source code**
   - Upload the full project to GitHub
   - Share the repository link
2. **README file**
   - Setup instructions
   - Run instructions
3. **Video explanation (5-10 minutes)**
   - Explain the architecture
   - Show the system workflow
   - Highlight key decisions

## 12. Submission Format

Send an email containing:

- GitHub repository link
- Cloud/Drive link to the video and, if AI was used, the AI prompts file

## 13. Deadline

Five days from the assignment date.
