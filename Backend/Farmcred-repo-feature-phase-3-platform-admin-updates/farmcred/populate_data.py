# populate_data.py
# To run this script:
# 1. Open your terminal in your Django project root.
# 2. Activate your virtual environment (farmcredenv).
# 3. Run: python populate_data.py

import os
import django
import sys
# from django.db import connection # Not strictly needed for this script

# --- Django Setup Boilerplate ---
# Add your project's base directory to the Python path
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.append(PROJECT_ROOT)

# Set the DJANGO_SETTINGS_MODULE environment variable
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "farmcred.settings")
django.setup()
# --- End Django Setup Boilerplate ---


# Now import your models and other necessary modules AFTER django.setup()
from account.models import Account
# Import all profile models, including the new ones and excluding the removed one
from core.models import FarmerProfile, InvestorProfile, Transaction, Transfer, Loan, InvestorReview, BuyerProfile
# Import marketplace models
from marketplace.models import ProduceListing, Conversation, Message
# Import payments models
from payments.models import Order, PaymentTransaction, BuyerReview

from django.utils import timezone
from datetime import timedelta, date, datetime # Import datetime for timezone.now()

import random
from django.core.management import call_command # For calling the management command
from decimal import Decimal # Ensure Decimal is imported

print("--- Starting Data Population Script ---")

# --- Clear existing data to ensure a clean slate for testing ---
# IMPORTANT: Only run this in development/testing environments!
# It will delete all Account, Profile, Transaction, Transfer, Loan, InvestorReview data.
print("Clearing existing data...")

# Clear models with foreign key dependencies first
Message.objects.all().delete()
Conversation.objects.all().delete()
BuyerReview.objects.all().delete()
PaymentTransaction.objects.all().delete()
Order.objects.all().delete() # Orders depend on ProduceListing, Farmer, Buyer

ProduceListing.objects.all().delete()

InvestorReview.objects.all().delete()
Loan.objects.all().delete()
Transfer.objects.all().delete()
Transaction.objects.all().delete()
FarmerProfile.objects.all().delete()
InvestorProfile.objects.all().delete()
BuyerProfile.objects.all().delete()
Account.objects.all().delete() # Delete accounts last as they are foreign keys

print("Existing data cleared.")


# --- Helper Functions ---
def create_random_datetime(days_ago_min, days_ago_max):
    """
    Generates a random timezone-aware datetime object within a specified range of days ago.
    """
    random_days = random.randint(days_ago_min, days_ago_max)
    random_hours = random.randint(0, 23)
    random_minutes = random.randint(0, 59)
    random_seconds = random.randint(0, 59)
    return timezone.now() - timedelta(days=random_days, hours=random_hours, minutes=random_minutes, seconds=random_seconds)

def create_random_date_only(days_ago_min, days_ago_max):
    """
    Generates a random date object (without time) within a specified range of days ago.
    """
    return (timezone.localdate() - timedelta(days=random.randint(days_ago_min, days_ago_max)))

def create_monthly_income_data(account_party, start_month_ago, end_month_ago, consistent_months, good_income_threshold=1000):
    """
    Creates monthly income transactions for an account.
    `consistent_months` defines how many months will meet or exceed the threshold.
    """
    today = timezone.localdate()
    # Iterate from the most recent month (0 months ago) back to end_month_ago
    for i in range(start_month_ago, end_month_ago + 1):
        # Calculate the target date for the transaction.
        # We want to ensure we hit distinct months for consistency calculation.
        # Calculate the first day of the month 'i' months ago
        # This handles year transitions correctly.
        target_date = today - timedelta(days=30 * i) # Approximate days ago
        # Set to the 15th of that month to avoid issues with month lengths
        target_date = target_date.replace(day=15)
        
        # Decide if this month should be consistent or below threshold
        # The logic here is reversed compared to how it might be used in a test,
        # but for population, it means the *first* `consistent_months` generated
        # will have good income.
        if i < consistent_months: # Make early months (closer to now) consistent
            income_amount = Decimal(random.uniform(good_income_threshold, good_income_threshold * 1.5)).quantize(Decimal('0.01'))
        else: # Make later months (further in past) lower or varied
            income_amount = Decimal(random.uniform(good_income_threshold * 0.2, good_income_threshold * 0.9)).quantize(Decimal('0.01'))
        
        # Create a transaction for the middle of the month
        Transaction.objects.create(
            account_party=account_party,
            name=f"Monthly Harvest Sale - {target_date.strftime('%Y-%m')}",
            date=target_date,
            category="produce_sale",
            status="income",
            amount=income_amount
        )
        print(f"  - Added income of GHS {income_amount:.2f} for {target_date.strftime('%Y-%m')}")


