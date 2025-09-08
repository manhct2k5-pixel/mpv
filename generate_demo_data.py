#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import random
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash

def generate_demo_data():
    """Tạo dữ liệu demo cho WealthWallet"""
    
    # Tạo thêm users ảo
    additional_users = {
        "ceo@techcorp.vn": {
            "name": "Nguyễn Minh CEO",
            "password": generate_password_hash("123456"),
            "created_at": "2024-08-15T10:30:00.000000",
            "last_login": "2025-09-10T09:15:30.000000",
            "phone": "0901111111",
            "bio": "CEO Công ty công nghệ",
            "monthly_income": 50000000,
            "savings_target": 40,
            "financial_goal": "Mở rộng kinh doanh và đầu tư BĐS",
            "settings": {
                "emailTransactions": True,
                "emailBudget": True,
                "emailGoals": True,
                "showPopups": True,
                "playSound": True,
                "theme": "dark",
                "currency": "VND",
                "dateFormat": "DD/MM/YYYY",
                "language": "vi"
            }
        },
        "bacsi.mai@hospital.vn": {
            "name": "Dr. Mai Thị Hạnh",
            "password": generate_password_hash("123456"),
            "created_at": "2024-07-20T14:20:00.000000",
            "last_login": "2025-09-09T18:45:22.000000",
            "phone": "0902222222",
            "bio": "Bác sĩ Bệnh viện Đa khoa",
            "monthly_income": 30000000,
            "savings_target": 35,
            "financial_goal": "Mở phòng khám tư nhân",
            "settings": {
                "emailTransactions": True,
                "emailBudget": True,
                "emailGoals": True,
                "showPopups": True,
                "playSound": False,
                "theme": "light",
                "currency": "VND",
                "dateFormat": "DD/MM/YYYY",
                "language": "vi"
            }
        },
        "luongcong@company.com": {
            "name": "Trần Công Lương",
            "password": generate_password_hash("123456"),
            "created_at": "2024-06-10T08:15:00.000000", 
            "last_login": "2025-09-08T17:30:15.000000",
            "phone": "0903333333",
            "bio": "Công nhân xây dựng",
            "monthly_income": 8000000,
            "savings_target": 20,
            "financial_goal": "Mua xe máy và tiết kiệm cho gia đình",
            "settings": {
                "emailTransactions": True,
                "emailBudget": False,
                "emailGoals": True,
                "showPopups": True,
                "playSound": True,
                "theme": "light",
                "currency": "VND",
                "dateFormat": "DD/MM/YYYY",
                "language": "vi"
            }
        },
        "startup.founder@gmail.com": {
            "name": "Lê Thanh Startup",
            "password": generate_password_hash("123456"),
            "created_at": "2024-09-01T12:00:00.000000",
            "last_login": "2025-09-10T11:20:45.000000",
            "phone": "0904444444",
            "bio": "Founder startup công nghệ",
            "monthly_income": 35000000,
            "savings_target": 50,
            "financial_goal": "Gây quỹ Series A cho startup",
            "settings": {
                "emailTransactions": True,
                "emailBudget": True,
                "emailGoals": True,
                "showPopups": True,
                "playSound": True,
                "theme": "dark",
                "currency": "VND",
                "dateFormat": "DD/MM/YYYY",
                "language": "vi"
            }
        },
        "freelancer.design@gmail.com": {
            "name": "Phạm Thu Designer",
            "password": generate_password_hash("123456"),
            "created_at": "2024-05-15T16:30:00.000000",
            "last_login": "2025-09-09T20:15:30.000000",
            "phone": "0905555555",
            "bio": "Freelancer thiết kế đồ họa",
            "monthly_income": 22000000,
            "savings_target": 30,
            "financial_goal": "Mở studio thiết kế riêng",
            "settings": {
                "emailTransactions": True,
                "emailBudget": True,
                "emailGoals": True,
                "showPopups": True,
                "playSound": False,
                "theme": "light",
                "currency": "VND",
                "dateFormat": "DD/MM/YYYY",
                "language": "vi"
            }
        }
    }
    
    # Categories cho giao dịch
    expense_categories = [
        "Ăn uống", "Đi lại", "Mua sắm", "Giải trí", "Y tế", 
        "Giáo dục", "Nhà cửa", "Bảo hiểm", "Quần áo", "Khác"
    ]
    
    income_categories = [
        "Lương", "Thưởng", "Đầu tư", "Freelance", "Bán hàng", 
        "Cho thuê", "Lãi suất", "Khác"
    ]
    
    # Mô tả giao dịch mẫu
    expense_descriptions = {
        "Ăn uống": ["Cơm trưa", "Cà phê", "Nhà hàng", "Đồ ăn vặt", "Gọi món", "Tiệc tùng", "Buffet"],
        "Đi lại": ["Xăng xe", "Grab", "Vé xe bus", "Sửa xe", "Vé máy bay", "Taxi", "Uber"],
        "Mua sắm": ["Đồ gia dụng", "Mỹ phẩm", "Điện tử", "Sách", "Đồ chơi", "Phụ kiện"],
        "Giải trí": ["Phim", "Du lịch", "Game", "Karaoke", "Bar", "Spa", "Massage"],
        "Y tế": ["Khám bệnh", "Thuốc", "Bảo hiểm y tế", "Nha khoa", "Mắt kính"],
        "Giáo dục": ["Học phí", "Sách vở", "Khóa học", "Gia sư", "Thi cử"],
        "Nhà cửa": ["Tiền nhà", "Điện nước", "Internet", "Gas", "Sửa chữa nhà"],
        "Bảo hiểm": ["BH nhân thọ", "BH xe", "BH sức khỏe", "BH tài sản"],
        "Quần áo": ["Áo", "Quần", "Giày dép", "Túi xách", "Phụ kiện"],
        "Khác": ["Từ thiện", "Quà tặng", "Phí ngân hàng", "Đám cưới", "Lễ hội"]
    }
    
    income_descriptions = {
        "Lương": ["Lương cơ bản", "Lương tháng 13", "Lương overtime"],
        "Thưởng": ["Thưởng tết", "Thưởng KPI", "Thưởng dự án", "Thưởng hiệu suất"],
        "Đầu tư": ["Cổ tức", "Lãi chứng khoán", "BĐS", "Crypto", "Gold"],
        "Freelance": ["Dự án thiết kế", "Viết content", "Tư vấn", "Dịch thuật"],
        "Bán hàng": ["Bán online", "Hoa hồng", "Tiền bán đồ cũ"],
        "Cho thuê": ["Thuê nhà", "Thuê xe", "Thuê đất"],
        "Lãi suất": ["Tiết kiệm ngân hàng", "Trái phiếu", "Sổ tiết kiệm"],
        "Khác": ["Quà tặng", "Trúng số", "Hoàn tiền", "Bảo hiểm"]
    }
    
    def generate_transactions_for_user(email, num_transactions=80):
        """Tạo giao dịch cho user"""
        transactions = []
        current_date = datetime.now()
        
        for i in range(num_transactions):
            # Random date trong 6 tháng qua
            days_ago = random.randint(0, 180)
            transaction_date = current_date - timedelta(days=days_ago)
            
            # Random loại giao dịch (70% expense, 30% income)
            trans_type = "expense" if random.random() < 0.7 else "income"
            
            if trans_type == "expense":
                category = random.choice(expense_categories)
                description = random.choice(expense_descriptions[category])
                # Expense từ 50k đến 20M
                amount = random.randint(50000, 20000000)
            else:
                category = random.choice(income_categories)
                description = random.choice(income_descriptions[category])
                # Income từ 500k đến 50M
                amount = random.randint(500000, 50000000)
            
            transaction = {
                "id": f"{email}_{i+1000}",
                "description": description,
                "amount": amount,
                "category": category,
                "type": trans_type,
                "date": transaction_date.isoformat(),
                "note": random.choice(["", "Ghi chú quan trọng", "Cần thiết", ""])
            }
            transactions.append(transaction)
        
        # Sắp xếp theo ngày giảm dần
        transactions.sort(key=lambda x: x["date"], reverse=True)
        return transactions
    
    def generate_budgets_for_user(email):
        """Tạo budget cho user"""
        budgets = []
        categories = random.sample(expense_categories, 5)  # Chọn 5 categories
        
        for category in categories:
            budget = {
                "id": f"{email}_budget_{category.lower()}",
                "category": category,
                "amount": random.randint(1000000, 10000000),
                "period": "monthly",
                "created_at": (datetime.now() - timedelta(days=random.randint(30, 90))).isoformat(),
                "alert_percentage": random.choice([80, 85, 90])
            }
            budgets.append(budget)
        
        return budgets
    
    def generate_goals_for_user(email):
        """Tạo goals cho user"""
        goal_names = [
            "Mua xe ô tô", "Du lịch Nhật Bản", "Tích lũy khẩn cấp", 
            "Mua nhà", "Đầu tư chứng khoán", "Học MBA", 
            "Wedding fund", "Thiết bị công nghệ"
        ]
        
        goals = []
        num_goals = random.randint(2, 4)
        selected_goals = random.sample(goal_names, num_goals)
        
        for goal_name in selected_goals:
            target_amount = random.randint(10000000, 500000000)
            current_amount = random.randint(0, int(target_amount * 0.6))
            
            goal = {
                "id": f"{email}_goal_{len(goals)+1}",
                "name": goal_name,
                "target_amount": target_amount,
                "current_amount": current_amount,
                "target_date": (datetime.now() + timedelta(days=random.randint(365, 1095))).isoformat(),
                "created_at": (datetime.now() - timedelta(days=random.randint(30, 180))).isoformat(),
                "category": random.choice(["Cá nhân", "Gia đình", "Sự nghiệp", "Giải trí"])
            }
            goals.append(goal)
        
        return goals
    
    # Load existing data
    try:
        with open('data/users.json', 'r', encoding='utf-8') as f:
            users = json.load(f)
    except:
        users = {}
    
    try:
        with open('data/transactions.json', 'r', encoding='utf-8') as f:
            transactions = json.load(f)
    except:
        transactions = {}
    
    try:
        with open('data/budgets.json', 'r', encoding='utf-8') as f:
            budgets = json.load(f)
    except:
        budgets = {}
    
    try:
        with open('data/goals.json', 'r', encoding='utf-8') as f:
            goals = json.load(f)
    except:
        goals = {}
    
    # Add new users
    users.update(additional_users)
    
    # Generate data for all users (existing + new)
    all_emails = list(users.keys())
    
    for email in all_emails:
        # Skip if already has lots of transactions
        if email not in transactions or len(transactions[email]) < 20:
            transactions[email] = generate_transactions_for_user(email, random.randint(50, 120))
        
        # Generate budgets
        if email not in budgets:
            budgets[email] = generate_budgets_for_user(email)
        
        # Generate goals  
        if email not in goals:
            goals[email] = generate_goals_for_user(email)
    
    # Save all data
    with open('data/users.json', 'w', encoding='utf-8') as f:
        json.dump(users, f, ensure_ascii=False, indent=4)
    
    with open('data/transactions.json', 'w', encoding='utf-8') as f:
        json.dump(transactions, f, ensure_ascii=False, indent=4)
    
    with open('data/budgets.json', 'w', encoding='utf-8') as f:
        json.dump(budgets, f, ensure_ascii=False, indent=4)
    
    with open('data/goals.json', 'w', encoding='utf-8') as f:
        json.dump(goals, f, ensure_ascii=False, indent=4)
    
    print("✅ Đã tạo xong dữ liệu demo!")
    print(f"👥 Tổng users: {len(users)}")
    
    total_transactions = sum(len(trans) for trans in transactions.values())
    print(f"💰 Tổng giao dịch: {total_transactions}")
    
    total_budgets = sum(len(budget) for budget in budgets.values())
    print(f"📊 Tổng ngân sách: {total_budgets}")
    
    total_goals = sum(len(goal) for goal in goals.values())
    print(f"🎯 Tổng mục tiêu: {total_goals}")

if __name__ == "__main__":
    generate_demo_data()