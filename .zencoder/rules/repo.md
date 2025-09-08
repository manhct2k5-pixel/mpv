# WealthWallet - Personal Finance Management System

## Project Overview
WealthWallet is a comprehensive personal finance management web application that helps users track income, expenses, set budgets, and achieve financial goals.

## Architecture
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Python Flask with JSON file storage
- **Charts**: Chart.js for data visualization
- **Styling**: Custom CSS with modern design principles

## File Structure
```
├── index.html              # Landing page
├── auth.html              # Authentication (login/register)
├── dashboard.html         # Main dashboard
├── style.css              # Landing page styles
├── auth-style.css         # Authentication page styles
├── dashboard-style.css    # Dashboard styles
├── script.js              # Landing page functionality
├── auth-script.js         # Authentication functionality
├── dashboard-script.js    # Dashboard functionality
├── app.py                 # Flask backend API
└── data/                  # JSON data storage
    ├── users.json         # User accounts
    ├── transactions.json  # Financial transactions
    ├── budgets.json       # Budget settings
    └── goals.json         # Savings goals
```

## Key Features
1. **User Authentication**: Registration, login, logout
2. **Transaction Management**: Add, view, filter transactions
3. **Budget Tracking**: Set and monitor category budgets
4. **Goal Setting**: Create and track savings goals
5. **Data Analysis**: Charts and reports for financial insights
6. **Responsive Design**: Mobile-friendly interface

## API Endpoints
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `GET /api/logout` - User logout
- `GET /api/user` - Get user profile
- `POST /api/transaction` - Add transaction
- `GET /api/transactions` - List transactions
- `DELETE /api/transaction/<id>` - Delete transaction
- `GET /api/overview` - Dashboard overview data
- `GET /api/analysis` - Financial analysis data
- `POST /api/budget` - Set budget
- `GET /api/budgets` - Get budgets
- `POST /api/goal` - Add goal
- `GET /api/goals` - List goals
- `PUT /api/goal/<id>` - Update goal
- `DELETE /api/goal/<id>` - Delete goal

## Development Notes
- Uses session-based authentication
- Data is stored in JSON files for simplicity
- Vietnamese language interface
- Bootstrap-like responsive grid system
- Modern CSS variables for theming

## Dependencies
- Flask
- Flask-CORS
- Werkzeug (for password hashing)
- Chart.js (CDN)
- Font Awesome (CDN)
- jQuery (CDN)