# --- Create Accounts and Profiles ---

print("\nCreating Admin Account...")
admin_account = Account.objects.create_superuser(
    email="admin@farmcred.com",
    password="adminpassword",
    full_name="FarmCred Admin"
)
print(f"Created Admin: {admin_account.email}")

print("\nCreating FarmCred Escrow Account...")
# This account will hold funds in escrow for marketplace transactions
escrow_account = Account.objects.create_user(
    email="escrow@farmcred.com",
    password="escrowpassword", # A strong password for this system account
    role="platform_escrow", # A new role for the escrow account
    full_name="FarmCred Escrow Service",
    phone_number="233509998887" # A dedicated number for escrow notifications
)
print(f"Created Platform Escrow Account: {escrow_account.email}")


print("\nCreating FarmCred Platform Lender Account...")
platform_lender_account = Account.objects.create_user(
    email="platform_lender@farmcred.com",
    password="platformpassword", # A strong password for this system account
    role="platform_lender",
    full_name="FarmCred Lending Platform",
    phone_number="233501234567" # A dedicated number for platform notifications
)
print(f"Created Platform Lender: {platform_lender_account.email}")


print("\nCreating Farmer 1 (Consistent Income, Good Loans)...")
farmer1_account = Account.objects.create_user(
    email="farmer1@example.com",
    password="password123",
    role="farmer",
    full_name="Kwame Okoro",
    phone_number="233241112223",
    receive_level_notifications=True,
    receive_sms_notifications=True,
    receive_email_notifications=True
)
farmer1_profile = FarmerProfile.objects.create(
    account=farmer1_account,
    full_name="Kwame Okoro",
    phone_number="233241112223",
    country="Ghana",
    region="Ashanti",
    dob=date(1985, 3, 10),
    national_id="GHA-KOK-001",
    home_address="Ashanti Region, Kumasi",
    produce=["cocoa@10.00", "plantain@5.00", "maize@2.50"] # Added prices
)
print(f"Created FarmerProfile for {farmer1_profile.full_name}")

print("\nCreating Farmer 2 (Inconsistent Income, Mixed Loans)...")
farmer2_account = Account.objects.create_user(
    email="farmer2@example.com",
    password="password123",
    role="farmer",
    full_name="Adwoa Mensah",
    phone_number="233242223334",
    receive_level_notifications=True,
    receive_sms_notifications=False,
    receive_email_notifications=True
)
farmer2_profile = FarmerProfile.objects.create(
    account=farmer2_account,
    full_name="Adwoa Mensah",
    phone_number="233242223334",
    country="Ghana",
    region="Volta",
    dob=date(1992, 7, 20),
    national_id="GHA-AMN-002",
    home_address="Volta Region, Ho",
    produce=["yam@15.00", "cassava@3.00", "rice@8.00"] # Added prices
)
print(f"Created FarmerProfile for {farmer2_profile.full_name}")

print("\nCreating Farmer 3 (New Farmer, Limited Data)...")
farmer3_account = Account.objects.create_user(
    email="farmer3@example.com",
    password="password123",
    role="farmer",
    full_name="Yaw Boafo",
    phone_number="233243334445",
    receive_level_notifications=False,
    receive_sms_notifications=False,
    receive_email_notifications=False
)
farmer3_profile = FarmerProfile.objects.create(
    account=farmer3_account,
    full_name="Yaw Boafo",
    phone_number="233243334445",
    country="Ghana",
    region="Brong-Ahafo",
    dob=date(1995, 11, 5),
    national_id="GHA-YBF-003",
    home_address="Brong-Ahafo, Techiman",
    produce=["cashew@20.00", "pepper@1.50"] # Added prices
)
print(f"Created FarmerProfile for {farmer3_profile.full_name}")


print("\nCreating Investor 1...")
investor1_account = Account.objects.create_user(
    email="investor1@example.com",
    password="password123",
    role="investor",
    full_name="David Attah",
    phone_number="233541112223",
    receive_level_notifications=True,
    receive_sms_notifications=True,
    receive_email_notifications=True
)
investor1_profile = InvestorProfile.objects.create(
    account=investor1_account,
    full_name="David Attah",
    phone_number="233541112223",
    country="Ghana",
    region="Greater Accra"
)
print(f"Created InvestorProfile for {investor1_profile.full_name}")

