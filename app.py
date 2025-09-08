from flask import Flask, jsonify, request, session, send_from_directory, make_response
from flask_cors import CORS
from datetime import datetime, timedelta
import os, json, math
from collections import defaultdict
from werkzeug.security import generate_password_hash, check_password_hash

# Optional .env support
try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv()
except Exception:
    pass

app = Flask(__name__)
CORS(app, supports_credentials=True, origins=['http://localhost:5000', 'http://127.0.0.1:5000', 'null'], allow_headers=['Content-Type', 'Authorization'], methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
app.secret_key = os.environ.get('SECRET_KEY', 'wealthwallet_secret_key_2023_prod')
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)

# File paths
DATA_DIR = 'data'
USERS_FILE = os.path.join(DATA_DIR, 'users.json')
TRANSACTIONS_FILE = os.path.join(DATA_DIR, 'transactions.json')
BUDGETS_FILE = os.path.join(DATA_DIR, 'budgets.json')
GOALS_FILE = os.path.join(DATA_DIR, 'goals.json')

# Ensure data directory exists
def init_data_files():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    
    for file_path in [USERS_FILE, TRANSACTIONS_FILE, BUDGETS_FILE, GOALS_FILE]:
        if not os.path.exists(file_path):
            with open(file_path, 'w') as f:
                json.dump({}, f)

