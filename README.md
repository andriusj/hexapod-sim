# Hexapod Simulator

A web-based 3D simulator and inverse kinematics engine for a Hexapod (Stewart Platform). 

This project allows you to visualize and compute the necessary linear actuator lengths to achieve a specific 6-Degree-of-Freedom (6-DOF) pose (X, Y, Z, Pitch, Roll, Yaw) for a hexapod platform.

## Architecture

The application is split into two main components:

1. **Frontend (`frontend-3d`)**:
   - Built with **Angular 18** and **Three.js**.
   - Provides an interactive 3D visualization of the hexapod.
   - Communicates with the backend API to retrieve kinematic calculations based on user input.
   - Runs locally on `http://localhost:4200`.

2. **Backend (`backend-sim`)**:
   - Built with **Python 3.11** and **FastAPI**.
   - Provides a high-performance REST API (`/kinematics/inverse`) that performs complex inverse kinematics math using `numpy` and `scipy`.
   - Calculates the required actuator lengths, checks for physical out-of-bounds limits, and estimates forces on each actuator.
   - Runs locally on `http://localhost:8000`.

## Prerequisites

- **Node.js** & **npm** (for the Angular frontend)
- **Python 3** (for the FastAPI backend)

## Getting Started

### Quick Start
You can easily start both the frontend and backend simultaneously in separate windows using the provided helper scripts:

- **Windows**: 
  Run `restart.cmd` from the root directory.
- **Mac**: 
  Run `./restart.sh` from the root directory (make sure it's executable first: `chmod +x restart.sh`).

### Manual Setup & Run

#### 1. Backend API
Open a terminal and navigate to the `backend-sim` directory:

```bash
cd backend-sim

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
.\venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload
```

#### 2. Frontend 3D Interface
Open a second terminal and navigate to the `frontend-3d` directory:

```bash
cd frontend-3d

# Install dependencies
npm install

# Start the development server
npm start
```

## API Documentation

Once the backend is running, you can interactively explore and test the API by navigating to the auto-generated Swagger UI documentation:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Core Endpoint: `GET /kinematics/inverse`
Calculates actuator lengths for a given platform pose.
- **Parameters**: `x`, `y`, `z`, `pitch`, `roll`, `yaw` (and various physical platform dimensions).
- **Returns**: A JSON object containing `actuator_lengths`, `forces_newtons`, and boolean flags for structural limits (`is_out_of_bounds`).