print("\nCreating Investor 2...")
investor2_account = Account.objects.create_user(
    email="investor2@example.com",
    password="password123",
    role="investor",
    full_name="Sarah Osei",
    phone_number="233542223334",
    receive_level_notifications=False,
    receive_sms_notifications=False,
    receive_email_notifications=True
)
investor2_profile = InvestorProfile.objects.create(
    account=investor2_account,
    full_name="Sarah Osei",
    phone_number="233542223334",
    country="Ghana",
    region="Western"
)
print(f"Created InvestorProfile for {investor2_profile.full_name}")


print("\nCreating Buyer 1...")
buyer1_account = Account.objects.create_user(
    email="buyer1@example.com",
    password="password123",
    role="buyer",
    full_name="Kwasi Amoah",
    phone_number="233245556667",
    receive_level_notifications=False, # Buyers don't have trust levels, but good to set defaults
    receive_sms_notifications=False,
    receive_email_notifications=True
)
buyer1_profile = BuyerProfile.objects.create( # NEW: Create BuyerProfile
    account=buyer1_account,
    full_name="Kwasi Amoah",
    phone_number="233245556667",
    country="Ghana",
    region="Greater Accra"
)
print(f"Created Buyer Account for {buyer1_account.full_name}")


# --- Add Transactions for Farmers ---

print("\nAdding transactions for Farmer 1 (Consistent Income)...")
# Generate 12 months of income data, 10 of which are consistent
create_monthly_income_data(farmer1_account, 0, 11, consistent_months=10)
Transaction.objects.create(account_party=farmer1_account, name="Equipment Repair", date=create_random_date_only(50, 100), category="equipment", status="expense", amount=Decimal(random.uniform(100, 300)).quantize(Decimal('0.01')))
Transaction.objects.create(account_party=farmer1_account, name="Farm Input Purchase", date=create_random_date_only(10, 40), category="farm_input", status="expense", amount=Decimal(random.uniform(50, 200)).quantize(Decimal('0.01')))

Transaction.objects.create(
    account_party=farmer1_account,
    buyer=buyer1_account,
    name="Sale of Tomatoes to Kwasi Amoah",
    date=create_random_date_only(1, 5),
    category="produce_sale",
    status="income",
    amount=Decimal(random.uniform(150, 400)).quantize(Decimal('0.01'))
)
print(f"  - Added produce sale transaction with buyer {buyer1_account.full_name}")


print("\nAdding transactions for Farmer 2 (Inconsistent Income)...")
# Generate 12 months of income data, 5 of which are consistent
create_monthly_income_data(farmer2_account, 0, 11, consistent_months=5)
Transaction.objects.create(account_party=farmer2_account, name="Electricity Bill", date=create_random_date_only(20, 80), category="other_expense", status="expense", amount=Decimal(random.uniform(50, 150)).quantize(Decimal('0.01')))


print("\nAdding transactions for Farmer 3 (Recent Activity Only)...")
# Generate 4 months of income data, all consistent
create_monthly_income_data(farmer3_account, 0, 3, consistent_months=4)
Transaction.objects.create(account_party=farmer3_account, name="Seedling Purchase", date=create_random_date_only(10, 30), category="farm_input", status="expense", amount=Decimal(random.uniform(20, 100)).quantize(Decimal('0.01')))


# --- Add Loans for Farmers ---

print("\nAdding loans for Farmer 1 (Good Repayment History)...")
# Loan from Investor 1 to Farmer 1 (on-time repayment)
Loan.objects.create(
    farmer=farmer1_account, lender=investor1_account, amount=Decimal('500.00'), date_taken=create_random_date_only(365, 400),
    due_date=create_random_date_only(180, 200), date_repaid=create_random_date_only(170, 190), on_time=True, status='repaid',
    interest_rate=Decimal('5.0'), repayment_period_months=6
)
# Loan from Investor 1 to Farmer 1 (on-time repayment)
Loan.objects.create(
    farmer=farmer1_account, lender=investor1_account, amount=Decimal('1000.00'), date_taken=create_random_date_only(200, 250),
    due_date=create_random_date_only(90, 120), date_repaid=create_random_date_only(80, 100), on_time=True, status='repaid',
    interest_rate=Decimal('4.5'), repayment_period_months=4
)
# Loan from Investor 1 to Farmer 1 (on-time repayment)
Loan.objects.create(
    farmer=farmer1_account, lender=investor1_account, amount=Decimal('750.00'), date_taken=create_random_date_only(50, 80),
    due_date=create_random_date_only(20, 30), date_repaid=create_random_date_only(15, 25), on_time=True, status='repaid',
    interest_rate=Decimal('5.5'), repayment_period_months=3
)
# Loan from Investor 1 to Farmer 1 (active, overdue)
Loan.objects.create(
    farmer=farmer1_account, lender=investor1_account, amount=Decimal('200.00'), date_taken=create_random_date_only(10, 20),
    due_date=create_random_date_only(1, 5), date_repaid=None, status="active", on_time=False, # Due in the past, not repaid
    interest_rate=Decimal('6.0'), repayment_period_months=1
)


