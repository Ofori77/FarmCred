# ussd/tests.py
from django.test import TestCase, Client
from django.urls import reverse
from django.utils import timezone
import datetime
from datetime import timedelta # <--- Ensure this is imported
from django.http import QueryDict # Import QueryDict
from decimal import Decimal # Import Decimal for comparisons
import re # For asserting regex in responses

from account.models import Account
from core.models import FarmerProfile, InvestorProfile, Loan, Transaction, InvestorReview # Import InvestorReview
from ussd.models import UssdSession, PendingConfirmation # Import PendingConfirmation


# Define common USSD gateway parameters for Hubtel
HUBTEL_COMMON_PARAMS = {
    'ServiceCode': '*800#',
    'Operator': 'MTN',
}

class UssdMenuTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.ussd_callback_url = reverse('ussd_callback')

        # Clear data before each test for a clean slate
        Account.objects.all().delete()
        FarmerProfile.objects.all().delete()
        InvestorProfile.objects.all().delete()
        UssdSession.objects.all().delete()
        Loan.objects.all().delete()
        Transaction.objects.all().delete()
        InvestorReview.objects.all().delete() # Clear InvestorReview too
        PendingConfirmation.objects.all().delete() # Clear pending confirmations too

        # Create a pre-existing Farmer for login and confirmation tests
        self.existing_farmer_phone = '233240000001'
        self.existing_farmer_pin = '1234'
        self.existing_farmer_national_id = 'GHA-FARMER-001'
        self.existing_farmer_user = Account.objects.create_user(
            email="farmer@example.com",
            password="password123", # Not used for USSD PIN
            phone_number=self.existing_farmer_phone,
            full_name="Test Farmer",
            role="farmer"
        )
        self.existing_farmer_user.set_pin(self.existing_farmer_pin) 
        self.existing_farmer_profile = FarmerProfile.objects.create(
            account=self.existing_farmer_user,
            full_name="Test Farmer",
            phone_number=self.existing_farmer_phone,
            country="Ghana",
            region="Ashanti",
            dob="1990-01-01",
            national_id=self.existing_farmer_national_id,
            trust_level_stars=Decimal('4.0'), # Set for loan qualification
            trust_score_percent=Decimal('70.00') # Set for loan qualification
        )

        # Create a pre-existing Investor for login and confirmation tests
        self.existing_investor_phone = '233240000002'
        self.existing_investor_pin = '5678'
        self.existing_investor_user = Account.objects.create_user(
            email="investor@example.com",
            password="password123", # Not used for USSD PIN
            phone_number=self.existing_investor_phone,
            full_name="Test Investor",
            role="investor"
        )
        self.existing_investor_user.set_pin(self.existing_investor_pin) 
        self.existing_investor_profile = InvestorProfile.objects.create(
            account=self.existing_investor_user,
            full_name="Test Investor",
            phone_number=self.existing_investor_phone,
            country="Ghana",
            region="Greater Accra"
        )

        # Create a pre-existing Platform Lender (FarmCred)
        self.platform_lender_phone = '233501234567' # Example phone for platform
        self.platform_lender_user = Account.objects.create_user(
            email="platform@farmcred.com",
            password="platformpassword",
            phone_number=self.platform_lender_phone,
            full_name="FarmCred Platform",
            role="platform_lender"
        )

        # Create a pre-existing Buyer
        self.existing_buyer_phone = '233240000003'
        self.existing_buyer_user = Account.objects.create_user(
            email="buyer@example.com",
            password="password123",
            phone_number=self.existing_buyer_phone,
            full_name="Test Buyer",
            role="buyer"
        )


    def _make_ussd_request(self, session_id, phone_number, user_input):
        """Helper to simulate a USSD request."""
        data = QueryDict('', mutable=True)
        data.update(HUBTEL_COMMON_PARAMS)
        data['sessionId'] = session_id
        data['phoneNumber'] = phone_number
        data['text'] = user_input
        response = self.client.post(self.ussd_callback_url, data)
        return response.content.decode('utf-8')

    def test_initial_menu(self):
        session_id = 'test_session_1'
        response = self._make_ussd_request(session_id, '233240000000', '')
        self.assertIn("CON Welcome to FarmCred. Are you a: \\n1. Farmer \\n2. Investor \\n4. Buyer", response)
        self.assertIn("1. Farmer", response)
        self.assertIn("2. Investor", response)
        self.assertNotIn("3. Lender", response) # Assert Lender is not present
        self.assertIn("4. Buyer", response)

    def test_farmer_registration_flow(self):
        session_id = 'test_session_reg_farmer'
        phone = '233241111111'

        # 1. Start session, select Farmer
        response = self._make_ussd_request(session_id, phone, '')
        response = self._make_ussd_request(session_id, phone, '1')
        self.assertIn("CON Register as Farmer: \\nPlease enter your Full Name:", response) 

        # 2. Enter Full Name
        response = self._make_ussd_request(session_id, phone, 'John Doe')
        self.assertIn("CON Enter your 4-digit PIN:", response)

        # 3. Enter PIN
        response = self._make_ussd_request(session_id, phone, '1234')
        self.assertIn("CON Confirm your 4-digit PIN:", response)

        # 4. Confirm PIN (mismatch)
        response = self._make_ussd_request(session_id, phone, '4321')
        self.assertIn("CON PINs do not match. Please re-enter your 4-digit PIN:", response)

        # 5. Re-enter PIN (correct) - This returns to farmer_reg_pin_confirm state
        response = self._make_ussd_request(session_id, phone, '1234')
        self.assertIn("CON Confirm your 4-digit PIN:", response) # Expecting to be asked to confirm again

        # 6. Re-confirm PIN (correct) - This should finalize registration
        response = self._make_ussd_request(session_id, phone, '1234')
        self.assertIn("END Registration successful! Your ID is", response)
        self.assertTrue(Account.objects.filter(phone_number=phone, role='farmer').exists())
        self.assertTrue(FarmerProfile.objects.filter(account__phone_number=phone).exists())

    def test_farmer_login_success(self):
        session_id = 'test_session_farmer_login'
        
        # 1. Start session, select Farmer
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, '')
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, '1')
        self.assertIn("CON Welcome back Farmer! Enter your 4-digit PIN:", response)

        # 2. Enter correct PIN
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, self.existing_farmer_pin)
        self.assertIn("CON Farmer Menu: \\n1. Check My Stats \\n2. Update Products \\n3. Transactions \\n4. View Transaction Logs \\n5. Request Loan \\n00. Main Menu", response)
        self.assertIn("1. Check My Stats", response)
        self.assertIn("5. Request Loan", response) # Check for loan option
        session = UssdSession.objects.get(session_id=session_id)
        self.assertEqual(session.current_menu_state, 'farmer_main_menu')
        self.assertEqual(session.data_payload.get('logged_in_user_id'), self.existing_farmer_user.id)

    def test_farmer_login_fail(self):
        session_id = 'test_session_farmer_login_fail'
        
        # 1. Start session, select Farmer
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, '')
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, '1')
        
        # 2. Enter incorrect PIN
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, '9999')
        self.assertIn("CON Invalid PIN. Try again or dial 00 to go back to Main Menu.", response)
        session = UssdSession.objects.get(session_id=session_id)
        self.assertEqual(session.current_menu_state, 'farmer_pin_entry') # Stays in pin entry

    def test_farmer_check_my_stats_flow(self):
        session_id = 'test_session_farmer_stats'
        
        # Login farmer
        self._make_ussd_request(session_id, self.existing_farmer_phone, '')
        self._make_ussd_request(session_id, self.existing_farmer_phone, '1')
        self._make_ussd_request(session_id, self.existing_farmer_phone, self.existing_farmer_pin)
        
        # 1. Select Check My Stats
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, '1')
        self.assertIn(f"CON My Stats:\\nTrust Score: {self.existing_farmer_profile.trust_score_percent:.2f}%\\nTrust Level: {self.existing_farmer_profile.trust_level_stars:.1f} Stars\\n\\n1. Share via SMS\\n0. Back", response)
        self.assertIn("1. Share via SMS", response)
        self.assertIn("0. Back", response)
        session = UssdSession.objects.get(session_id=session_id)
        self.assertEqual(session.current_menu_state, 'farmer_stats_display')

        # 2. Go back
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, '0')
        self.assertIn("CON Farmer Menu:", response)
        self.assertEqual(UssdSession.objects.get(session_id=session_id).current_menu_state, 'farmer_main_menu')

    def test_farmer_share_stats_via_sms_flow(self):
        session_id = 'test_session_farmer_share_stats'
        recipient_phone = '233249876543'

        # Login farmer and navigate to stats display
        self._make_ussd_request(session_id, self.existing_farmer_phone, '')
        self._make_ussd_request(session_id, self.existing_farmer_phone, '1')
        self._make_ussd_request(session_id, self.existing_farmer_phone, self.existing_farmer_pin)
        self._make_ussd_request(session_id, self.existing_farmer_phone, '1') # Check My Stats

        # 1. Select Share via SMS
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, '1')
        self.assertIn("CON Enter recipient's phone number", response)
        self.assertEqual(UssdSession.objects.get(session_id=session_id).current_menu_state, 'farmer_stats_sms_recipient')

        # 2. Enter recipient phone number
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, recipient_phone)
        self.assertIn("END Stats sent successfully via SMS!", response)
        self.assertFalse(UssdSession.objects.get(session_id=session_id).is_active) # Session ends

    def test_farmer_update_products_flow(self):
        session_id = 'test_session_farmer_products'
        
        # Login farmer
        self._make_ussd_request(session_id, self.existing_farmer_phone, '')
        self._make_ussd_request(session_id, self.existing_farmer_phone, '1')
        self._make_ussd_request(session_id, self.existing_farmer_phone, self.existing_farmer_pin)
        
        # 1. Select Update Products
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, '2')
        self.assertIn("CON Update Products: \\n1. Add Product \\n2. Remove Product \\n3. Change Price \\n0. Back", response)
        self.assertIn("1. Add Product", response)
        self.assertIn("2. Remove Product", response)
        self.assertIn("3. Change Price", response)
        self.assertEqual(UssdSession.objects.get(session_id=session_id).current_menu_state, 'farmer_update_products_menu')

        # 2. Go back
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, '0')
        self.assertIn("CON Farmer Menu:", response)
        self.assertEqual(UssdSession.objects.get(session_id=session_id).current_menu_state, 'farmer_main_menu')

    def test_farmer_add_product_flow(self):
        session_id = 'test_session_add_product'
        
        # Login farmer and navigate to Update Products menu
        self._make_ussd_request(session_id, self.existing_farmer_phone, '')
        self._make_ussd_request(session_id, self.existing_farmer_phone, '1')
        self._make_ussd_request(session_id, self.existing_farmer_phone, self.existing_farmer_pin)
        self._make_ussd_request(session_id, self.existing_farmer_phone, '2') # Update Products
        
        # 1. Select Add Product
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, '1')
        self.assertIn("CON Enter product name (e.g., Mangoes):", response)
        self.assertEqual(UssdSession.objects.get(session_id=session_id).current_menu_state, 'farmer_add_product_name')

        # 2. Enter product name
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, 'New Beans')
        self.assertIn("CON Enter product price per unit (e.g., 5.00):", response)
        self.assertEqual(UssdSession.objects.get(session_id=session_id).current_menu_state, 'farmer_add_product_price')

        # 3. Enter product price
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, '7.50')
        self.assertIn("CON 'New Beans' added successfully! \\n0. Back to Update Products", response) 
        self.existing_farmer_profile.refresh_from_db()
        self.assertIn('New Beans@7.50', self.existing_farmer_profile.produce)

    def test_farmer_remove_product_flow(self):
        session_id = 'test_session_remove_product'
        self.existing_farmer_profile.produce = ['Cassava@10.00', 'Maize@5.00']
        self.existing_farmer_profile.save()

        # Login farmer and navigate to Update Products menu
        self._make_ussd_request(session_id, self.existing_farmer_phone, '')
        self._make_ussd_request(session_id, self.existing_farmer_phone, '1')
        self._make_ussd_request(session_id, self.existing_farmer_phone, self.existing_farmer_pin)
        self._make_ussd_request(session_id, self.existing_farmer_phone, '2') # Update Products

        # 1. Select Remove Product
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, '2')
        self.assertIn("CON Select product to remove:\\n1. Cassava@10.00\\n2. Maize@5.00\\n0. Back", response)
        self.assertIn("1. Cassava@10.00", response)
        self.assertIn("2. Maize@5.00", response)
        self.assertEqual(UssdSession.objects.get(session_id=session_id).current_menu_state, 'farmer_remove_product_select')

        # 2. Select product to remove (e.g., Cassava)
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, '1')
        # Changed assertion to CON as per views.py behavior, and fixed newline escaping
        self.assertIn("CON 'Cassava' removed successfully! \\n0. Back to Update Products", response) 
        self.existing_farmer_profile.refresh_from_db()
        self.assertNotIn('Cassava@10.00', self.existing_farmer_profile.produce)
        self.assertIn('Maize@5.00', self.existing_farmer_profile.produce)
        self.assertEqual(UssdSession.objects.get(session_id=session_id).current_menu_state, 'farmer_update_products_menu')


    def test_farmer_change_price_flow(self):
        session_id = 'test_session_change_price'
        self.existing_farmer_profile.produce = ['Cassava@10.00', 'Maize@5.00']
        self.existing_farmer_profile.save()

        # Login farmer and navigate to Update Products menu
        self._make_ussd_request(session_id, self.existing_farmer_phone, '')
        self._make_ussd_request(session_id, self.existing_farmer_phone, '1')
        self._make_ussd_request(session_id, self.existing_farmer_phone, self.existing_farmer_pin)
        self._make_ussd_request(session_id, self.existing_farmer_phone, '2') # Update Products

        # 1. Select Change Price
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, '3')
        self.assertIn("CON Select product to change price:\\n1. Cassava@10.00\\n2. Maize@5.00\\n0. Back", response)
        self.assertIn("1. Cassava@10.00", response)
        self.assertEqual(UssdSession.objects.get(session_id=session_id).current_menu_state, 'farmer_change_price_select')

        # 2. Select product (e.g., Maize)
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, '2')
        self.assertIn("CON Enter new price for 'Maize'", response)
        self.assertEqual(UssdSession.objects.get(session_id=session_id).current_menu_state, 'farmer_change_price_new_price')

        # 3. Enter new price
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, '6.50')
        self.assertIn("CON Price for 'Maize' updated to 6.50! \\n0. Back to Update Products", response) 
        self.existing_farmer_profile.refresh_from_db()
        self.assertIn('Maize@6.50', self.existing_farmer_profile.produce)
        self.assertNotIn('Maize@5.00', self.existing_farmer_profile.produce)

    def test_farmer_pay_loan_flow_platform_lender(self):
        session_id = 'test_session_pay_loan_platform'
        # Loan from platform lender
        loan = Loan.objects.create(
            farmer=self.existing_farmer_user,
            lender=self.platform_lender_user, # Lender is FarmCred
            amount=Decimal('100.00'),
            date_taken=timezone.localdate() - timedelta(days=30),
            due_date=timezone.localdate() + timedelta(days=30),
            status='active'
        )

        # Login farmer and navigate to Transactions menu
        self._make_ussd_request(session_id, self.existing_farmer_phone, '')
        self._make_ussd_request(session_id, self.existing_farmer_phone, '1')
        self._make_ussd_request(session_id, self.existing_farmer_phone, self.existing_farmer_pin)
        self._make_ussd_request(session_id, self.existing_farmer_phone, '3') # Transactions

        # 1. Select Pay Loan
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, '1')
        self.assertIn("CON Enter Loan ID to pay:", response)
        self.assertEqual(UssdSession.objects.get(session_id=session_id).current_menu_state, 'farmer_pay_loan_id')

        # 2. Enter Loan ID
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, str(loan.id))
        self.assertIn(f"CON Loan ID: {loan.id}, Amount Due: {loan.amount:.2f}. Enter your 4-digit PIN to confirm payment:", response)
        self.assertEqual(UssdSession.objects.get(session_id=session_id).current_menu_state, 'farmer_pay_loan_pin')

        # 3. Enter PIN to confirm payment
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, self.existing_farmer_pin)
        self.assertIn(f"END Loan {loan.id} payment confirmed by FarmCred.", response)
        self.assertFalse(UssdSession.objects.get(session_id=session_id).is_active) # Session ends

        # Verify loan status updated directly
        loan.refresh_from_db()
        self.assertEqual(loan.status, 'repaid')
        self.assertTrue(loan.date_repaid is not None)
        self.assertTrue(loan.on_time) # Should be on time as due date is in future

        # Verify transaction created for platform lender
        transaction = Transaction.objects.filter(
            account_party=self.platform_lender_user,
            category='loan_repayment',
            status='income',
            amount=loan.amount
        ).first()
        self.assertIsNotNone(transaction)
        
        # Assert NO PendingConfirmation is created for platform lender
        self.assertFalse(PendingConfirmation.objects.filter(
            initiator_account=self.existing_farmer_user,
            target_account=self.platform_lender_user,
            request_type=PendingConfirmation.TYPE_LOAN_REPAYMENT_CONFIRM
        ).exists())


    def test_farmer_pay_loan_flow_investor_lender(self):
        session_id = 'test_session_pay_loan_investor'
        # Loan from an investor lender
        loan = Loan.objects.create(
            farmer=self.existing_farmer_user,
            lender=self.existing_investor_user, # Lender is an Investor
            amount=Decimal('150.00'),
            date_taken=timezone.localdate() - timedelta(days=40),
            due_date=timezone.localdate() - timedelta(days=10), # Overdue
            status='active'
        )

        # Login farmer and navigate to Transactions menu
        self._make_ussd_request(session_id, self.existing_farmer_phone, '')
        self._make_ussd_request(session_id, self.existing_farmer_phone, '1')
        self._make_ussd_request(session_id, self.existing_farmer_phone, self.existing_farmer_pin)
        self._make_ussd_request(session_id, self.existing_farmer_phone, '3') # Transactions

        # 1. Select Pay Loan
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, '1')
        self.assertIn("CON Enter Loan ID to pay:", response)

        # 2. Enter Loan ID
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, str(loan.id))
        self.assertIn(f"CON Loan ID: {loan.id}, Amount Due: {loan.amount:.2f}. Enter your 4-digit PIN to confirm payment:", response)
        
        # 3. Enter PIN to confirm payment
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, self.existing_farmer_pin)
        self.assertIn(f"END Loan {loan.id} payment confirmed! Confirmation request sent to Lender (code:", response)
        self.assertFalse(UssdSession.objects.get(session_id=session_id).is_active) # Session ends

        # Verify PendingConfirmation is created for investor lender
        pending_conf = PendingConfirmation.objects.filter(
            initiator_account=self.existing_farmer_user,
            target_account=self.existing_investor_user,
            request_type=PendingConfirmation.TYPE_LOAN_REPAYMENT_CONFIRM,
            related_object_id=loan.id # Ensure this is correctly set
        ).first()
        self.assertIsNotNone(pending_conf)
        self.assertEqual(pending_conf.status, PendingConfirmation.STATUS_PENDING)


    def test_investor_confirm_loan_repayment_flow(self):
        session_id_investor = 'test_session_investor_confirm_repayment'
        session_id_farmer = 'test_session_farmer_for_repayment' # Separate session for farmer initiating

        loan = Loan.objects.create(
            farmer=self.existing_farmer_user,
            lender=self.existing_investor_user,
            amount=Decimal('200.00'),
            date_taken=timezone.localdate() - timedelta(days=60),
            due_date=timezone.localdate() - timedelta(days=30),
            status='active'
        )

        # Farmer initiates repayment (this creates the PendingConfirmation)
        self._make_ussd_request(session_id_farmer, self.existing_farmer_phone, '')
        self._make_ussd_request(session_id_farmer, self.existing_farmer_phone, '1')
        self._make_ussd_request(session_id_farmer, self.existing_farmer_phone, self.existing_farmer_pin)
        self._make_ussd_request(session_id_farmer, self.existing_farmer_phone, '3') # Transactions
        self._make_ussd_request(session_id_farmer, self.existing_farmer_phone, '1') # Pay Loan
        farmer_response = self._make_ussd_request(session_id_farmer, self.existing_farmer_phone, str(loan.id))
        farmer_response = self._make_ussd_request(session_id_farmer, self.existing_farmer_phone, self.existing_farmer_pin)
        
        # Extract confirmation ID from farmer's response (using regex)
        match = re.search(r'code: (\d{6})', farmer_response)
        self.assertIsNotNone(match, "Confirmation ID not found in farmer's response.")
        confirmation_id = match.group(1)

        # Investor receives SMS and enters confirmation ID
        # Investor starts a new session or uses existing one
        response = self._make_ussd_request(session_id_investor, self.existing_investor_phone, confirmation_id)
        # Updated assertion for newline escaping and exact message match
        self.assertIn(f"CON Farmer {self.existing_farmer_user.full_name} (ID: {self.existing_farmer_user.id}) is confirming repayment:\\nLoan ID: {loan.id}\\nAmount: GHS {loan.amount:.2f}\\nReply 1 to CONFIRM RECEIPT / 2 to DENY.", response)
        self.assertEqual(UssdSession.objects.get(session_id=session_id_investor).current_menu_state, 'confirm_request_details')

        # Investor confirms receipt
        response = self._make_ussd_request(session_id_investor, self.existing_investor_phone, '1')
        self.assertIn("END Loan repayment confirmed! Details sent to Farmer.", response)
        self.assertFalse(UssdSession.objects.get(session_id=session_id_investor).is_active)

        # Verify loan status updated and transaction created
        loan.refresh_from_db()
        self.assertEqual(loan.status, 'repaid')
        self.assertTrue(loan.date_repaid is not None)
        # Check if on_time is False because due_date was in past
        self.assertFalse(loan.on_time) # Loan was due 30 days ago, repaid today, so it's late

        # Verify transaction for lender (investor)
        transaction = Transaction.objects.filter(
            account_party=self.existing_investor_user,
            category='loan_repayment',
            status='income'
        ).first()
        self.assertIsNotNone(transaction)
        self.assertEqual(transaction.amount, loan.amount)

    def test_investor_login_success(self):
        session_id = 'test_session_investor_login'
        
        # 1. Start session, select Investor
        response = self._make_ussd_request(session_id, self.existing_investor_phone, '')
        response = self._make_ussd_request(session_id, self.existing_investor_phone, '2')
        self.assertIn("CON Welcome back Investor! Enter your 4-digit PIN:", response)

        # 2. Enter correct PIN
        response = self._make_ussd_request(session_id, self.existing_investor_phone, self.existing_investor_pin)
        self.assertIn("CON Investor Menu: \\n1. View Farmer Trust \\n2. Proceed to Invest \\n3. Transactions \\n00. Main Menu", response)
        self.assertIn("1. View Farmer Trust", response)
        self.assertIn("2. Proceed to Invest", response)
        self.assertIn("3. Transactions", response) # Ensure Transactions option is still there
        session = UssdSession.objects.get(session_id=session_id)
        self.assertEqual(session.current_menu_state, 'investor_main_menu')
        self.assertEqual(session.data_payload.get('logged_in_user_id'), self.existing_investor_user.id)

    def test_investor_view_farmer_trust_flow(self):
        session_id_investor = 'test_session_investor_view_trust'
        session_id_farmer = 'test_session_farmer_for_consent' # Separate session for farmer's consent

        # Login investor
        self._make_ussd_request(session_id_investor, self.existing_investor_phone, '')
        self._make_ussd_request(session_id_investor, self.existing_investor_phone, '2')
        self._make_ussd_request(session_id_investor, self.existing_investor_phone, self.existing_investor_pin)

        # 1. Investor selects View Farmer Trust
        response = self._make_ussd_request(session_id_investor, self.existing_investor_phone, '1')
        self.assertIn("CON Enter Farmer ID (e.g., a number) to view trust scores:", response)
        self.assertEqual(UssdSession.objects.get(session_id=session_id_investor).current_menu_state, 'investor_view_farmer_trust_id')

        # 2. Investor enters Farmer ID
        response = self._make_ussd_request(session_id_investor, self.existing_investor_phone, str(self.existing_farmer_user.id))
        self.assertIn(f"CON Request sent to Farmer {self.existing_farmer_user.full_name} (ID: {self.existing_farmer_user.id}).\\nWaiting for their confirmation (code:", response)
        self.assertIn("0. Back", response)
        self.assertEqual(UssdSession.objects.get(session_id=session_id_investor).current_menu_state, 'investor_waiting_for_consent')

        # Verify PendingConfirmation is created
        pending_conf = PendingConfirmation.objects.filter(
            initiator_account=self.existing_investor_user,
            target_account=self.existing_farmer_user,
            request_type=PendingConfirmation.TYPE_TRUST_VIEW_REQUEST # Changed from TYPE_TRUST_VIEW_CONSENT
        ).first()
        self.assertIsNotNone(pending_conf)
        self.assertEqual(pending_conf.status, PendingConfirmation.STATUS_PENDING)

        # 3. Farmer receives SMS and enters confirmation ID
        # Farmer starts a new session or uses existing one
        farmer_response = self._make_ussd_request(session_id_farmer, self.existing_farmer_phone, pending_conf.confirmation_id)
        self.assertIn(f"CON Investor {self.existing_investor_user.full_name} (ID: {self.existing_investor_user.id}) wants to view your profile.\\nReply 1 to Allow / 2 to Deny.", farmer_response)
        self.assertEqual(UssdSession.objects.get(session_id=session_id_farmer).current_menu_state, 'confirm_request_details')

        # 4. Farmer grants consent
        farmer_consent_response = self._make_ussd_request(session_id_farmer, self.existing_farmer_phone, '1') # Allow
        self.assertIn("END Consent granted. Details sent to Investor.", farmer_consent_response)
        self.assertFalse(UssdSession.objects.get(session_id=session_id_farmer).is_active) # Session ends

        # Verify pending confirmation status updated
        pending_conf.refresh_from_db()
        self.assertEqual(pending_conf.status, PendingConfirmation.STATUS_CONFIRMED)

        # Simulate investor returning to menu. The view will check for consent.
        final_investor_response = self._make_ussd_request(session_id_investor, self.existing_investor_phone, '0') # Back from waiting
        self.assertIn("CON Investor Menu:", final_investor_response)
        investor_session = UssdSession.objects.get(session_id=session_id_investor)
        self.assertTrue(investor_session.is_active) # Session might stay active if...

    def test_investor_deny_farmer_trust_flow(self):
        session_id_investor = 'test_session_investor_deny_trust'
        session_id_farmer = 'test_session_farmer_for_deny_consent'

        # Login investor and request trust view (this creates the PendingConfirmation)
        self._make_ussd_request(session_id_investor, self.existing_investor_phone, '')
        self._make_ussd_request(session_id_investor, self.existing_investor_phone, '2')
        self._make_ussd_request(session_id_investor, self.existing_investor_phone, self.existing_investor_pin)
        self._make_ussd_request(session_id_investor, self.existing_investor_phone, '1') # View Farmer Trust
        investor_request_response = self._make_ussd_request(session_id_investor, self.existing_investor_phone, str(self.existing_farmer_user.id))
        
        # Extract confirmation ID from investor's response
        match = re.search(r'code: (\d{6})', investor_request_response)
        self.assertIsNotNone(match, "Confirmation ID not found in investor's request response.")
        confirmation_id = match.group(1)

        pending_conf = PendingConfirmation.objects.filter(
            confirmation_id=confirmation_id, # Use extracted ID
            initiator_account=self.existing_investor_user,
            target_account=self.existing_farmer_user,
            request_type=PendingConfirmation.TYPE_TRUST_VIEW_REQUEST # Changed from TYPE_TRUST_VIEW_CONSENT
        ).first()
        self.assertIsNotNone(pending_conf)

        # Farmer denies consent
        farmer_deny_response = self._make_ussd_request(session_id_farmer, self.existing_farmer_phone, pending_conf.confirmation_id)
        farmer_deny_response = self._make_ussd_request(session_id_farmer, self.existing_farmer_phone, '2') # Deny
        self.assertIn("END Consent denied.", farmer_deny_response)
        self.assertFalse(UssdSession.objects.get(session_id=session_id_farmer).is_active)

        pending_conf.refresh_from_db()
        self.assertEqual(pending_conf.status, PendingConfirmation.STATUS_DENIED)

    def test_investor_make_loan_offer_flow(self):
        session_id_investor = 'test_session_investor_offer'
        session_id_farmer = 'test_session_farmer_for_offer_creation'

        # Login investor
        self._make_ussd_request(session_id_investor, self.existing_investor_phone, '')
        self._make_ussd_request(session_id_investor, self.existing_investor_phone, '2')
        self._make_ussd_request(session_id_investor, self.existing_investor_phone, self.existing_investor_pin)
        
        # 1. Select Proceed to Invest, then Make a Loan Offer
        self._make_ussd_request(session_id_investor, self.existing_investor_phone, '2')
        response = self._make_ussd_request(session_id_investor, self.existing_investor_phone, '2')
        self.assertIn("CON Enter Farmer ID to make an offer:", response)
        self.assertEqual(UssdSession.objects.get(session_id=session_id_investor).current_menu_state, 'investor_make_loan_offer_farmer_id')

        # 2. Enter Farmer ID
        response = self._make_ussd_request(session_id_investor, self.existing_investor_phone, str(self.existing_farmer_user.id))
        self.assertIn(f"CON Enter loan amount for {self.existing_farmer_user.full_name}", response)
        self.assertEqual(UssdSession.objects.get(session_id=session_id_investor).current_menu_state, 'investor_make_loan_offer_amount')

        # 3. Enter loan amount
        response = self._make_ussd_request(session_id_investor, self.existing_investor_phone, '750.00')
        self.assertIn("CON Enter interest rate (e.g., 10.0 for 10%):", response)
        self.assertEqual(UssdSession.objects.get(session_id=session_id_investor).current_menu_state, 'investor_make_loan_offer_interest')

        # 4. Enter interest rate
        response = self._make_ussd_request(session_id_investor, self.existing_investor_phone, '10.0')
        self.assertIn("CON Enter repayment period in months (e.g., 3, 6, 12):", response)
        self.assertEqual(UssdSession.objects.get(session_id=session_id_investor).current_menu_state, 'investor_make_loan_offer_repayment_months')

        # 5. Enter repayment months
        response = self._make_ussd_request(session_id_investor, self.existing_investor_phone, '3')
        self.assertIn("CON Enter preferred payment method (e.g., Mobile Money, Bank Transfer):", response)
        self.assertEqual(UssdSession.objects.get(session_id=session_id_investor).current_menu_state, 'investor_make_loan_offer_payment_method')

        # 6. Enter payment method
        response = self._make_ussd_request(session_id_investor, self.existing_investor_phone, 'Mobile Money')
        self.assertIn("END Loan offer sent to Farmer", response)
        self.assertFalse(UssdSession.objects.get(session_id=session_id_investor).is_active)

        # Verify PendingConfirmation is created
        pending_conf = PendingConfirmation.objects.filter(
            initiator_account=self.existing_investor_user,
            target_account=self.existing_farmer_user,
            request_type=PendingConfirmation.TYPE_LOAN_OFFER
        ).first()
        self.assertIsNotNone(pending_conf)
        self.assertEqual(pending_conf.status, PendingConfirmation.STATUS_PENDING)
        self.assertEqual(pending_conf.data_context.get('amount'), 750.0)
        self.assertEqual(pending_conf.data_context.get('interest'), 10.0)
        self.assertEqual(pending_conf.data_context.get('repayment_months'), 3)
        self.assertEqual(pending_conf.data_context.get('payment_method'), 'Mobile Money')

    def test_farmer_accept_loan_offer_flow(self):
        session_id_farmer = 'test_session_farmer_accept_offer'
        session_id_investor = 'test_session_investor_for_offer_creation'

        # Investor creates a loan offer (this creates the PendingConfirmation)
        # Login investor
        self._make_ussd_request(session_id_investor, self.existing_investor_phone, '')
        self._make_ussd_request(session_id_investor, self.existing_investor_phone, '2')
        self._make_ussd_request(session_id_investor, self.existing_investor_phone, self.existing_investor_pin)
        self._make_ussd_request(session_id_investor, self.existing_investor_phone, '2') # Proceed to Invest
        self._make_ussd_request(session_id_investor, self.existing_investor_phone, '2') # Make a Loan Offer
        self._make_ussd_request(session_id_investor, self.existing_investor_phone, str(self.existing_farmer_user.id))
        self._make_ussd_request(session_id_investor, self.existing_investor_phone, '750.00')
        self._make_ussd_request(session_id_investor, self.existing_investor_phone, '10.0')
        investor_response = self._make_ussd_request(session_id_investor, self.existing_investor_phone, '3')
        investor_response = self._make_ussd_request(session_id_investor, self.existing_investor_phone, 'Mobile Money')

        # Extract confirmation ID from investor's response
        match = re.search(r'code: (\d{6})', investor_response)
        self.assertIsNotNone(match, "Confirmation ID not found in investor's response.")
        confirmation_id = match.group(1)

        # Farmer receives SMS and enters confirmation ID
        response = self._make_ussd_request(session_id_farmer, self.existing_farmer_phone, confirmation_id)
        self.assertIn(f"CON Loan offer from {self.existing_investor_user.full_name} (ID: {self.existing_investor_user.id}):\\nAmount: GHS 750.00\\nInterest: 10.0%\\nPeriod: 3 months\\nReply 1 to ACCEPT / 2 to REJECT.", response)
        self.assertEqual(UssdSession.objects.get(session_id=session_id_farmer).current_menu_state, 'confirm_request_details')

        # Farmer accepts the offer
        response = self._make_ussd_request(session_id_farmer, self.existing_farmer_phone, '1') # ACCEPT
        self.assertIn("END Loan offer accepted! Details sent to Lender.", response)
        self.assertFalse(UssdSession.objects.get(session_id=session_id_farmer).is_active)

        # Verify loan is created
        loan = Loan.objects.filter(
            farmer=self.existing_farmer_user,
            lender=self.existing_investor_user,
            amount=Decimal('750.00'),
            interest_rate=Decimal('10.0'),
            repayment_period_months=3,
            status='active'
        ).first()
        self.assertIsNotNone(loan)

        # Verify PendingConfirmation status updated
        pending_conf = PendingConfirmation.objects.get(confirmation_id=confirmation_id)
        self.assertEqual(pending_conf.status, PendingConfirmation.STATUS_CONFIRMED)

    def test_farmer_deny_loan_offer_flow(self):
        session_id_farmer = 'test_session_farmer_deny_offer'
        session_id_investor = 'test_session_investor_for_deny_offer_creation'

        # Investor creates a loan offer (this creates the PendingConfirmation)
        self._make_ussd_request(session_id_investor, self.existing_investor_phone, '')
        self._make_ussd_request(session_id_investor, self.existing_investor_phone, '2')
        self._make_ussd_request(session_id_investor, self.existing_investor_phone, self.existing_investor_pin)
        self._make_ussd_request(session_id_investor, self.existing_investor_phone, '2') # Proceed to Invest
        self._make_ussd_request(session_id_investor, self.existing_investor_phone, '2') # Make a Loan Offer
        self._make_ussd_request(session_id_investor, self.existing_investor_phone, str(self.existing_farmer_user.id))
        self._make_ussd_request(session_id_investor, self.existing_investor_phone, '1200.00')
        self._make_ussd_request(session_id_investor, self.existing_investor_phone, '15.0')
        investor_response = self._make_ussd_request(session_id_investor, self.existing_investor_phone, '6')
        investor_response = self._make_ussd_request(session_id_investor, self.existing_investor_phone, 'Bank Transfer')

        match = re.search(r'code: (\d{6})', investor_response)
        self.assertIsNotNone(match, "Confirmation ID not found in investor's response.")
        confirmation_id = match.group(1)

        # Farmer receives SMS and denies offer
        response = self._make_ussd_request(session_id_farmer, self.existing_farmer_phone, confirmation_id)
        response = self._make_ussd_request(session_id_farmer, self.existing_farmer_phone, '2') # REJECT
        self.assertIn("END Loan offer rejected.", response)
        self.assertFalse(UssdSession.objects.get(session_id=session_id_farmer).is_active)

        # Verify PendingConfirmation status updated
        pending_conf = PendingConfirmation.objects.get(confirmation_id=confirmation_id)
        self.assertEqual(pending_conf.status, PendingConfirmation.STATUS_DENIED)
        # Verify no loan was created
        self.assertFalse(Loan.objects.filter(farmer=self.existing_farmer_user, amount=Decimal('1200.00')).exists())

    def test_farmer_request_loan_flow_success(self):
        session_id = 'test_farmer_loan_request_success'
        # Ensure farmer meets criteria
        self.existing_farmer_profile.trust_level_stars = Decimal('4.0')
        self.existing_farmer_profile.trust_score_percent = Decimal('70.00')
        self.existing_farmer_profile.save()

        # Login farmer and navigate to loan request
        self._make_ussd_request(session_id, self.existing_farmer_phone, '')
        self._make_ussd_request(session_id, self.existing_farmer_phone, '1')
        self._make_ussd_request(session_id, self.existing_farmer_phone, self.existing_farmer_pin)
        response_after_loan_option = self._make_ussd_request(session_id, self.existing_farmer_phone, '5')
        self.assertIn(f"CON Based on your Trust Level ({self.existing_farmer_profile.trust_level_stars:.1f} Stars) and Score ({self.existing_farmer_profile.trust_score_percent:.2f}%), you qualify for a loan up to GHS {self.existing_farmer_profile.get_max_qualified_loan_amount():.2f}.\\n"
                                "Enter desired loan amount (e.g., 500.00):", response_after_loan_option)


        # Enter desired loan amount
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, '100.00')
        self.assertIn("CON Loan Request Summary:\\nAmount: GHS 100.00\\nInterest Rate: 5.0% (FarmCred Standard)\\nRepayment Period: 1 months\\n1. Confirm Request\\n0. Back", response)

        # Confirm request
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, '1')
        self.assertIn("END Your loan request for GHS 100.00 has been approved and will be disbursed shortly.", response)
        
        loan = Loan.objects.filter(
            farmer=self.existing_farmer_user,
            lender=self.platform_lender_user, # Should be platform lender
            amount=Decimal('100.00'),
            status='active'
        ).first()
        self.assertIsNotNone(loan)
        self.assertEqual(loan.lender, self.platform_lender_user) # Assert lender is platform_lender
        self.assertEqual(loan.interest_rate, Decimal('5.0'))
        self.assertEqual(loan.repayment_period_months, 1) # Still 1 month as no repaid loans yet
        
        # Assert NO PendingConfirmation is created for this direct loan request
        self.assertFalse(PendingConfirmation.objects.filter(
            initiator_account=self.existing_farmer_user,
            request_type=PendingConfirmation.TYPE_LOAN_OFFER
        ).exists())


    def test_farmer_request_loan_flow_active_loan_denial(self):
        session_id = 'test_farmer_loan_request_active_denial'
        Loan.objects.create(
            farmer=self.existing_farmer_user,
            lender=self.platform_lender_user,
            amount=Decimal('500.00'),
            date_taken=timezone.localdate(),
            due_date=timezone.localdate() + timedelta(days=90),
            status='active'
        )

        # Login farmer and navigate to loan request
        self._make_ussd_request(session_id, self.existing_farmer_phone, '')
        self._make_ussd_request(session_id, self.existing_farmer_phone, '1')
        self._make_ussd_request(session_id, self.existing_farmer_phone, self.existing_farmer_pin)
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, '5')

        self.assertIn("END You currently have an active loan. Please settle existing loans before requesting a new one.", response)
        self.assertFalse(UssdSession.objects.get(session_id=session_id).is_active)

    def test_farmer_request_loan_flow_trust_criteria_denial(self):
        session_id = 'test_farmer_loan_request_trust_denial'
        # Set farmer trust below threshold
        self.existing_farmer_profile.trust_level_stars = Decimal('2.0')
        self.existing_farmer_profile.trust_score_percent = Decimal('50.00')
        self.existing_farmer_profile.save()

        # Login farmer and navigate to loan request
        self._make_ussd_request(session_id, self.existing_farmer_phone, '')
        self._make_ussd_request(session_id, self.existing_farmer_phone, '1')
        self._make_ussd_request(session_id, self.existing_farmer_phone, self.existing_farmer_pin)
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, '5')

        self.assertIn("END You do not meet the minimum trust criteria for a loan.\\nRequired: 3.5 Stars & 65.00%\\nYours: 2.0 Stars & 50.00%", response)
        self.assertFalse(UssdSession.objects.get(session_id=session_id).is_active)

    def test_farmer_request_loan_flow_exceeds_qualified_amount(self):
        session_id = 'test_farmer_loan_request_exceeds'
        # Farmer qualifies for 500 base + (4.0-3.5)*200 + (70-65)*10 = 500 + 100 + 50 = 650
        # Requesting 700 should exceed
        
        # Login farmer and navigate to loan request
        self._make_ussd_request(session_id, self.existing_farmer_phone, '')
        self._make_ussd_request(session_id, self.existing_farmer_phone, '1')
        self._make_ussd_request(session_id, self.existing_farmer_phone, self.existing_farmer_pin)
        self._make_ussd_request(session_id, self.existing_farmer_phone, '5')

        # Enter desired loan amount that exceeds qualified amount
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, '700.00')
        self.assertIn(f"CON Desired amount exceeds your qualified limit of GHS {self.existing_farmer_profile.get_max_qualified_loan_amount():.2f}.\\n"
                                "Enter desired loan amount (e.g., 500.00):", response)
        self.assertEqual(UssdSession.objects.get(session_id=session_id).current_menu_state, 'farmer_request_loan_amount_entry')

    def test_farmer_request_loan_flow_repayment_period_logic(self):
        session_id = 'test_farmer_loan_request_repayment_period_logic'
        # Create some repaid loans to influence repayment period logic
        # 1 on-time, 2 late
        Loan.objects.create(
            farmer=self.existing_farmer_user, lender=self.platform_lender_user, amount=Decimal('100.00'),
            date_taken=timezone.localdate() - timedelta(days=120), due_date=timezone.localdate() - timedelta(days=90),
            date_repaid=timezone.localdate() - timedelta(days=85), on_time=True, status='repaid'
        )
        Loan.objects.create(
            farmer=self.existing_farmer_user, lender=self.platform_lender_user, amount=Decimal('100.00'),
            date_taken=timezone.localdate() - timedelta(days=120), due_date=timezone.localdate() - timedelta(days=90),
            date_repaid=timezone.localdate() - timedelta(days=80), on_time=False, status='repaid'
        )
        Loan.objects.create(
            farmer=self.existing_farmer_user, lender=self.platform_lender_user, amount=Decimal('100.00'),
            date_taken=timezone.localdate() - timedelta(days=120), due_date=timezone.localdate() - timedelta(days=90),
            date_repaid=timezone.localdate() - timedelta(days=80), on_time=False, status='repaid'
        )
        # Current repayment ratio: 1 on-time / 3 total repaid = 0.333... (should result in 1 month repayment period)

        # IMPORTANT: Manually set trust_score_percent AFTER creating loans to ensure qualification passes.
        # This overrides any dynamic calculation based on the test's loan history for the *qualification* part,
        # but the on_time_repayment_ratio() will still reflect the 1/3 ratio for the *period* calculation.
        self.existing_farmer_profile.trust_score_percent = Decimal('70.00') 
        self.existing_farmer_profile.save()

        # Login farmer and navigate to loan request
        self._make_ussd_request(session_id, self.existing_farmer_phone, '')
        self._make_ussd_request(session_id, self.existing_farmer_phone, '1')
        self._make_ussd_request(session_id, self.existing_farmer_phone, self.existing_farmer_pin)
        
        # This is the crucial step. Assert its response to ensure state transition.
        response_after_loan_option = self._make_ussd_request(session_id, self.existing_farmer_phone, '5')
        self.assertIn(f"CON Based on your Trust Level ({self.existing_farmer_profile.trust_level_stars:.1f} Stars) and Score ({self.existing_farmer_profile.trust_score_percent:.2f}%), you qualify for a loan up to GHS {self.existing_farmer_profile.get_max_qualified_loan_amount():.2f}.\\n"
                                "Enter desired loan amount (e.g., 500.00):", response_after_loan_option)


        # Enter desired loan amount
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, '100.00')
        self.assertIn("CON Loan Request Summary:\\nAmount: GHS 100.00\\nInterest Rate: 5.0% (FarmCred Standard)\\nRepayment Period: 1 months\\n1. Confirm Request\\n0. Back", response)

        # Confirm request
        response = self._make_ussd_request(session_id, self.existing_farmer_phone, '1')
        self.assertIn("END Your loan request for GHS 100.00 has been approved and will be disbursed shortly.", response)
        
        loan = Loan.objects.filter(
            farmer=self.existing_farmer_user,
            lender=self.platform_lender_user,
            amount=Decimal('100.00'),
            status='active'
        ).first()
        self.assertIsNotNone(loan)
        self.assertEqual(loan.lender, self.platform_lender_user) # Assert lender is platform_lender
        self.assertEqual(loan.interest_rate, Decimal('5.0'))
        self.assertEqual(loan.repayment_period_months, 1) # Should be 1 month based on 1/3 on-time ratio
        
        # Assert NO PendingConfirmation is created for this direct loan request
        self.assertFalse(PendingConfirmation.objects.filter(
            initiator_account=self.existing_farmer_user,
            request_type=PendingConfirmation.TYPE_LOAN_OFFER
        ).exists())


    # Removed Lender registration and loan flows

    def test_buyer_registration_flow(self):
        session_id = 'test_session_reg_buyer'
        phone = '233241111113'

        # 1. Start session, select Buyer
        response = self._make_ussd_request(session_id, phone, '')
        response = self._make_ussd_request(session_id, phone, '4')
        self.assertIn("CON Register as Buyer: \\nPlease enter your Full Name:", response)

        # 2. Enter Full Name
        response = self._make_ussd_request(session_id, phone, 'Agnes Buyer')
        self.assertIn("CON Buyer registration successful! Your ID is", response)
        self.assertIn("1. Record Produce Purchase", response)
        self.assertTrue(Account.objects.filter(phone_number=phone, role='buyer').exists())

    def test_buyer_login_success(self):
        session_id = 'test_session_buyer_login'
        
        # 1. Start session, select Buyer
        response = self._make_ussd_request(session_id, self.existing_buyer_phone, '')
        response = self._make_ussd_request(session_id, self.existing_buyer_phone, '4')
        self.assertIn("CON Welcome back Buyer! \\n1. Record Produce Purchase \\n00. Main Menu", response)
        self.assertIn("1. Record Produce Purchase", response)
        self.assertEqual(UssdSession.objects.get(session_id=session_id).current_menu_state, 'buyer_main_menu')
        self.assertEqual(UssdSession.objects.get(session_id=session_id).data_payload.get('logged_in_user_id'), self.existing_buyer_user.id)

    def test_buyer_record_purchase_flow(self):
        session_id_buyer = 'test_session_buyer_purchase'
        session_id_farmer = 'test_session_farmer_confirm_purchase'

        # Set farmer's produce
        self.existing_farmer_profile.produce = ['Tomatoes@2.50', 'Onions@3.00']
        self.existing_farmer_profile.save()

        # Buyer logs in
        self._make_ussd_request(session_id_buyer, self.existing_buyer_phone, '')
        self._make_ussd_request(session_id_buyer, self.existing_buyer_phone, '4') # Select Buyer
        
        # 1. Select Record Produce Purchase
        response = self._make_ussd_request(session_id_buyer, self.existing_buyer_phone, '1')
        self.assertIn("CON Enter Farmer ID for the purchase:", response)
        self.assertEqual(UssdSession.objects.get(session_id=session_id_buyer).current_menu_state, 'buyer_record_purchase_farmer_id')

        # 2. Enter Farmer ID
        response = self._make_ussd_request(session_id_buyer, self.existing_buyer_phone, str(self.existing_farmer_user.id))
        self.assertIn(f"CON Select product from {self.existing_farmer_user.full_name}:\\n1. Tomatoes@2.50\\n2. Onions@3.00\\n0. Back", response)
        self.assertIn("1. Tomatoes@2.50", response)
        self.assertIn("2. Onions@3.00", response)
        self.assertEqual(UssdSession.objects.get(session_id=session_id_buyer).current_menu_state, 'buyer_select_product')

        # 3. Select product (e.g., Tomatoes)
        response = self._make_ussd_request(session_id_buyer, self.existing_buyer_phone, '1')
        self.assertIn("CON Enter quantity for 'Tomatoes'", response)
        self.assertEqual(UssdSession.objects.get(session_id=session_id_buyer).current_menu_state, 'buyer_enter_quantity')

        # 4. Enter quantity (e.g., 10)
        response = self._make_ussd_request(session_id_buyer, self.existing_buyer_phone, '10')
        self.assertIn("CON Purchase Summary:\\nProduct: Tomatoes\\nQuantity: 10\\nTotal: GHS 25.00\\n1. Confirm Purchase\\n0. Back", response) # 10 * 2.50
        self.assertEqual(UssdSession.objects.get(session_id=session_id_buyer).current_menu_state, 'buyer_confirm_purchase')

        # 5. Confirm Purchase
        response = self._make_ussd_request(session_id_buyer, self.existing_buyer_phone, '1')
        self.assertIn("END Purchase request sent to Farmer", response)
        self.assertFalse(UssdSession.objects.get(session_id=session_id_buyer).is_active)

        # Verify PendingConfirmation is created
        pending_conf = PendingConfirmation.objects.filter(
            initiator_account=self.existing_buyer_user,
            target_account=self.existing_farmer_user,
            request_type=PendingConfirmation.TYPE_PRODUCE_PURCHASE_CONFIRM
        ).first()
        self.assertIsNotNone(pending_conf)
        self.assertEqual(pending_conf.status, PendingConfirmation.STATUS_PENDING)
        self.assertEqual(pending_conf.data_context.get('product_name'), 'Tomatoes')
        self.assertEqual(Decimal(str(pending_conf.data_context.get('total_amount'))), Decimal('25.00'))

        # Farmer confirms receipt
        farmer_response = self._make_ussd_request(session_id_farmer, self.existing_farmer_phone, pending_conf.confirmation_id)
        # Fix: Cast quantity to int for assertion if it's a whole number
        qty_display = int(pending_conf.data_context.get('quantity')) if pending_conf.data_context.get('quantity') == int(pending_conf.data_context.get('quantity')) else pending_conf.data_context.get('quantity')
        self.assertIn(f"CON Buyer {self.existing_buyer_user.full_name} (ID: {self.existing_buyer_user.id}) is confirming purchase of Tomatoes (Qty: {qty_display}) for GHS 25.00.\\nConfirm payment received. Reply 1 to CONFIRM / 2 to DENY.", farmer_response)
        
        farmer_confirm_response = self._make_ussd_request(session_id_farmer, self.existing_farmer_phone, '1') # CONFIRM
        self.assertIn("END Produce purchase confirmed! Details sent to Buyer.", farmer_confirm_response)
        self.assertFalse(UssdSession.objects.get(session_id=session_id_farmer).is_active)

        # Verify transaction is created for farmer
        transaction = Transaction.objects.filter(
            account_party=self.existing_farmer_user,
            # FIX: Removed 'buyer' argument from farmer's transaction assertion
            category='produce_sale',
            status='income',
            amount=Decimal('25.00')
        ).first()
        self.assertIsNotNone(transaction)
        self.assertEqual(transaction.name, "Produce Sale: Tomatoes x 10")