# Helper functions for file operations
def read_json(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

def write_json(file_path, data):
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

# Authentication decorator
def login_required(f):
    def decorated_function(*args, **kwargs):
        if 'user_email' not in session:
            return jsonify({'success': False, 'message': 'Authentication required'}), 401
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

# API Routes
@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Invalid JSON'}), 400
            
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'success': False, 'message': 'Email and password are required'}), 400
        
        users = read_json(USERS_FILE)
        if email not in users:
            return jsonify({'success': False, 'message': 'Invalid email or password'}), 401
        
        if not check_password_hash(users[email]['password'], password):
            return jsonify({'success': False, 'message': 'Invalid email or password'}), 401
        
        session.permanent = True
        session['user_email'] = email
        return jsonify({
            'success': True, 
            'user': {
                'email': email, 
                'name': users[email]['name']
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': 'Server error'}), 500

@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Invalid JSON'}), 400
            
        name = data.get('name', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not all([name, email, password]):
            return jsonify({'success': False, 'message': 'All fields are required'}), 400
        
        if len(password) < 6:
            return jsonify({'success': False, 'message': 'Password must be at least 6 characters'}), 400
        
        users = read_json(USERS_FILE)
        if email in users:
            return jsonify({'success': False, 'message': 'Email already exists'}), 409
        
        users[email] = {
            'name': name,
            'password': generate_password_hash(password),
            'created_at': datetime.now().isoformat()
        }
        
        write_json(USERS_FILE, users)
        
        # Initialize user data
        transactions = read_json(TRANSACTIONS_FILE)
        transactions[email] = []
        write_json(TRANSACTIONS_FILE, transactions)
        
        budgets = read_json(BUDGETS_FILE)
        budgets[email] = {}
        write_json(BUDGETS_FILE, budgets)
        
        goals = read_json(GOALS_FILE)
        goals[email] = []
        write_json(GOALS_FILE, goals)
        
        return jsonify({'success': True, 'message': 'Registration successful'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': 'Server error'}), 500

@app.route('/api/user')
@login_required
def get_user():
    email = session['user_email']
    users = read_json(USERS_FILE)
    user_data = users.get(email, {})
    return jsonify({
        'success': True,
        'user': {
            'email': email,
            'name': user_data.get('name', ''),
            'joined_date': user_data.get('created_at', '')
        }
    })

@app.route('/api/transaction', methods=['POST'])
@login_required
def add_transaction():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Invalid JSON'}), 400
            
        transaction_type = data.get('type')
        category = data.get('category')
        amount = data.get('amount')
        description = data.get('description', '')
        date = data.get('date', datetime.now().isoformat())
        
        if not all([transaction_type, category, amount]):
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
        try:
            amount = float(amount)
            if amount <= 0:
                return jsonify({'success': False, 'message': 'Amount must be positive'}), 400
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid amount'}), 400
        
        email = session['user_email']
        transactions = read_json(TRANSACTIONS_FILE)
        
        if email not in transactions:
            transactions[email] = []
        
        new_id = max([t.get('id', 0) for t in transactions[email]] or [0]) + 1
        
        new_transaction = {
            'id': new_id,
            'type': transaction_type,
            'category': category,
            'amount': amount,
            'description': description,
            'date': date
        }
        
        transactions[email].append(new_transaction)
        write_json(TRANSACTIONS_FILE, transactions)
        
        return jsonify({'success': True, 'message': 'Transaction added', 'id': new_id})
        
    except Exception as e:
        return jsonify({'success': False, 'message': 'Server error'}), 500

@app.route('/api/transactions')
@login_required
def get_transactions():
    try:
        email = session['user_email']
        transactions = read_json(TRANSACTIONS_FILE).get(email, [])
        
        # Filtering options
        type_filter = request.args.get('type')
        category_filter = request.args.get('category')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = request.args.get('limit', type=int)
        
        filtered_transactions = transactions
        
        if type_filter:
            filtered_transactions = [t for t in filtered_transactions if t['type'] == type_filter]
        
        if category_filter:
            filtered_transactions = [t for t in filtered_transactions if t['category'] == category_filter]
        
        if start_date:
            filtered_transactions = [t for t in filtered_transactions if t['date'] >= start_date]
        
        if end_date:
            filtered_transactions = [t for t in filtered_transactions if t['date'] <= end_date]
        
        # Sorting
        sort_by = request.args.get('sort_by', 'date')
        reverse = request.args.get('order', 'desc').lower() == 'desc'
        
        filtered_transactions.sort(key=lambda x: x.get(sort_by, ''), reverse=reverse)
        
        if limit is not None and limit > 0:
            filtered_transactions = filtered_transactions[:limit]
        
        return jsonify({
            'success': True, 
            'transactions': filtered_transactions,
            'total': len(filtered_transactions)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': 'Server error'}), 500

@app.route('/api/transaction/<int:transaction_id>', methods=['DELETE'])
@login_required
def delete_transaction(transaction_id):
    try:
        email = session['user_email']
        transactions = read_json(TRANSACTIONS_FILE)
        
        if email not in transactions:
            return jsonify({'success': False, 'message': 'No transactions found'}), 404
        
        original_count = len(transactions[email])
        transactions[email] = [t for t in transactions[email] if t['id'] != transaction_id]
        
        if len(transactions[email]) == original_count:
            return jsonify({'success': False, 'message': 'Transaction not found'}), 404
        
        write_json(TRANSACTIONS_FILE, transactions)
        return jsonify({'success': True, 'message': 'Transaction deleted'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': 'Server error'}), 500

@app.route('/api/overview')
@login_required
def get_overview():
    try:
        email = session['user_email']
        transactions = read_json(TRANSACTIONS_FILE).get(email, [])
        
        # Calculate totals
        income = sum(t['amount'] for t in transactions if t['type'] == 'income')
        expense = sum(t['amount'] for t in transactions if t['type'] == 'expense')
        savings = income - expense
        
        # Calculate monthly breakdown
        monthly_data = {}
        for t in transactions:
            date_obj = datetime.fromisoformat(t['date'].replace('Z', '+00:00'))
            month_year = date_obj.strftime('%Y-%m')
            
            if month_year not in monthly_data:
                monthly_data[month_year] = {'income': 0, 'expense': 0, 'savings': 0}
            
            if t['type'] == 'income':
                monthly_data[month_year]['income'] += t['amount']
            else:
                monthly_data[month_year]['expense'] += t['amount']
            
            monthly_data[month_year]['savings'] = monthly_data[month_year]['income'] - monthly_data[month_year]['expense']
        
        # Get recent transactions
        recent_transactions = sorted(transactions, key=lambda x: x['date'], reverse=True)[:5]
        
        # Top categories (expense)
        expense_by_category = defaultdict(float)
        for t in transactions:
            if t['type'] == 'expense':
                expense_by_category[t['category']] += t['amount']
        top_categories = sorted(expense_by_category.items(), key=lambda x: x[1], reverse=True)[:5]
        top_categories = [{'category': k, 'amount': v} for k, v in top_categories]
        
        # Financial health score (simple)
        health_score = 0
        if income > 0:
            saving_rate = savings / income
            if saving_rate >= 0.2:
                health_score = 90
            elif saving_rate >= 0.1:
                health_score = 70
            elif saving_rate >= 0:
                health_score = 50
            else:
                health_score = 30
        
        return jsonify({
            'success': True,
            'overview': {
                'income': income,
                'expense': expense,
                'savings': savings,
                'healthScore': health_score,
                'topCategories': top_categories
            },
            'monthly_data': monthly_data,
            'recent_transactions': recent_transactions
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': 'Server error'}), 500

@app.route('/api/analysis')
@login_required
def get_analysis():
    try:
        email = session['user_email']
        transactions = read_json(TRANSACTIONS_FILE).get(email, [])
        
        # Category analysis
        category_analysis = defaultdict(float)
        for t in transactions:
            if t['type'] == 'expense':
                category_analysis[t['category']] += t['amount']
        
        # Monthly analysis
        monthly_analysis = defaultdict(lambda: {'income': 0, 'expense': 0})
        for t in transactions:
            date = datetime.fromisoformat(t['date'].replace('Z', '+00:00'))
            month_key = date.strftime('%Y-%m')
            monthly_analysis[month_key][t['type']] += t['amount']
        
        # Calculate percentages
        total_expense = sum(category_analysis.values())
        category_percentages = {k: (v / total_expense * 100) if total_expense > 0 else 0 
                               for k, v in category_analysis.items()}
        
        # Sort categories by amount
        sorted_categories = sorted(category_analysis.items(), key=lambda x: x[1], reverse=True)
        
        # Format data for charts
        months = sorted(monthly_analysis.keys())[-6:]  # Last 6 months
        monthly_labels = []
        monthly_income = []
        monthly_expenses = []
        
        for month in months:
            monthly_labels.append(month)
            monthly_income.append(monthly_analysis[month]['income'])
            monthly_expenses.append(monthly_analysis[month]['expense'])
        
        # Category data for pie chart
        category_labels = list(dict(sorted_categories).keys())[:8]  # Top 8 categories
        category_values = list(dict(sorted_categories).values())[:8]
        
        return jsonify({
            'success': True,
            'monthlyData': {
                'labels': monthly_labels,
                'income': monthly_income,
                'expenses': monthly_expenses
            },
            'categoryData': {
                'labels': category_labels,
                'values': category_values
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': 'Server error'}), 500

@app.route('/api/budget', methods=['POST'])
@login_required
def set_budget():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Invalid JSON'}), 400
            
        category = data.get('category')
        amount = data.get('amount')
        
        if not category or not amount:
            return jsonify({'success': False, 'message': 'Category and amount are required'}), 400
        
        try:
            amount = float(amount)
            if amount <= 0:
                return jsonify({'success': False, 'message': 'Amount must be positive'}), 400
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid amount'}), 400
        
        email = session['user_email']
        budgets = read_json(BUDGETS_FILE)
        
        if email not in budgets:
            budgets[email] = {}
        
        budgets[email][category] = amount
        write_json(BUDGETS_FILE, budgets)
        
        return jsonify({'success': True, 'message': 'Budget set successfully'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': 'Server error'}), 500

@app.route('/api/budgets')
@login_required
def get_budgets():
    try:
        email = session['user_email']
        budgets = read_json(BUDGETS_FILE).get(email, {})
        
        # Calculate budget utilization if transactions exist
        transactions = read_json(TRANSACTIONS_FILE).get(email, [])
        expense_by_category = defaultdict(float)
        
        for t in transactions:
            if t['type'] == 'expense':
                expense_by_category[t['category']] += t['amount']
        
        budget_details = {}
        for category, budget_amount in budgets.items():
            spent = expense_by_category.get(category, 0)
            remaining = budget_amount - spent
            utilization = (spent / budget_amount * 100) if budget_amount > 0 else 0
            
            budget_details[category] = {
                'budget': budget_amount,
                'spent': spent,
                'remaining': remaining,
                'utilization': utilization
            }
        
        return jsonify({
            'success': True, 
            'budgets': budget_details
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': 'Server error'}), 500

@app.route('/api/goal', methods=['POST'])
@login_required
def add_goal():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Invalid JSON'}), 400
            
        name = data.get('name')
        target_amount = data.get('target_amount')
        current_amount = data.get('current_amount', 0)
        deadline = data.get('deadline')
        description = data.get('description', '')
        
        if not all([name, target_amount, deadline]):
            return jsonify({'success': False, 'message': 'Name, target amount, and deadline are required'}), 400
        
        try:
            target_amount = float(target_amount)
            current_amount = float(current_amount)
            if target_amount <= 0:
                return jsonify({'success': False, 'message': 'Target amount must be positive'}), 400
            if current_amount < 0:
                return jsonify({'success': False, 'message': 'Current amount cannot be negative'}), 400
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid amount'}), 400
        
        email = session['user_email']
        goals = read_json(GOALS_FILE)
        
        if email not in goals:
            goals[email] = []
        
        new_id = max([g.get('id', 0) for g in goals[email]] or [0]) + 1
        
        new_goal = {
            'id': new_id,
            'name': name,
            'target_amount': target_amount,
            'current_amount': current_amount,
            'deadline': deadline,
            'description': description,
            'created_at': datetime.now().isoformat(),
            'progress': (current_amount / target_amount * 100) if target_amount > 0 else 0
        }
        
        goals[email].append(new_goal)
        write_json(GOALS_FILE, goals)
        
        return jsonify({'success': True, 'message': 'Goal added', 'id': new_id})
        
    except Exception as e:
        return jsonify({'success': False, 'message': 'Server error'}), 500

@app.route('/api/goals')
@login_required
def get_goals():
    try:
        email = session['user_email']
        goals = read_json(GOALS_FILE).get(email, [])
        
        # Calculate days remaining and progress
        current_date = datetime.now()
        for goal in goals:
            deadline_date = datetime.fromisoformat(goal['deadline'].replace('Z', '+00:00'))
            days_remaining = (deadline_date - current_date).days
            goal['days_remaining'] = max(0, days_remaining)
            goal['progress'] = (goal['current_amount'] / goal['target_amount'] * 100) if goal['target_amount'] > 0 else 0
        
        return jsonify({'success': True, 'goals': goals})
        
    except Exception as e:
        return jsonify({'success': False, 'message': 'Server error'}), 500

@app.route('/api/goal/<int:goal_id>', methods=['PUT'])
@login_required
def update_goal(goal_id):
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Invalid JSON'}), 400
            
        email = session['user_email']
        goals = read_json(GOALS_FILE)
        
        if email not in goals:
            return jsonify({'success': False, 'message': 'No goals found'}), 404
        
        goal_found = False
        for goal in goals[email]:
            if goal['id'] == goal_id:
                if 'current_amount' in data:
                    try:
                        current_amount = float(data['current_amount'])
                        if current_amount < 0:
                            return jsonify({'success': False, 'message': 'Current amount cannot be negative'}), 400
                        goal['current_amount'] = current_amount
                    except ValueError:
                        return jsonify({'success': False, 'message': 'Invalid amount'}), 400
                
                if 'target_amount' in data:
                    try:
                        target_amount = float(data['target_amount'])
                        if target_amount <= 0:
                            return jsonify({'success': False, 'message': 'Target amount must be positive'}), 400
                        goal['target_amount'] = target_amount
                    except ValueError:
                        return jsonify({'success': False, 'message': 'Invalid amount'}), 400
                
                if 'name' in data:
                    goal['name'] = data['name'].strip()
                
                if 'deadline' in data:
                    goal['deadline'] = data['deadline']
                
                if 'description' in data:
                    goal['description'] = data['description'].strip()
                
                goal_found = True
                break
        
        if not goal_found:
            return jsonify({'success': False, 'message': 'Goal not found'}), 404
        
        write_json(GOALS_FILE, goals)
        return jsonify({'success': True, 'message': 'Goal updated'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': 'Server error'}), 500

@app.route('/api/goal/<int:goal_id>', methods=['DELETE'])
@login_required
def delete_goal(goal_id):
    try:
        email = session['user_email']
        goals = read_json(GOALS_FILE)
        
        if email not in goals:
            return jsonify({'success': False, 'message': 'No goals found'}), 404
        
        original_count = len(goals[email])
        goals[email] = [g for g in goals[email] if g['id'] != goal_id]
        
        if len(goals[email]) == original_count:
            return jsonify({'success': False, 'message': 'Goal not found'}), 404
        
        write_json(GOALS_FILE, goals)
        return jsonify({'success': True, 'message': 'Goal deleted'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': 'Server error'}), 500



@app.route('/api/user', methods=['PUT'])
@login_required
def update_user():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Invalid JSON'}), 400
        
        email = session['user_email']
        users = read_json(USERS_FILE)
        
        if email not in users:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        # Update allowed fields
        allowed_fields = ['name', 'phone', 'monthly_income', 'savings_target', 'avatar']
        for field in allowed_fields:
            if field in data:
                users[email][field] = data[field]
        
        write_json(USERS_FILE, users)
        return jsonify({'success': True, 'message': 'User updated successfully'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': 'Server error'}), 500

@app.route('/api/logout')
def logout():
    session.pop('user_email', None)
    return jsonify({'success': True, 'message': 'Logged out successfully'})

# Serve static files
@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory(os.path.abspath(os.path.dirname(__file__)), filename)

@app.route('/')
def serve_index():
    return send_from_directory(os.path.abspath(os.path.dirname(__file__)), 'index.html')

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'message': 'Resource not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'success': False, 'message': 'Internal server error'}), 500

# Simple healthcheck endpoint
@app.route('/api/health')
def health():
    return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    init_data_files()
    port = int(os.environ.get('PORT', 5000))
    debug_flag = os.environ.get('FLASK_DEBUG', 'False').lower() in ('1','true','yes')
    app.run(host='0.0.0.0', port=port, debug=debug_flag)