print("\nAdding loans for Farmer 2 (Mixed Repayment History)...")
# Loan from Investor 2 to Farmer 2 (late repayment)
Loan.objects.create(
    farmer=farmer2_account, lender=investor2_account, amount=Decimal('300.00'), date_taken=create_random_date_only(300, 350),
    due_date=create_random_date_only(150, 180), date_repaid=create_random_date_only(190, 220), on_time=False, status='repaid',
    interest_rate=Decimal('7.0'), repayment_period_months=5
)
# Loan from Investor 2 to Farmer 2 (on-time repayment)
Loan.objects.create(
    farmer=farmer2_account, lender=investor2_account, amount=Decimal('800.00'), date_taken=create_random_date_only(100, 150),
    due_date=create_random_date_only(40, 60), date_repaid=create_random_date_only(30, 50), on_time=True, status='repaid',
    interest_rate=Decimal('6.5'), repayment_period_months=3
)
# Loan from Investor 2 to Farmer 2 (active, overdue)
Loan.objects.create(
    farmer=farmer2_account, lender=investor2_account, amount=Decimal('400.00'), date_taken=create_random_date_only(20, 40),
    due_date=create_random_date_only(5, 15), date_repaid=None, on_time=False, status='active', # Due in the past, not repaid
    interest_rate=Decimal('7.5'), repayment_period_months=2
)


print("\nAdding loans from FarmCred Platform Lender...")
# Active, overdue loan from Platform Lender to Farmer 1
Loan.objects.create(
    farmer=farmer1_account, lender=platform_lender_account, amount=Decimal('1200.00'), date_taken=create_random_date_only(60, 90),
    due_date=create_random_date_only(1, 30), date_repaid=None, status="active", on_time=False, # Due in the past, not repaid
    interest_rate=Decimal('4.0'), repayment_period_months=4
)
# Active, not yet due loan from Platform Lender to Farmer 2
Loan.objects.create(
    farmer=farmer2_account, lender=platform_lender_account, amount=Decimal('900.00'), date_taken=create_random_date_only(40, 70),
    due_date=timezone.localdate() + timedelta(days=random.randint(5, 20)), date_repaid=None, status="active", on_time=True, # Due in future
    interest_rate=Decimal('3.5'), repayment_period_months=3
)
# Active, not yet due loan from Platform Lender to Farmer 3
Loan.objects.create(
    farmer=farmer3_account, lender=platform_lender_account, amount=Decimal('300.00'), date_taken=create_random_date_only(5, 10),
    due_date=timezone.localdate() + timedelta(days=random.randint(10, 30)), # Due in the future
    status="active", on_time=True, # Due in future
    interest_rate=Decimal('4.2'), repayment_period_months=1
)


# --- NEW LOAN DATA FOR ROI FEATURE ---
print("\nAdding specific loans and repayments for ROI demonstration...")

# Loan with positive ROI
due_date_repaid_positive_roi = date.today() + timedelta(days=90)
loan_positive_roi = Loan.objects.create(
    farmer=farmer1_account,
    lender=investor1_account,
    amount=Decimal('5000.00'),
    due_date=due_date_repaid_positive_roi,
    repayment_period_months=3,
    status='repaid'
)
# Create a repayment transaction for the loan with a 10% ROI
# 1. Create an expense transaction for the farmer
Transaction.objects.create(
    account_party=farmer1_account,
    name=f"Repayment for Loan {loan_positive_roi.id} (to {investor1_account.full_name})",
    date=timezone.localdate(),
    category="loan_repayment",
    status="expense",
    amount=Decimal('5500.00')
)
# 2. Create an income transaction for the investor
Transaction.objects.create(
    account_party=investor1_account,
    name=f"Repayment for Loan {loan_positive_roi.id} (from {farmer1_account.full_name})",
    date=timezone.localdate(),
    category="investment", # Use 'investment' category for investor income
    status="income",
    amount=Decimal('5500.00')
)
print(f"  - Added loan with positive ROI for {farmer1_account.full_name}")

