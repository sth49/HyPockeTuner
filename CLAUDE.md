# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HyPockeTuner is a hyperparameter optimization (HPO) system that uses the BOHB algorithm for machine learning model tuning. It consists of a React TypeScript frontend client and a Python FastAPI backend server with real-time WebSocket communication.

## Architecture

### Client (Frontend)
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS + DaisyUI
- **State Management**: Zustand stores with persistence
- **Visualization**: D3.js + Visx for charts and plots
- **Real-time Communication**: Socket.IO client
- **Routing**: React Router v7
- **Key Features**: PWA support, responsive design, authentication system

### Server (Backend)
- **Framework**: FastAPI with async/await
- **Real-time**: Socket.IO server (python-socketio)
- **HPO Algorithm**: BOHB (Bayesian Optimization with HyperBand)
- **Machine Learning**: Supports multiple kernels (MNIST, CIFAR-10, NLP, segmentation)
- **Monitoring**: GPU usage tracking, disk monitoring, notification system
- **Authentication**: User-based system with token validation

## Development Commands

### Client Commands
```bash
cd client
npm install          # Install dependencies
npm run dev          # Start development server (port 8999)
npm run build        # Build for production (tsc && vite build)
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Server Commands
```bash
cd server
python main.py --host 0.0.0.0 --port 8080    # Start server
python main.py --reset                        # Reset experiments
python main.py --new                          # Create new experiment
python main.py --base-exp base                # Use specific base experiment config
```

## Key Components

### Client Architecture
- **stores/**: Zustand state management
  - `experimentStore.ts`: Main experiment state and event processing
  - `authStore.ts`: Authentication state with persistence
  - `appStore.ts`: Global application state
  - `metadataStore.ts`: Metadata management
- **components/**: React components organized by feature
  - `Timeline/`: Experiment timeline visualization with Node/Link components
  - `Overview/`: Performance plots, GPU monitoring, hyperparameter effects
  - `Brackets/`: BOHB bracket visualization with bump charts
  - `Notification/`: Push notification system with condition management
  - `Login/`: Authentication UI
  - `ProtectedRoute/`: Route protection for authenticated users
  - `newExperiment/`: Experiment creation workflow
  - `workspace/`: Experiment management dashboard
- **types/**: TypeScript type definitions for experiments, trials, hyperparameters
- **api/**: API client and backend communication layer
- **hooks/**: Custom React hooks for navigation, responsive sizing

### Server Architecture
- **main.py**: FastAPI server with Socket.IO integration
- **exp.py**: Experiment class managing BOHB state and trials
- **trial.py**: Trial management and execution
- **kernels/**: Machine learning model implementations
  - `mnist_kernel.py`: MNIST dataset training
  - `cifar10_kernel.py`: CIFAR-10 dataset training
  - `nlp_kernel.py`: NLP model training
  - `segmentation_kernel.py`: Image segmentation models
- **bohb/**: BOHB algorithm implementation
  - `bohb.py`: Main BOHB algorithm
  - `configspace.py`: Hyperparameter configuration space
  - `state.py`: BOHB state management
- **notification.py**: Push notification and condition monitoring
- **gpu.py**: GPU monitoring utilities
- **worker.py**: Trial execution worker processes

## Core Data Flow

1. **Authentication**: User login → Server validates → Client stores token → Protected routes enabled
2. **Experiment Creation**: Client sends experiment config → Server creates Exp instance → BOHB optimization starts
3. **Trial Execution**: Server generates trial configs → Worker processes execute → Results reported back
4. **Real-time Updates**: Server broadcasts events via Socket.IO → Client processes events → UI updates
5. **State Management**: Zustand stores process events → Components react to state changes
6. **User Trials**: Users can inject custom trial configurations → Server prioritizes user trials → Results integrated

## Important Files

### Configuration
- `client/package.json`: Client dependencies and scripts
- `client/vite.config.ts`: Vite build configuration with PWA settings
- `server/config/`: Experiment and kernel configurations
- `server/config/kernel_info.json`: Available models and datasets
- `server/lastExp.json`: Last experiment configuration

### Core Logic
- `client/src/stores/experimentStore.ts`: Main experiment state management
- `client/src/stores/experimentEventProcessor.ts`: Event processing logic
- `client/src/stores/authStore.ts`: Authentication state with persistence
- `server/exp.py`: Experiment lifecycle management
- `server/main.py`: Server endpoints and Socket.IO handlers
- `server/trial.py`: Trial class and execution logic

## API Endpoints

Key FastAPI endpoints:
- `POST /login/{user_id}`: User authentication
- `GET /check_token/{token}`: Token validation
- `POST /new_exp`: Create new experiment
- `GET /get_exp/{exp_id}`: Get experiment details
- `POST /pause/{exp_id}`: Pause experiment
- `POST /resume/{exp_id}`: Resume experiment
- `POST /stop/{exp_id}`: Stop experiment
- `POST /trial`: Submit user trial
- `GET /gpu`: Get GPU information
- `POST /push`: Send push notification

## Socket.IO Events

Key events for real-time communication:
- `connect`: Client connection established
- `initial_state`: Server sends current state to new clients
- `event`: Server broadcasts experiment updates
- `request_current_state`: Client requests current state
- Trial events: `trialStart`, `trialEnd`, `trialPause`, `trialResume`
- Monitoring events: `gpu`, `disk`, `push`
- Analysis events: `shap` (SHAP values calculated)

## Authentication System

- User-based authentication with simple token system
- Token stored in localStorage via Zustand persist
- Protected routes require authentication
- Multi-user support with separate experiment directories

## GPU Monitoring

The server includes automatic GPU monitoring:
- Tracks usage, temperature, and memory every 10 seconds
- Supports notification conditions based on GPU metrics
- Uses nvidia-smi for GPU data collection
- Visualized in real-time on client Overview page

## SHAP Integration

The system includes SHAP (SHapley Additive exPlanations) analysis:
- Analyzes hyperparameter importance after trials complete
- Uses RandomForestRegressor for feature importance
- Results visualized in client overview components
- Calculated automatically when sufficient trial data exists

## Hyperparameter Types

Supported hyperparameter types:
- **Uniform**: Continuous values with range
- **Integer Uniform**: Integer values with range
- **Ordered**: Discrete ordered values
- **Unordered**: Categorical values
- **Conditional**: Parameters dependent on other parameter values

## User Trial System

- Users can submit custom hyperparameter configurations
- User trials prioritized over BOHB-generated trials
- Results integrated into BOHB optimization process
- Supports interactive hyperparameter exploration