# Loan with zero ROI
due_date_zero_roi = date.today() + timedelta(days=120)
loan_zero_roi = Loan.objects.create(
    farmer=farmer1_account,
    lender=investor2_account,
    amount=Decimal('2000.00'),
    due_date=due_date_zero_roi,
    repayment_period_months=4,
    status='repaid'
)
# Repayment exactly equals loan amount (0% ROI)
# 1. Create an expense transaction for the farmer
Transaction.objects.create(
    account_party=farmer1_account,
    name=f"Repayment for Loan {loan_zero_roi.id} (to {investor2_account.full_name})",
    date=timezone.localdate(),
    category="loan_repayment",
    status="expense",
    amount=Decimal('2000.00')
)
# 2. Create an income transaction for the investor
Transaction.objects.create(
    account_party=investor2_account,
    name=f"Repayment for Loan {loan_zero_roi.id} (from {farmer1_account.full_name})",
    date=timezone.localdate(),
    category="investment", # Use 'investment' category for investor income
    status="income",
    amount=Decimal('2000.00')
)
print(f"  - Added loan with zero ROI for {farmer1_account.full_name}")

# Loan with no ROI yet (still active)
due_date_active_roi = date.today() + timedelta(days=180)
loan_active_no_roi = Loan.objects.create(
    farmer=farmer2_account,
    lender=investor2_account,
    amount=Decimal('7500.00'),
    due_date=due_date_active_roi,
    repayment_period_months=6,
    status='active'
)
# Partial repayment to show progress, but no ROI should be calculated yet
# 1. Create an expense transaction for the farmer
Transaction.objects.create(
    account_party=farmer2_account,
    name=f"Partial Repayment for Loan {loan_active_no_roi.id} (to {investor2_account.full_name})",
    date=timezone.localdate(),
    category="loan_repayment",
    status="expense",
    amount=Decimal('3000.00')
)
# 2. Create an income transaction for the investor
Transaction.objects.create(
    account_party=investor2_account,
    name=f"Partial Repayment for Loan {loan_active_no_roi.id} (from {farmer2_account.full_name})",
    date=timezone.localdate(),
    category="investment",
    status="income",
    amount=Decimal('3000.00')
)
print(f"  - Added active loan with no ROI for {farmer2_account.full_name}")


print("\nAdding loans for Farmer 2 (Mixed Repayment History)...")
# Loan from Investor 2 to Farmer 2 (late repayment)
Loan.objects.create(
    farmer=farmer2_account, lender=investor2_account, amount=Decimal('300.00'), date_taken=create_random_date_only(300, 350),
    due_date=create_random_date_only(150, 180), date_repaid=create_random_date_only(190, 220), on_time=False, status='repaid',
    interest_rate=Decimal('7.0'), repayment_period_months=5
)
# Loan from Investor 2 to Farmer 2 (on-time repayment)
Loan.objects.create(
    farmer=farmer2_account, lender=investor2_account, amount=Decimal('800.00'), date_taken=create_random_date_only(100, 150),
    due_date=create_random_date_only(40, 60), date_repaid=create_random_date_only(30, 50), on_time=True, status='repaid',
    interest_rate=Decimal('6.5'), repayment_period_months=3
)
# Loan from Investor 2 to Farmer 2 (active, overdue)
Loan.objects.create(
    farmer=farmer2_account, lender=investor2_account, amount=Decimal('400.00'), date_taken=create_random_date_only(20, 40),
    due_date=create_random_date_only(5, 15), date_repaid=None, on_time=False, status='active', # Due in the past, not repaid
    interest_rate=Decimal('7.5'), repayment_period_months=2
)


print("\nAdding loans from FarmCred Platform Lender...")
# Active, overdue loan from Platform Lender to Farmer 1
Loan.objects.create(
    farmer=farmer1_account, lender=platform_lender_account, amount=Decimal('1200.00'), date_taken=create_random_date_only(60, 90),
    due_date=create_random_date_only(1, 30), date_repaid=None, status="active", on_time=False, # Due in the past, not repaid
    interest_rate=Decimal('4.0'), repayment_period_months=4
)
# Active, not yet due loan from Platform Lender to Farmer 2
Loan.objects.create(
    farmer=farmer2_account, lender=platform_lender_account, amount=Decimal('900.00'), date_taken=create_random_date_only(40, 70),
    due_date=timezone.localdate() + timedelta(days=random.randint(5, 20)), date_repaid=None, status="active", on_time=True, # Due in future
    interest_rate=Decimal('3.5'), repayment_period_months=3
)
# Active, not yet due loan from Platform Lender to Farmer 3
Loan.objects.create(
    farmer=farmer3_account, lender=platform_lender_account, amount=Decimal('300.00'), date_taken=create_random_date_only(5, 10),
    due_date=timezone.localdate() + timedelta(days=random.randint(10, 30)), # Due in the future
    status="active", on_time=True, # Due in future
    interest_rate=Decimal('4.2'), repayment_period_months=1
)

# --- Add Transfers ---
print("\nAdding transfers...")
Transfer.objects.create(
    farmer=farmer1_account, transfer_id="TRF001", date=create_random_date_only(10, 20),
    recipient_or_sender="Mama Akosua", type="sent", amount=Decimal('250.00'), status="completed",
    description="Money sent to family"
)
Transfer.objects.create(
    farmer=farmer2_account, transfer_id="TRF002", date=create_random_date_only(5, 15),
    recipient_or_sender="AgriBank Loan", type="received", amount=Decimal('700.00'), status="completed",
    description="Loan disbursement from AgriBank"
)
Transfer.objects.create(
    farmer=farmer1_account, transfer_id="TRF003", date=create_random_date_only(2, 8),
    recipient_or_sender="John Doe", type="sent", amount=Decimal('50.00'), status="pending",
    description="Payment for farm supplies"
)


# --- Add Investor Reviews ---
print("\nAdding investor reviews...")
InvestorReview.objects.create(investor=investor1_account, farmer=farmer1_account)
InvestorReview.objects.create(investor=investor1_account, farmer=farmer2_account)
InvestorReview.objects.create(investor=investor2_account, farmer=farmer1_account)


# --- Add Produce Listings ---
print("\nAdding produce listings...")
# Farmer 1's listings
listing1_farmer1 = ProduceListing.objects.create(
    farmer=farmer1_account,
    produce_type="Maize",
    quantity_available=Decimal('500.00'),
    unit_of_measure="kg",
    base_price_per_unit=Decimal('2.50'),
    discount_percentage=Decimal('0.00'),
    available_until=timezone.localdate() + timedelta(days=30),
    status='active',
    location_description="Ashanti Region, Kumasi", # Added location
    image_url="https://placehold.co/600x400/orange/white?text=Maize" # Added image URL
)
print(f"Added listing: {listing1_farmer1.produce_type} by {listing1_farmer1.farmer.full_name}")

listing2_farmer1 = ProduceListing.objects.create(
    farmer=farmer1_account,
    produce_type="Tomatoes",
    quantity_available=Decimal('100.00'),
    unit_of_measure="crates",
    base_price_per_unit=Decimal('25.00'),
    discount_percentage=Decimal('10.00'),
    available_until=timezone.localdate() + timedelta(days=15),
    status='active',
    location_description="Ashanti Region, Kumasi", # Added location
    image_url="https://placehold.co/600x400/red/white?text=Tomatoes" # Added image URL
)
print(f"Added listing: {listing2_farmer1.produce_type} by {listing2_farmer1.farmer.full_name}")

# Farmer 2's listings
listing1_farmer2 = ProduceListing.objects.create(
    farmer=farmer2_account,
    produce_type="Yam",
    quantity_available=Decimal('200.00'),
    unit_of_measure="pieces",
    base_price_per_unit=Decimal('15.00'),
    discount_percentage=Decimal('0.00'),
    available_until=timezone.localdate() + timedelta(days=45),
    status='active',
    location_description="Volta Region, Ho", # Added location
    image_url="https://placehold.co/600x400/brown/white?text=Yam" # Added image URL
)
print(f"Added listing: {listing1_farmer2.produce_type} by {listing1_farmer2.farmer.full_name}")

# Farmer 3's listings (new farmer, maybe fewer listings)
listing1_farmer3 = ProduceListing.objects.create(
    farmer=farmer3_account,
    produce_type="Cashew",
    quantity_available=Decimal('75.00'),
    unit_of_measure="kg",
    base_price_per_unit=Decimal('20.00'),
    discount_percentage=Decimal('5.00'),
    available_until=timezone.localdate() + timedelta(days=60),
    status='active',
    location_description="Brong-Ahafo, Techiman", # Added location
    image_url="https://placehold.co/600x400/green/white?text=Cashew" # Added image URL
)
print(f"Added listing: {listing1_farmer3.produce_type} by {listing1_farmer3.farmer.full_name}")


# --- Add Sample Orders, Payment Transactions, and Buyer Reviews ---
print("\nAdding sample orders, payment transactions, and buyer reviews...")

# Order 1: Completed Order
order1_amount = listing1_farmer1.get_current_price_per_unit() * Decimal('100.00') # 100 kg of Maize
order1 = Order.objects.create(
    buyer=buyer1_account,
    farmer=farmer1_account,
    produce_listing=listing1_farmer1,
    quantity=Decimal('100.00'),
    total_amount=order1_amount,
    # order_date is auto_now_add=True, so no need to set it explicitly
    delivery_date=create_random_date_only(50, 60), # Use date_only for DateField
    status=Order.STATUS_COMPLETED,
    updated_at=create_random_datetime(40, 50) # Use datetime for DateTimeField
)
print(f"  - Created COMPLETED Order {order1.id} for {order1.produce_listing.produce_type}")

PaymentTransaction.objects.create(
    order=order1,
    payer=buyer1_account, # Corrected field name based on payments/models.py
    recipient=escrow_account, # Corrected field name based on payments/models.py
    amount=order1_amount,
    transaction_type=PaymentTransaction.TYPE_ESCROW_DEPOSIT, # Use constant
    status=PaymentTransaction.STATUS_SUCCESSFUL, # Use constant
    # created_at is auto_now_add=True, so no need to set it explicitly
)
print(f"    - Added PaymentTransaction for Order {order1.id} (deposit to escrow)")

PaymentTransaction.objects.create(
    order=order1,
    payer=escrow_account, # Corrected field name based on payments/models.py
    recipient=farmer1_account, # Corrected field name based on payments/models.py
    amount=order1_amount,
    transaction_type=PaymentTransaction.TYPE_ESCROW_RELEASE, # Use constant
    status=PaymentTransaction.STATUS_SUCCESSFUL, # Use constant
    # created_at is auto_now_add=True, so no need to set it explicitly
)
print(f"    - Added PaymentTransaction for Order {order1.id} (release to farmer)")

BuyerReview.objects.create(
    buyer=buyer1_account,
    farmer=farmer1_account,
    order=order1,
    rating=5,
    comment="Excellent maize, very fresh and good quantity!",
    created_at=order1.updated_at + timedelta(days=2) # Use created_at for BuyerReview
)
print(f"    - Added BuyerReview for Order {order1.id}")


# Order 2: Paid to Escrow (awaiting delivery/receipt)
order2_amount = listing2_farmer1.get_current_price_per_unit() * Decimal('5.00') # 5 crates of Tomatoes
order2 = Order.objects.create(
    buyer=buyer1_account,
    farmer=farmer1_account,
    produce_listing=listing2_farmer1,
    quantity=Decimal('5.00'),
    total_amount=order2_amount,
    # order_date is auto_now_add=True
    status=Order.STATUS_PAID_TO_ESCROW,
    updated_at=create_random_datetime(5, 10) # Use datetime for DateTimeField
)
print(f"  - Created PAID_TO_ESCROW Order {order2.id} for {order2.produce_listing.produce_type}")

PaymentTransaction.objects.create(
    order=order2,
    payer=buyer1_account,
    recipient=escrow_account,
    amount=order2_amount,
    transaction_type=PaymentTransaction.TYPE_ESCROW_DEPOSIT,
    status=PaymentTransaction.STATUS_SUCCESSFUL,
    # created_at is auto_now_add=True
)
print(f"    - Added PaymentTransaction for Order {order2.id} (deposit to escrow)")


# Order 3: Disputed Order
order3_amount = listing1_farmer2.get_current_price_per_unit() * Decimal('20.00') # 20 pieces of Yam
order3 = Order.objects.create(
    buyer=buyer1_account,
    farmer=farmer2_account,
    produce_listing=listing1_farmer2,
    quantity=Decimal('20.00'),
    total_amount=order3_amount,
    # order_date is auto_now_add=True
    status=Order.STATUS_DISPUTED,
    updated_at=create_random_datetime(10, 20) # Use datetime for DateTimeField
)
print(f"  - Created DISPUTED Order {order3.id} for {order3.produce_listing.produce_type}")

PaymentTransaction.objects.create(
    order=order3,
    payer=buyer1_account,
    recipient=escrow_account,
    amount=order3_amount,
    transaction_type=PaymentTransaction.TYPE_ESCROW_DEPOSIT,
    status=PaymentTransaction.STATUS_SUCCESSFUL,
    # created_at is auto_now_add=True
)
print(f"    - Added PaymentTransaction for Order {order3.id} (deposit to escrow)")


# --- Add Sample Conversations and Messages ---
print("\nAdding sample conversations and messages...")

# Conversation 1: Buyer1 and Farmer1 about Maize listing
conversation1 = Conversation.objects.create(
    farmer=farmer1_account,
    buyer=buyer1_account,
    related_listing=listing1_farmer1,
    created_at=create_random_datetime(10, 20),
    updated_at=create_random_datetime(1, 5)
)
print(f"  - Created Conversation {conversation1.id} between {farmer1_account.full_name} and {buyer1_account.full_name}")

Message.objects.create(
    conversation=conversation1,
    sender=buyer1_account,
    recipient=farmer1_account,
    content="Hello, is the maize still available? What's the minimum order quantity?",
    created_at=conversation1.created_at + timedelta(minutes=5)
)
Message.objects.create(
    conversation=conversation1,
    sender=farmer1_account,
    recipient=buyer1_account,
    content="Yes, it's available. Minimum order is 50kg.",
    created_at=conversation1.created_at + timedelta(minutes=10)
)
Message.objects.create(
    conversation=conversation1,
    sender=buyer1_account,
    recipient=farmer1_account,
    content="Great! I'd like to order 100kg. Can you deliver by next week?",
    created_at=conversation1.created_at + timedelta(minutes=15)
)
print(f"    - Added messages to Conversation {conversation1.id}")


# Conversation 2: Buyer1 and Farmer2 about Yam listing
conversation2 = Conversation.objects.create(
    farmer=farmer2_account,
    buyer=buyer1_account,
    related_listing=listing1_farmer2,
    created_at=create_random_datetime(20, 30),
    updated_at=create_random_datetime(5, 10)
)
print(f"  - Created Conversation {conversation2.id} between {farmer2_account.full_name} and {buyer1_account.full_name}")

Message.objects.create(
    conversation=conversation2,
    sender=buyer1_account,
    recipient=farmer2_account,
    content="Hi, are your yams organic?",
    created_at=conversation2.created_at + timedelta(minutes=7)
)
Message.objects.create(
    conversation=conversation2,
    sender=farmer2_account,
    recipient=buyer1_account,
    content="Yes, they are organically grown.",
    created_at=conversation2.created_at + timedelta(minutes=12)
)
print(f"    - Added messages to Conversation {conversation2.id}")


print("\n--- Data Population Complete ---")
print("Now running trust calculation command to update FarmerProfile.trust_level_stars...")
# Ensure the management command is called after all data is populated
call_command('calculate_trust_levels')

print("\n--- Verification Steps ---")
print("1. Farmer 1 (Kwame Okoro): Should have high trust_level_stars and high trust_score_percent.")
print("2. Farmer 2 (Adwoa Mensah): Should have medium trust_level_stars and mixed trust_score_percent.")
print("3. Farmer 3 (Yaw Boafo): Should have low trust_level_stars (less data) and neutral trust_score_percent.")
print("\nTo verify, you can fetch data via API or Django shell:")
print("  - For API: Authenticate as an investor and visit /api/investor/farmers/ to see list.")
print("  - For API: Authenticate as a farmer and visit /api/farmer/overview/.")
print("  - For API: Authenticate as a buyer and visit /api/marketplace/listings/ and /api/payments/my-orders/.")
print("  - For API: Authenticate as any user and visit /api/marketplace/conversations/.")
print("  - From Django Shell: FarmerProfile.objects.all().values('full_name', 'trust_level_stars', 'trust_score_percent')")
print("  - From Django Shell: Order.objects.all().values('id', 'status', 'total_amount', 'buyer__full_name', 'farmer__full_name')")
print("  - From Django Shell: Conversation.objects.all().values('id', 'farmer__full_name', 'buyer__full_name', 'related_listing__produce_type')")
