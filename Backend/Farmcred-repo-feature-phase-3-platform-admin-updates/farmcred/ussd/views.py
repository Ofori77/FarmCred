# ussd/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from django.db import transaction as db_transaction
from django.utils import timezone
import datetime # Required for expiry calculations
from decimal import Decimal # Import Decimal for calculations

from .models import UssdSession, PendingConfirmation # Import new PendingConfirmation model
from account.models import Account
# Import constants from core.models
from core.models import (
    FarmerProfile, InvestorProfile, Loan, Transaction, InvestorReview,
    MIN_TRUST_LEVEL_STARS_FOR_LOAN, MIN_TRUST_SCORE_PERCENT_FOR_LOAN, FARMCRED_DEFAULT_INTEREST_RATE
)
from core.serializers import FarmerProfileOverviewSerializer, FarmerTrustBreakdownSerializer

import re
import random
import string # For generating confirmation IDs

# --- Helper function for sending SMS (Placeholder for Hubtel Integration) ---
def _send_sms(phone_number, message):
    """
    Placeholder function for sending SMS via Hubtel or another SMS gateway.
    In a real implementation, you would use Hubtel's API here.
    """
    # Example Hubtel integration (pseudo-code):
    # import requests
    # url = "https://sms.hubtel.com/v1/messages/send"
    # headers = {
    #     "Content-Type": "application/json",
    #     "Authorization": f"Basic {settings.HUBTEL_API_KEY}" # Base64 encoded clientId:clientSecret
    # }
    # payload = {
    #     "From": settings.HUBTEL_SENDER_ID,
    #     "To": phone_number,
    #     "Content": message
    # }
    # try:
    #     response = requests.post(url, json=payload, headers=headers)
    #     response.raise_for_status()
    #     print(f"SMS sent to {phone_number}: {message}")
    #     return True
    # except requests.exceptions.RequestException as e:
    #     print(f"Error sending SMS to {phone_number}: {e}")
    #     return False

    print(f"--- SMS Placeholder: Sending '{message}' to {phone_number} ---")
    return True # Simulate success for testing


# --- USSD Callback View ---
@api_view(['POST'])
@permission_classes([AllowAny])
def ussd_callback(request):
    """
    Main entry point for all USSD requests from the gateway.
    Handles USSD session management and routes to appropriate logic.
    """
    # Attempt to get parameters from request.POST first
    session_id = request.POST.get('sessionId')
    phone_number = request.POST.get('phoneNumber')
    user_input = request.POST.get('text', '').strip()

    # If not found in request.POST, try request.data (for DRF's parsers)
    if not session_id:
        session_id = request.data.get('sessionId')
    if not phone_number:
        phone_number = request.data.get('phoneNumber')
    if not user_input:
        user_input = request.data.get('text', '').strip()

    # --- DEBUGGING LINES ---
    print(f"DEBUG VIEWS: Full request.POST QueryDict: {request.POST}")
    print(f"DEBUG VIEWS: Full request.data QueryDict/Dict: {request.data}") # Can be QueryDict or a plain dict
    print(f"DEBUG VIEWS: Extracted: session_id='{session_id}', phone_number='{phone_number}', user_input='{user_input}'")
    # --- END DEBUGGING LINES ---

    if user_input.lower() == 'cancel':
        session = UssdSession.objects.filter(session_id=session_id).first()
        if session:
            session.end_session()
        return Response("END Session cancelled.", content_type='text/plain')

    if not session_id or not phone_number:
        # These print statements are for debugging and will not appear in production.
        print(f"DEBUG: Missing session_id ({session_id}) or phone_number ({phone_number}) after all checks.")
        return Response("END Invalid USSD request parameters.", status=status.HTTP_400_BAD_REQUEST)

    # Generate a unique confirmation ID for cross-session use
    def generate_confirmation_id():
        return ''.join(random.choices(string.digits, k=6))

    # --- Retrieve or create session for general USSD flow ---
    try:
        session = UssdSession.objects.get(session_id=session_id)
        created = False
        print(f"DEBUG VIEWS: Existing session loaded: {session.session_id}, current_state: {session.current_menu_state}, payload: {session.data_payload}")
    except UssdSession.DoesNotExist:
        session = UssdSession.objects.create(
            session_id=session_id,
            phone_number=phone_number,
            current_menu_state='initial_menu'
        )
        created = True
        print(f"DEBUG VIEWS: New session created: {session.session_id}")

    # If the user enters '00' at any point, reset to initial menu and return immediately
    if user_input == '00':
        session.current_menu_state = 'initial_menu'
        session.previous_input = ''
        session.data_payload = {} # Clear payload on new session or restart
        session.is_active = True
        session.save()
        print(f"DEBUG VIEWS: Session {session.session_id} reset to initial_menu. Payload cleared.")
        return Response("CON Welcome to FarmCred. Are you a: \n1. Farmer \n2. Investor \n4. Buyer", content_type='text/plain')


    response_text = ""
    session_status = "CON" # Default to continue session

    # --- Check for incoming confirmation response (from any user role) ---
    # This must be handled before general session logic, as it's an "out-of-band" response
    # to a previous request from another party.
    # Only process as confirmation ID if current state is NOT already 'confirm_request_details'
    # and it looks like a 6-digit code.
    if session.current_menu_state != 'confirm_request_details' and user_input.isdigit() and len(user_input) == 6:
        pending_conf = PendingConfirmation.objects.filter(
            confirmation_id=user_input,
            target_account__phone_number=phone_number, # The current user's phone number
            status=PendingConfirmation.STATUS_PENDING,
            expires_at__gt=timezone.now()
        ).first()

        if pending_conf:
            print(f"DEBUG VIEWS: Found pending confirmation {pending_conf.confirmation_id} for {phone_number}.")
            # Found a pending confirmation request for this user.
            # We need to present them with the details and ask for '1' or '2'.
            # Ensure logged_in_user_id is preserved if it exists
            current_payload = session.data_payload.copy()
            current_payload.update({
                'pending_confirmation_id': pending_conf.id,
                'request_type': pending_conf.request_type,
                'initiator_id': pending_conf.initiator_account.id,
                'related_object_id': pending_conf.related_object_id,
                'data_context': pending_conf.data_context # Store full context
            })
            session.update_state('confirm_request_details', user_input, current_payload)
            session.save() # Explicit save
            
            initiator_name = pending_conf.initiator_account.full_name or f"ID: {pending_conf.initiator_account.id}"
            
            # Format quantity to be an integer if it's a whole number
            qty_display = pending_conf.data_context.get('quantity')
            if isinstance(qty_display, (float, Decimal)) and qty_display == int(qty_display):
                qty_display = int(qty_display)

            if pending_conf.request_type == PendingConfirmation.TYPE_TRUST_VIEW_REQUEST: # Changed from TYPE_TRUST_VIEW_CONSENT
                response_text = (
                    f"Investor {initiator_name} (ID: {pending_conf.initiator_account.id}) wants to view your profile.\n"
                    f"Reply 1 to Allow / 2 to Deny."
                )
            elif pending_conf.request_type == PendingConfirmation.TYPE_LOAN_OFFER:
                loan_details = pending_conf.data_context
                response_text = (
                    f"Loan offer from {initiator_name} (ID: {pending_conf.initiator_account.id}):\n"
                    f"Amount: GHS {loan_details.get('amount'):.2f}\n"
                    f"Interest: {loan_details.get('interest', 0.0):.1f}%\n"
                    f"Period: {loan_details.get('repayment_months')} months\n"
                    f"Reply 1 to ACCEPT / 2 to REJECT."
                )
            elif pending_conf.request_type == PendingConfirmation.TYPE_PRODUCE_PURCHASE_CONFIRM:
                purchase_details = pending_conf.data_context
                response_text = (
                    f"Buyer {initiator_name} (ID: {pending_conf.initiator_account.id}) is confirming purchase of {purchase_details.get('product_name')} (Qty: {qty_display}) for GHS {purchase_details.get('total_amount'):.2f}.\n"
                    f"Confirm payment received. Reply 1 to CONFIRM / 2 to DENY."
                )
            elif pending_conf.request_type == PendingConfirmation.TYPE_LOAN_REPAYMENT_CONFIRM:
                 repayment_details = pending_conf.data_context
                 response_text = (
                     f"Farmer {initiator_name} (ID: {pending_conf.initiator_account.id}) is confirming repayment:\n"
                     f"Loan ID: {repayment_details.get('loan_id')}\n"
                     f"Amount: GHS {repayment_details.get('amount_received'):.2f}\n"
                     f"Reply 1 to CONFIRM RECEIPT / 2 to DENY."
                 )
            else:
                response_text = "Unknown confirmation request. Reply 1 to CONFIRM / 2 to DENY."
            
            return Response(f"CON {response_text}", content_type='text/plain')
        # If it's a new session and no confirmation was found, proceed to initial menu.
        # This 'if created' block should be outside the confirmation ID check.
    
    # --- Core USSD Menu Logic ---
    # This block should only be hit if no confirmation ID was entered, or if the session is new.
    # The 'created' flag helps distinguish new sessions.
    if session.current_menu_state == 'initial_menu':
        response_text = "Welcome to FarmCred. Are you a: \n1. Farmer \n2. Investor \n4. Buyer" # Removed 3. Lender
        session.update_state('user_type_selection', user_input)
        session.save() # Explicit save

    # --- CONFIRMATION RESPONSE HANDLING (AFTER USER ENTERS 1 or 2) ---
    elif session.current_menu_state == 'confirm_request_details':
        pending_conf_id = session.data_payload.get('pending_confirmation_id')
        pending_conf = PendingConfirmation.objects.filter(id=pending_conf_id).first()
        
        if not pending_conf or pending_conf.is_expired():
            response_text = "Confirmation request expired or not found. \nEND Session."
            session_status = "END"
            session.end_session()
            session.save() # Explicit save
            print(f"DEBUG VIEWS: Confirmation {pending_conf_id} expired or not found.")
            return Response(f"{session_status} {response_text}", content_type='text/plain') # Immediate return
        elif user_input == '1': # CONFIRM
            pending_conf.status = PendingConfirmation.STATUS_CONFIRMED
            pending_conf.confirmed_at = timezone.now()
            pending_conf.save()
            print(f"DEBUG VIEWS: Confirmation {pending_conf.confirmation_id} confirmed by {phone_number}.")
            
            # --- Trigger actions based on confirmation type ---
            if pending_conf.request_type == PendingConfirmation.TYPE_TRUST_VIEW_REQUEST: # Changed from TYPE_TRUST_VIEW_CONSENT
                # Retrieve and send farmer's trust details to investor
                target_farmer_profile = pending_conf.target_account.farmer_profile
                trust_score = target_farmer_profile.trust_score_percent
                trust_level = target_farmer_profile.trust_level_stars
                response_for_investor = (
                    f"Farmer {target_farmer_profile.full_name} (ID: {target_farmer_profile.account.id}) Consent Granted.\n"
                    f"Trust Score: {trust_score:.2f}%\n"
                    f"Trust Level: {trust_level:.1f} Stars\n"
                )
                _send_sms(pending_conf.initiator_account.phone_number, response_for_investor)
                response_text = "Consent granted. Details sent to Investor."
            
            elif pending_conf.request_type == PendingConfirmation.TYPE_LOAN_OFFER:
                loan_data = pending_conf.data_context
                # Determine the actual lender (could be investor)
                lender_account = pending_conf.initiator_account
                
                # Calculate due_date based on repayment_months
                due_date = timezone.localdate() + datetime.timedelta(days=loan_data.get('repayment_months') * 30)

                with db_transaction.atomic():
                    Loan.objects.create(
                        farmer=pending_conf.target_account, # Farmer accepts the loan
                        lender=lender_account, # Lender is the initiator (Investor)
                        amount=Decimal(str(loan_data.get('amount'))), # Ensure Decimal conversion
                        date_taken=timezone.localdate(),
                        due_date=due_date,
                        interest_rate=Decimal(str(loan_data.get('interest', '0.0'))), # Ensure Decimal conversion
                        repayment_period_months=loan_data.get('repayment_months'),
                        status='active', # Loan is now active
                    )
                response_text = "Loan offer accepted! Details sent to Lender."
                _send_sms(pending_conf.initiator_account.phone_number, f"Farmer {pending_conf.target_account.full_name} accepted your loan offer of GHS {loan_data.get('amount'):.2f}.")
            
            elif pending_conf.request_type == PendingConfirmation.TYPE_PRODUCE_PURCHASE_CONFIRM:
                purchase_data = pending_conf.data_context
                # Create the transaction record as confirmed
                with db_transaction.atomic():
                    Transaction.objects.create(
                        account_party=pending_conf.target_account, # Farmer is the seller (income)
                        buyer=pending_conf.initiator_account, # Buyer is the initiator
                        name=f"Produce Sale: {purchase_data.get('product_name')} x {int(purchase_data.get('quantity')) if purchase_data.get('quantity') == int(purchase_data.get('quantity')) else purchase_data.get('quantity')}", # Cast to int for name
                        date=timezone.localdate(),
                        category='produce_sale',
                        status='income',
                        amount=Decimal(str(purchase_data.get('total_amount'))) # Ensure Decimal conversion
                    )
                response_text = "Produce purchase confirmed! Details sent to Buyer."
                _send_sms(pending_conf.initiator_account.phone_number, f"Farmer {pending_conf.target_account.full_name} confirmed your purchase of {purchase_data.get('product_name')} for GHS {purchase_data.get('total_amount'):.2f}.")

            elif pending_conf.request_type == PendingConfirmation.TYPE_LOAN_REPAYMENT_CONFIRM:
                 repayment_data = pending_conf.data_context
                 loan_id = repayment_data.get('loan_id')
                 amount_received = Decimal(str(repayment_data.get('amount_received'))) # Ensure Decimal conversion
                 try:
                    # Target is the Lender, Initiator is the Farmer
                    # Loan should be associated with the Farmer as 'farmer' and Lender as 'lender'
                    loan = Loan.objects.get(
                        id=loan_id,
                        farmer=pending_conf.initiator_account, # Ensure farmer matches initiator
                        lender=pending_conf.target_account # Ensure lender matches target
                    )
                    # Update loan status - this might be partial or full repayment
                    # For simplicity, assume full repayment here, needs more complex logic for installments
                    loan.date_repaid = timezone.localdate() # Mark as repaid
                    # FIX: Corrected on_time logic
                    loan.on_time = (loan.date_repaid <= loan.due_date) if loan.due_date else False 
                    loan.status = 'repaid' # Mark loan as repaid
                    loan.save(update_fields=['date_repaid', 'on_time', 'status'])
                    
                    # Record transaction for Lender (income)
                    Transaction.objects.create(
                        account_party=pending_conf.target_account, # Lender is the receiver (income)
                        name=f"Loan Repayment Received (Loan ID: {loan.id})",
                        date=timezone.localdate(),
                        category="loan_repayment", # Or 'investment_income' if a new category
                        status="income",
                        amount=amount_received # Amount they confirmed receiving
                    )
                    response_text = "Loan repayment confirmed! Details sent to Farmer."
                    _send_sms(pending_conf.initiator_account.phone_number, f"Lender {pending_conf.target_account.full_name} confirmed receipt of GHS {amount_received:.2f} for Loan {loan.id}.")

                 except Loan.DoesNotExist:
                    print(f"DEBUG VIEWS: Loan {loan_id} not found for farmer {pending_conf.initiator_account.id} and lender {pending_conf.target_account.id}.")
                    response_text = "Error: Loan not found. Repayment not recorded."
                 except Exception as e:
                    print(f"DEBUG VIEWS: Error confirming loan repayment: {e}")
                    import traceback
                    traceback.print_exc() # Print full traceback for debugging
                    response_text = "Error recording repayment. Please try again."

            session_status = "END"
            session.end_session()
            session.save() # Explicit save
            return Response(f"{session_status} {response_text}", content_type='text/plain') # Immediate return

        elif user_input == '2': # DENY
            pending_conf.status = PendingConfirmation.STATUS_DENIED
            pending_conf.confirmed_at = timezone.now()
            pending_conf.save()
            print(f"DEBUG VIEWS: Confirmation {pending_conf.confirmation_id} denied by {phone_number}.")
            
            initiator_name = pending_conf.initiator_account.full_name or f"ID: {pending_conf.initiator_account.id}"

            if pending_conf.request_type == PendingConfirmation.TYPE_TRUST_VIEW_REQUEST: # Changed from TYPE_TRUST_VIEW_CONSENT
                _send_sms(pending_conf.initiator_account.phone_number, f"Farmer {pending_conf.target_account.full_name} (ID: {pending_conf.target_account.id}) has denied your request to view profile.")
                response_text = "Consent denied."
            elif pending_conf.request_type == PendingConfirmation.TYPE_LOAN_OFFER:
                # If a loan offer is denied, mark the loan as cancelled if it was already created as 'pending'
                # For this flow, loans are created as 'active' upon farmer acceptance, so denial means no loan is created.
                # If we had a 'pending' loan status, we'd update it here.
                _send_sms(pending_conf.initiator_account.phone_number, f"Farmer {pending_conf.target_account.full_name} (ID: {pending_conf.target_account.id}) has rejected your loan offer of GHS {pending_conf.data_context.get('amount'):.2f}.")
                response_text = "Loan offer rejected."
            elif pending_conf.request_type == PendingConfirmation.TYPE_PRODUCE_PURCHASE_CONFIRM:
                _send_sms(pending_conf.initiator_account.phone_number, f"Farmer {pending_conf.target_account.full_name} (ID: {pending_conf.target_account.id}) has denied confirmation of your purchase of {pending_conf.data_context.get('product_name')}.")
                response_text = "Produce purchase denied."
            elif pending_conf.request_type == PendingConfirmation.TYPE_LOAN_REPAYMENT_CONFIRM:
                _send_sms(pending_conf.initiator_account.phone_number, f"Lender {pending_conf.target_account.full_name} (ID: {pending_conf.target_account.id}) has denied confirmation of repayment for Loan {pending_conf.data_context.get('loan_id')}.")
                response_text = "Loan repayment denial confirmed."

            session_status = "END"
            session.end_session()
            session.save() # Explicit save
            return Response(f"{session_status} {response_text}", content_type='text/plain') # Immediate return
        else:
            response_text = "Invalid choice. Reply 1 to CONFIRM / 2 to DENY."
            session.update_state('confirm_request_details', user_input) # Stay in this state
            session.save() # Explicit save
            return Response(f"{session_status} {response_text}", content_type='text/plain') # Immediate return


    # --- General Menu Logic ---
    # This block should only be hit if no confirmation ID was entered, or if the session is new.
    # The 'created' flag helps distinguish new sessions.
    elif session.current_menu_state == 'user_type_selection':
        account = Account.objects.filter(phone_number=phone_number).first()
        
        if user_input == '1': # Farmer
            if account and account.role == 'farmer':
                # Pass logged_in_user_id explicitly in the payload for persistence
                session.update_state('farmer_pin_entry', user_input, {'user_id': account.id, 'user_role': 'farmer', 'logged_in_user_id': account.id})
                session.save() # Explicit save
                response_text = "Welcome back Farmer! Enter your 4-digit PIN:"
                print(f"DEBUG VIEWS: Farmer existing login. Set logged_in_user_id: {account.id}")
            else:
                session.update_state('farmer_reg_name', user_input)
                session.save() # Explicit save
                response_text = "Register as Farmer: \nPlease enter your Full Name:"
        elif user_input == '2': # Investor
            if account and account.role == 'investor':
                # Pass logged_in_user_id explicitly in the payload for persistence
                session.update_state('investor_pin_entry', user_input, {'user_id': account.id, 'user_role': 'investor', 'logged_in_user_id': account.id})
                session.save() # Explicit save
                response_text = "Welcome back Investor! Enter your 4-digit PIN:"
                print(f"DEBUG VIEWS: Investor existing login. Set logged_in_user_id: {account.id}")
            else:
                session.update_state('investor_reg_name', user_input)
                session.save() # Explicit save
                response_text = "Register as Investor: \nPlease enter your Full Name:"
        # Removed '3. Lender' option and its associated logic
        elif user_input == '4': # Buyer
            if account and account.role == 'buyer':
                # No PIN for login, go straight to menu for simplicity as per new understanding
                # Pass logged_in_user_id explicitly in the payload for persistence
                session.update_state('buyer_main_menu', user_input, {'user_id': account.id, 'user_role': 'buyer', 'logged_in_user_id': account.id})
                session.save() # Explicit save
                response_text = "Welcome back Buyer! \n1. Record Produce Purchase \n00. Main Menu"
                print(f"DEBUG VIEWS: Buyer existing login. Set logged_in_user_id: {account.id}")
            else:
                session.update_state('buyer_reg_name', user_input)
                session.save() # Explicit save
                response_text = "Register as Buyer: \nPlease enter your Full Name:"
        else:
            response_text = "Invalid choice. Please reply with 1, 2, or 4." # Updated options
            session.update_state('user_type_selection', user_input) # Stay in same state
            session.save() # Explicit save


    # --- FARMER REGISTRATION FLOW (Existing) ---
    elif session.current_menu_state == 'farmer_reg_name':
        # Ensure 'reg_full_name' is stored in the payload
        current_payload = session.data_payload.copy()
        current_payload['reg_full_name'] = user_input
        session.update_state('farmer_reg_pin_setup', user_input, current_payload)
        session.save() # Explicit save
        response_text = "Enter your 4-digit PIN:"
    
    elif session.current_menu_state == 'farmer_reg_pin_setup':
        current_payload = session.data_payload.copy() # Copy payload to preserve reg_full_name
        if not re.fullmatch(r'\d{4}', user_input):
            response_text = "Invalid PIN. PIN must be 4 digits. Please re-enter:"
            session.update_state('farmer_reg_pin_setup', user_input, current_payload) # Stay in this state, pass payload
            session.save() # Explicit save
        else:
            current_payload['reg_pin_1'] = user_input # Store the first PIN
            session.update_state('farmer_reg_pin_confirm', user_input, current_payload)
            session.save() # Explicit save
            response_text = "Confirm your 4-digit PIN:"

    elif session.current_menu_state == 'farmer_reg_pin_confirm':
        reg_pin_1 = session.data_payload.get('reg_pin_1')
        print(f"DEBUG VIEWS: farmer_reg_pin_confirm: reg_pin_1='{reg_pin_1}', user_input='{user_input}'") # Debug print
        if user_input == reg_pin_1:
            print("DEBUG VIEWS: PINs match, proceeding to registration.") # Debug print
            full_name = session.data_payload.get('reg_full_name')
            with db_transaction.atomic():
                account = Account.objects.create_user(
                    email=None,
                    phone_number=phone_number,
                    password=None,
                    full_name=full_name,
                    role='farmer'
                )
                account.set_pin(user_input)
                FarmerProfile.objects.create(
                    account=account,
                    full_name=full_name,
                    phone_number=phone_number,
                    country='Ghana',
                    region='Unknown',
                )
            response_text = f"Registration successful! Your ID is {account.id}. \nDial again to log in."
            session_status = "END" # Changed to END as per test expectation
            session.end_session() # End session after successful registration
            session.save() # Explicit save
        else:
            print("DEBUG VIEWS: PINs do NOT match.") # Debug print
            response_text = "PINs do not match. Please re-enter your 4-digit PIN:"
            current_payload = session.data_payload.copy()
            current_payload['reg_pin_1'] = None # Clear the first PIN for re-entry
            session.update_state('farmer_reg_pin_setup', user_input, current_payload) # Go back to re-enter PIN, passing updated payload
            session.save() # Explicit save

    # --- INVESTOR REGISTRATION FLOW (Existing) ---
    elif session.current_menu_state == 'investor_reg_name':
        current_payload = session.data_payload.copy()
        current_payload['reg_full_name'] = user_input
        session.update_state('investor_reg_pin_setup', user_input, current_payload)
        session.save() # Explicit save
        response_text = "Enter your 4-digit PIN:"
    
    elif session.current_menu_state == 'investor_reg_pin_setup':
        current_payload = session.data_payload.copy() # Copy payload to preserve reg_full_name
        if not re.fullmatch(r'\d{4}', user_input):
            response_text = "Invalid PIN. PIN must be 4 digits. Please re-enter:"
            session.update_state('investor_reg_pin_setup', user_input, current_payload)
            session.save() # Explicit save
        else:
            current_payload['reg_pin_1'] = user_input # Store the first PIN
            session.update_state('investor_reg_pin_confirm', user_input, current_payload)
            session.save() # Explicit save
            response_text = "Confirm your 4-digit PIN:"

    elif session.current_menu_state == 'investor_reg_pin_confirm':
        reg_pin_1 = session.data_payload.get('reg_pin_1')
        if user_input == reg_pin_1:
            full_name = session.data_payload.get('reg_full_name')
            with db_transaction.atomic():
                account = Account.objects.create_user(
                    email=None,
                    phone_number=phone_number,
                    password=None,
                    full_name=full_name,
                    role='investor'
                )
                account.set_pin(user_input)
                InvestorProfile.objects.create(
                    account=account,
                    full_name=full_name,
                    phone_number=phone_number,
                    country='Ghana',
                    region='Unknown',
                )
            response_text = f"Registration successful! Your ID is {account.id}. \nDial again to log in."
            session_status = "END"
            session.end_session()
            session.save() # Explicit save
        else:
            response_text = "PINs do not match. Please re-enter your 4-digit PIN:"
            current_payload = session.data_payload.copy()
            current_payload['reg_pin_1'] = None # Clear the first PIN for re-entry
            session.update_state('investor_reg_pin_setup', user_input, current_payload) # Go back to re-enter PIN, passing updated payload
            session.save() # Explicit save

    # Removed LENDER REGISTRATION FLOW

    # --- BUYER REGISTRATION FLOW (NEW) ---
    elif session.current_menu_state == 'buyer_reg_name':
        full_name = user_input
        with db_transaction.atomic():
            account = Account.objects.create_user(
                email=None,
                phone_number=phone_number,
                password=None,
                full_name=full_name,
                role='buyer'
            )
        # Pass logged_in_user_id explicitly in the payload for persistence
        session.update_state('buyer_main_menu', user_input, {'user_id': account.id, 'user_role': 'buyer', 'logged_in_user_id': account.id})
        session.save() # Explicit save
        response_text = f"Buyer registration successful! Your ID is {account.id}. \n1. Record Produce Purchase \n00. Main Menu"
        print(f"DEBUG VIEWS: Buyer registration. Set logged_in_user_id: {account.id}")

    # --- USER LOGIN (PIN Entry for Farmer/Investor) ---
    elif session.current_menu_state in ['farmer_pin_entry', 'investor_pin_entry']:
        account_id = session.data_payload.get('user_id')
        user_role = session.data_payload.get('user_role')
        account = Account.objects.filter(id=account_id, phone_number=phone_number).first()
        print(f"DEBUG VIEWS: Pin entry for account_id: {account_id}, user_role: {user_role}")

        if account and account.check_pin(user_input):
            # Pass logged_in_user_id explicitly in the payload for persistence
            new_payload_data = session.data_payload.copy() # Start with existing payload
            new_payload_data['logged_in_user_id'] = account.id
            print(f"DEBUG VIEWS: Successful PIN login. Setting logged_in_user_id in payload: {account.id}")
            if user_role == 'farmer':
                session.update_state('farmer_main_menu', user_input, new_payload_data)
                session.save() # Explicit save
                response_text = "Farmer Menu: \n1. Check My Stats \n2. Update Products \n3. Transactions \n4. View Transaction Logs \n5. Request Loan \n00. Main Menu" # NEW: Added Request Loan
            else: # Investor
                session.update_state('investor_main_menu', user_input, new_payload_data)
                session.save() # Explicit save
                response_text = "Investor Menu: \n1. View Farmer Trust \n2. Proceed to Invest \n3. Transactions \n00. Main Menu"
        else:
            response_text = "Invalid PIN. Try again or dial 00 to go back to Main Menu."
            # Optionally add a counter for failed attempts and lock out
            session.update_state(session.current_menu_state, user_input) # Stay in PIN entry state
            session.save() # Explicit save

    # --- FARMER MAIN MENU (Existing) ---
    elif session.current_menu_state == 'farmer_main_menu':
        logged_in_user_id = session.data_payload.get('logged_in_user_id')
        print(f"DEBUG VIEWS: Farmer Main Menu. fetched logged_in_user_id: {logged_in_user_id}, payload: {session.data_payload}")
        if not logged_in_user_id:
            response_text = "Your session is invalid. Please start again from Main Menu."
            session_status = "END"
            session.end_session()
            session.save() # Explicit save
            return Response(f"END {response_text}", content_type='text/plain')
        
        farmer_account = Account.objects.get(id=logged_in_user_id)
        current_payload = session.data_payload.copy() # Copy current payload to carry forward

        if user_input == '1': # Check My Stats
            try:
                farmer_profile = farmer_account.farmer_profile
                trust_score = farmer_profile.trust_score_percent
                trust_level = farmer_profile.trust_level_stars
                response_text = (
                    f"My Stats:\n"
                    f"Trust Score: {trust_score:.2f}%\n"
                    f"Trust Level: {trust_level:.1f} Stars\n\n"
                    f"1. Share via SMS\n0. Back"
                )
                session.update_state('farmer_stats_display', user_input, current_payload) # Pass payload
                session.save() # Explicit save
            except FarmerProfile.DoesNotExist:
                response_text = "Farmer profile not found. Please contact support."
                session.end_session()
                session_status = "END"
                session.save() # Explicit save

        elif user_input == '2': # Update Products
            response_text = "Update Products: \n1. Add Product \n2. Remove Product \n3. Change Price \n0. Back"
            session.update_state('farmer_update_products_menu', user_input, current_payload) # Pass payload
            session.save() # Explicit save

        elif user_input == '3': # Transactions
            response_text = "Transactions: \n1. Pay Loan \n2. Payout Investment \n0. Back"
            session.update_state('farmer_transactions_menu', user_input, current_payload) # Pass payload
            session.save() # Explicit save

        elif user_input == '4': # View Transaction Logs
            recent_txns = Transaction.objects.filter(account_party=farmer_account).order_by('-date')[:3]
            recent_loans = Loan.objects.filter(farmer=farmer_account).order_by('-date_taken')[:2]

            log_message = "Recent Activity:\n"
            if recent_txns.exists():
                for i, txn in enumerate(recent_txns):
                    log_message += f"{i+1}. {txn.status.capitalize()} {txn.amount} ({txn.category}) on {txn.date}\n"
            if recent_loans.exists():
                 for i, loan in enumerate(recent_loans):
                    log_message += f"{len(recent_txns)+i+1}. Loan {loan.amount} taken {loan.date_taken} (On time: {'Yes' if loan.on_time else 'No'})\n"

            if not recent_txns.exists() and not recent_loans.exists():
                log_message += "No recent activity."

            current_payload['log_data'] = log_message # Add new data to payload
            session.update_state('farmer_logs_display', user_input, current_payload) # Pass payload
            session.save() # Explicit save
            response_text = f"{log_message}\n1. Share via SMS\n0. Back"

        elif user_input == '5': # Request Loan (NEW)
            farmer_profile = farmer_account.farmer_profile
            # Check eligibility
            has_active_loan = Loan.objects.filter(farmer=farmer_account, status='active').exists()
            
            if has_active_loan:
                response_text = "You currently have an active loan. Please settle existing loans before requesting a new one."
                session_status = "END"
                session.end_session()
                session.save() # Explicit save
                print("DEBUG VIEWS: Farmer has active loan, ending session.") # ADDED DEBUG
            elif farmer_profile.trust_level_stars < MIN_TRUST_LEVEL_STARS_FOR_LOAN or \
                 farmer_profile.trust_score_percent < MIN_TRUST_SCORE_PERCENT_FOR_LOAN:
                response_text = (
                    f"You do not meet the minimum trust criteria for a loan.\n"
                    f"Required: {MIN_TRUST_LEVEL_STARS_FOR_LOAN:.1f} Stars & {MIN_TRUST_SCORE_PERCENT_FOR_LOAN:.2f}%\n"
                    f"Yours: {farmer_profile.trust_level_stars:.1f} Stars & {farmer_profile.trust_score_percent:.2f}%"
                )
                session_status = "END"
                session.end_session()
                session.save() # Explicit save
                print("DEBUG VIEWS: Farmer does not meet trust criteria, ending session.") # ADDED DEBUG
            else:
                max_qualified_amount = farmer_profile.get_max_qualified_loan_amount()
                current_payload['max_qualified_amount'] = float(max_qualified_amount) # Store as float for payload
                session.update_state('farmer_request_loan_amount_entry', user_input, current_payload)
                session.save() # Explicit save here
                response_text = (
                    f"Based on your Trust Level ({farmer_profile.trust_level_stars:.1f} Stars) and Score ({farmer_profile.trust_score_percent:.2f}%), "
                    f"you qualify for a loan up to GHS {max_qualified_amount:.2f}.\n"
                    f"Enter desired loan amount (e.g., 500.00):"
                )
                print(f"DEBUG VIEWS: Transition to farmer_request_loan_amount_entry. Max qualified: {max_qualified_amount}") # ADDED DEBUG
        elif user_input == '0': # Back to main menu
            response_text = "Welcome to FarmCred. Are you a: \n1. Farmer \n2. Investor \n4. Buyer" # Updated options
            session.update_state('user_type_selection', user_input)
            session.save() # Explicit save
            print("DEBUG VIEWS: Farmer main menu: going back to user_type_selection.") # ADDED DEBUG
        else:
            response_text = "Invalid choice. Please choose from 1-5 or 0 to go back."
            session.update_state('farmer_main_menu', user_input) # Stay in current state
            session.save() # Explicit save
            print(f"DEBUG VIEWS: Farmer main menu: Invalid choice '{user_input}'. Staying in state.") # ADDED DEBUG

    # --- FARMER: REQUEST LOAN SUB-FLOW (NEW) ---
    elif session.current_menu_state == 'farmer_request_loan_amount_entry':
        current_payload = session.data_payload.copy()
        max_qualified_amount_raw = session.data_payload.get('max_qualified_amount')
        
        if max_qualified_amount_raw is None:
            print("DEBUG VIEWS: max_qualified_amount is missing from payload. Resetting session.")
            response_text = "An error occurred with your loan qualification. Please restart."
            session_status = "END"
            session.end_session()
            session.save() # Explicit save
            return Response(f"{session_status} {response_text}", content_type='text/plain')
        
        try:
            max_qualified_amount = Decimal(str(max_qualified_amount_raw))
            print(f"DEBUG VIEWS: In farmer_request_loan_amount_entry. User input: '{user_input}'. Max qualified (from payload): {max_qualified_amount}") # ADDED DEBUG
            desired_amount = Decimal(user_input)
            print(f"DEBUG VIEWS: Parsed desired_amount: {desired_amount}") # Debug print
            if desired_amount <= 0:
                response_text = "Invalid amount. Please enter a positive number."
                session.update_state('farmer_request_loan_amount_entry', user_input, current_payload)
                session.save() # Explicit save
                print("DEBUG VIEWS: Invalid loan amount (<=0).") # ADDED DEBUG
            elif desired_amount > max_qualified_amount:
                response_text = f"Desired amount exceeds your qualified limit of GHS {max_qualified_amount:.2f}.\n" \
                                "Enter desired loan amount (e.g., 500.00):"
                session.update_state('farmer_request_loan_amount_entry', user_input, current_payload)
                session.save() # Explicit save
                print("DEBUG VIEWS: Loan amount exceeds max qualified.") # ADDED DEBUG
            else:
                current_payload['desired_loan_amount'] = float(desired_amount) # Store as float for payload
                # Determine repayment period
                logged_in_user_id = session.data_payload.get('logged_in_user_id')
                farmer_account = Account.objects.get(id=logged_in_user_id) # Get account here
                farmer_profile = farmer_account.farmer_profile # Get profile from account
                
                repayment_period_months = 1 # Default for first loan
                
                if hasattr(farmer_profile, 'on_time_repayment_ratio') and callable(farmer_profile.on_time_repayment_ratio):
                    if Loan.objects.filter(farmer=farmer_profile.account, status='repaid').exists():
                        on_time_ratio = farmer_profile.on_time_repayment_ratio()
                        print(f"DEBUG VIEWS: On-time repayment ratio: {on_time_ratio}") # ADDED DEBUG
                        if on_time_ratio >= Decimal('0.8'): # 80% or more on-time repayment
                            repayment_period_months = 6
                        elif on_time_ratio >= Decimal('0.5'): # 50-79% on-time repayment
                            repayment_period_months = 3
                        else: # Less than 50% on-time repayment
                            repayment_period_months = 1
                
                current_payload['repayment_period_months'] = repayment_period_months
                session.update_state('farmer_request_loan_summary', user_input, current_payload)
                session.save() # Explicit save here
                response_text = (
                    f"Loan Request Summary:\n"
                    f"Amount: GHS {desired_amount:.2f}\n"
                    f"Interest Rate: {FARMCRED_DEFAULT_INTEREST_RATE:.1f}% (FarmCred Standard)\n"
                    f"Repayment Period: {repayment_period_months} months\n"
                    f"1. Confirm Request\n"
                    f"0. Back"
                )
                print(f"DEBUG VIEWS: Transition to farmer_request_loan_summary. Repayment period: {repayment_period_months}") # ADDED DEBUG
        except ValueError:
            response_text = "Invalid amount. Please enter a number (e.g., 500.00):"
            session.update_state('farmer_request_loan_amount_entry', user_input, current_payload)
            session.save() # Explicit save
            print("DEBUG VIEWS: ValueError in loan amount entry.") # ADDED DEBUG
        except Exception as e:
            print(f"DEBUG VIEWS: Error in farmer_request_loan_amount_entry: {e}")
            import traceback
            traceback.print_exc()
            response_text = "An error occurred. Please try again."
            session_status = "END"
            session.end_session()
            session.save() # Explicit save
            print("DEBUG VIEWS: General Exception in loan amount entry.") # ADDED DEBUG
    elif session.current_menu_state == 'farmer_request_loan_summary':
        current_payload = session.data_payload.copy()
        if user_input == '1': # Confirm Request
            logged_in_user_id = session.data_payload.get('logged_in_user_id')
            farmer_account = Account.objects.get(id=logged_in_user_id)
            desired_amount = Decimal(str(session.data_payload.get('desired_loan_amount')))
            repayment_period_months = session.data_payload.get('repayment_period_months')
            try:
                # Get the platform lender account (FarmCred is the sole direct lender)
                platform_lender_account = Account.objects.get(role='platform_lender')
                # Calculate due date
                due_date = timezone.localdate() + datetime.timedelta(days=repayment_period_months * 30)
                with db_transaction.atomic():
                    Loan.objects.create(
                        farmer=farmer_account,
                        lender=platform_lender_account, # FarmCred is the lender
                        amount=desired_amount,
                        date_taken=timezone.localdate(),
                        due_date=due_date,
                        interest_rate=FARMCRED_DEFAULT_INTEREST_RATE,
                        repayment_period_months=repayment_period_months,
                        status='active', # Approved and disbursed by FarmCred
                        on_time=False # Default to false, updated on repayment
                    )
                # Send SMS notification to farmer
                _send_sms(farmer_account.phone_number, f"Your loan request for GHS {desired_amount:.2f} has been approved and will be disbursed shortly. Repay in {repayment_period_months} months.")
                # Optional: Send SMS notification to FarmCred admin/relevant party
                farmcred_admin_phone = getattr(settings, 'FARMCRED_ADMIN_PHONE', None)
                if farmcred_admin_phone:
                    _send_sms(farmcred_admin_phone, f"New loan disbursed to Farmer {farmer_account.full_name} (ID: {farmer_account.id}) for GHS {desired_amount:.2f}.")
                else:
                    print("WARNING: FARMCRED_ADMIN_PHONE not set in settings. Admin notification skipped.")
                response_text = f"Your loan request for GHS {desired_amount:.2f} has been approved and will be disbursed shortly."
                session_status = "END"
                session.end_session()
                session.save() # Explicit save
            except Account.DoesNotExist:
                print("DEBUG VIEWS: Platform Lender account not found. Please ensure an account with role 'platform_lender' exists.")
                response_text = "Loan processing error: Platform Lender not found. Please contact support."
                session_status = "END"
                session.end_session()
                session.save() # Explicit save
            except Exception as e:
                print(f"DEBUG VIEWS: Error processing loan request: {e}")
                import traceback
                traceback.print_exc()
                response_text = "Loan request failed. Please try again later."
                session_status = "END"
                session.end_session()
                session.save() # Explicit save
        elif user_input == '0': # Back
            # Go back to amount entry, preserving max_qualified_amount
            response_text = (
                f"Based on your Trust Level ({farmer_account.farmer_profile.trust_level_stars:.1f} Stars) and Score ({farmer_account.farmer_profile.trust_score_percent:.2f}%), "
                f"you qualify for a loan up to GHS {session.data_payload.get('max_qualified_amount'):.2f}.\n"
                f"Enter desired loan amount (e.g., 500.00):"
            )
            session.update_state('farmer_request_loan_amount_entry', user_input, current_payload)
            session.save() # Explicit save
        else:
            response_text = "Invalid choice. 1 to Confirm, 0 to Back."
            session.update_state('farmer_request_loan_summary', user_input, current_payload)
            session.save() # Explicit save

    # --- FARMER: STATS SUB-FLOW ---
    elif session.current_menu_state == 'farmer_stats_display':
        current_payload = session.data_payload.copy() # Copy current payload to carry forward
        if user_input == '1': # Share via SMS
            response_text = "Enter recipient's phone number:"
            session.update_state('farmer_stats_sms_recipient', user_input, current_payload) # Pass payload
            session.save() # Explicit save
        elif user_input == '0': # Back
            response_text = "Farmer Menu: \n1. Check My Stats \n2. Update Products \n3. Transactions \n4. View Transaction Logs \n5. Request Loan \n00. Main Menu"
            session.update_state('farmer_main_menu', user_input, current_payload) # Pass payload
            session.save() # Explicit save
        else:
            response_text = "Invalid choice. Please choose 1 or 0 to go back."
            session.update_state('farmer_stats_display', user_input, current_payload) # Stay in current state
            session.save() # Explicit save

    elif session.current_menu_state == 'farmer_stats_sms_recipient':
        current_payload = session.data_payload.copy() # Copy current payload to carry forward
        recipient_phone = user_input
        # Basic phone number validation (can be enhanced)
        if re.fullmatch(r'^\d{10,15}$', recipient_phone):
            logged_in_user_id = session.data_payload.get('logged_in_user_id')
            farmer_profile = Account.objects.get(id=logged_in_user_id).farmer_profile
            stats_message = (
                f"FarmCred Trust Stats for {farmer_profile.full_name}: \n"
                f"Trust Score: {farmer_profile.trust_score_percent:.2f}% \n"
                f"Trust Level: {farmer_profile.trust_level_stars:.1f} Stars"
            )
            _send_sms(recipient_phone, stats_message)
            response_text = "Stats sent successfully via SMS!"
            session_status = "END"
            session.end_session()
            session.save() # Explicit save
        else:
            response_text = "Invalid phone number format. Please enter a valid number:"
            session.update_state('farmer_stats_sms_recipient', user_input, current_payload) # Stay in this state
            session.save() # Explicit save


    # --- FARMER: UPDATE PRODUCTS SUB-FLOW (Existing) ---
    elif session.current_menu_state == 'farmer_update_products_menu':
        logged_in_user_id = session.data_payload.get('logged_in_user_id')
        farmer_profile = Account.objects.get(id=logged_in_user_id).farmer_profile
        current_payload = session.data_payload.copy() # Copy current payload to carry forward

        if user_input == '1': # Add Product
            response_text = "Enter product name (e.g., Mangoes):"
            session.update_state('farmer_add_product_name', user_input, current_payload) # Pass payload
            session.save() # Explicit save
        elif user_input == '2': # Remove Product
            if farmer_profile.produce:
                products_list = farmer_profile.produce
                current_payload['products_list'] = products_list # Store for display
                product_options = "\n".join([f"{i+1}. {p}" for i, p in enumerate(products_list)])
                response_text = f"Select product to remove:\n{product_options}\n0. Back"
                session.update_state('farmer_remove_product_select', user_input, current_payload) # Pass payload
                session.save() # Explicit save
            else:
                response_text = "No products to remove.\n0. Back to Update Products"
                session.update_state('farmer_update_products_menu', user_input, current_payload) # Stay in this menu
                session.save() # Explicit save
        elif user_input == '3': # Change Price
            if farmer_profile.produce:
                products_list = farmer_profile.produce
                current_payload['products_list'] = products_list # Store for display
                product_options = "\n".join([f"{i+1}. {p}" for i, p in enumerate(products_list)])
                response_text = f"Select product to change price:\n{product_options}\n0. Back"
                session.update_state('farmer_change_price_select', user_input, current_payload) # Pass payload
                session.save() # Explicit save
            else:
                response_text = "No products to change price for.\n0. Back to Update Products"
                session.update_state('farmer_update_products_menu', user_input, current_payload) # Stay in this menu
                session.save() # Explicit save
        elif user_input == '0': # Back
            response_text = "Farmer Menu: \n1. Check My Stats \n2. Update Products \n3. Transactions \n4. View Transaction Logs \n5. Request Loan \n00. Main Menu" # NEW: Added Request Loan
            session.update_state('farmer_main_menu', user_input, current_payload) # Pass payload
            session.save() # Explicit save
        else:
            response_text = "Invalid choice. Please choose from 1-3 or 0 to go back."
            session.update_state('farmer_update_products_menu', user_input, current_payload) # Stay in this menu
            session.save() # Explicit save

    elif session.current_menu_state == 'farmer_add_product_name':
        current_payload = session.data_payload.copy() # Copy current payload to carry forward
        current_payload['new_product_name'] = user_input
        response_text = "Enter product price per unit (e.g., 5.00):"
        session.update_state('farmer_add_product_price', user_input, current_payload) # Pass payload
        session.save() # Explicit save

    elif session.current_menu_state == 'farmer_add_product_price':
        current_payload = session.data_payload.copy() # Copy current payload to carry forward
        product_name = session.data_payload.get('new_product_name')
        try:
            price = Decimal(user_input)
            if price <= 0:
                response_text = "Price must be a positive number. Please re-enter:"
                session.update_state('farmer_add_product_price', user_input, current_payload) # Stay in this state
                session.save() # Explicit save
            else:
                logged_in_user_id = session.data_payload.get('logged_in_user_id')
                farmer_profile = Account.objects.get(id=logged_in_user_id).farmer_profile
                
                # Ensure produce is a list
                if not isinstance(farmer_profile.produce, list):
                    farmer_profile.produce = []

                farmer_profile.produce.append(f"{product_name}@{price:.2f}")
                farmer_profile.save()
                response_text = f"'{product_name}' added successfully! \n0. Back to Update Products"
                session.update_state('farmer_update_products_menu', user_input, current_payload) # Go back to products menu
                session.save() # Explicit save
        except ValueError:
            response_text = "Invalid price. Please enter a number (e.g., 5.00):"
            session.update_state('farmer_add_product_price', user_input, current_payload) # Stay in this state
            session.save() # Explicit save

    elif session.current_menu_state == 'farmer_remove_product_select':
        current_payload = session.data_payload.copy() # Copy current payload to carry forward
        products_list = session.data_payload.get('products_list', [])
        
        if user_input == '0': # Back
            response_text = "Update Products: \n1. Add Product \n2. Remove Product \n3. Change Price \n0. Back"
            session.update_state('farmer_update_products_menu', user_input, current_payload) # Go back to products menu
            session.save() # Explicit save
        else:
            try:
                selected_index = int(user_input) - 1
                if 0 <= selected_index < len(products_list):
                    removed_product = products_list.pop(selected_index)
                    product_name = removed_product.split('@')[0]
                    
                    logged_in_user_id = session.data_payload.get('logged_in_user_id')
                    farmer_profile = Account.objects.get(id=logged_in_user_id).farmer_profile
                    farmer_profile.produce = products_list # Update the list
                    farmer_profile.save()
                    
                    response_text = f"'{product_name}' removed successfully! \n0. Back to Update Products"
                    session.update_state('farmer_update_products_menu', user_input, current_payload) # Go back to products menu
                    session.save() # Explicit save
                else:
                    response_text = "Invalid selection. Please choose a number from the list or 0 to go back."
                    session.update_state('farmer_remove_product_select', user_input, current_payload) # Stay in this state
                    session.save() # Explicit save
            except ValueError:
                response_text = "Invalid input. Please enter a number."
                session.update_state('farmer_remove_product_select', user_input, current_payload) # Stay in this state
                session.save() # Explicit save

    elif session.current_menu_state == 'farmer_change_price_select':
        current_payload = session.data_payload.copy() # Copy current payload to carry forward
        products_list = session.data_payload.get('products_list', [])

        if user_input == '0': # Back
            response_text = "Update Products: \n1. Add Product \n2. Remove Product \n3. Change Price \n0. Back"
            session.update_state('farmer_update_products_menu', user_input, current_payload) # Go back to products menu
            session.save() # Explicit save
        else:
            try:
                selected_index = int(user_input) - 1
                if 0 <= selected_index < len(products_list):
                    selected_product_str = products_list[selected_index]
                    product_name = selected_product_str.split('@')[0]
                    current_payload['product_name'] = product_name
                    current_payload['product_index'] = selected_index
                    response_text = f"Enter new price for '{product_name}' (e.g., 7.50):"
                    session.update_state('farmer_change_price_new_price', user_input, current_payload) # Go to new price entry
                    session.save() # Explicit save
                else:
                    response_text = "Invalid selection. Please choose a number from the list or 0 to go back."
                    session.update_state('farmer_change_price_select', user_input, current_payload) # Stay in this state
                    session.save() # Explicit save
            except ValueError:
                response_text = "Invalid input. Please enter a number."
                session.update_state('farmer_change_price_select', user_input, current_payload) # Stay in this state
                session.save() # Explicit save

    elif session.current_menu_state == 'farmer_change_price_new_price':
        current_payload = session.data_payload.copy() # Copy current payload to carry forward
        product_name = session.data_payload.get('product_name')
        product_index = session.data_payload.get('product_index')
        products_list = session.data_payload.get('products_list', [])

        try:
            new_price = Decimal(user_input)
            if new_price <= 0:
                response_text = "Price must be a positive number. Please re-enter:"
                session.update_state('farmer_change_price_new_price', user_input, current_payload) # Stay in this state
                session.save() # Explicit save
            else:
                logged_in_user_id = session.data_payload.get('logged_in_user_id')
                farmer_profile = Account.objects.get(id=logged_in_user_id).farmer_profile
                
                # Update the specific product in the list
                products_list[product_index] = f"{product_name}@{new_price:.2f}"
                farmer_profile.produce = products_list
                farmer_profile.save()
                
                response_text = f"Price for '{product_name}' updated to {new_price:.2f}! \n0. Back to Update Products"
                session.update_state('farmer_update_products_menu', user_input, current_payload) # Go back to products menu
                session.save() # Explicit save
        except ValueError:
            response_text = "Invalid price. Please enter a number (e.g., 7.50):"
            session.update_state('farmer_change_price_new_price', user_input, current_payload) # Stay in this state
            session.save() # Explicit save


    # --- FARMER: TRANSACTIONS SUB-FLOW (Existing) ---
    elif session.current_menu_state == 'farmer_transactions_menu':
        logged_in_user_id = session.data_payload.get('logged_in_user_id')
        current_payload = session.data_payload.copy() # Copy current payload to carry forward

        if user_input == '1': # Pay Loan
            response_text = "Enter Loan ID to pay:"
            session.update_state('farmer_pay_loan_id', user_input, current_payload) # Pass payload
            session.save() # Explicit save
        elif user_input == '2': # Payout Investment (Farmer receives from Investor)
            response_text = "Enter Investment ID to payout (NOT YET IMPLEMENTED):" # Placeholder
            session.update_state('farmer_payout_investment_id', user_input, current_payload) # Pass payload
            session.save() # Explicit save
        elif user_input == '0': # Back
            response_text = "Farmer Menu: \n1. Check My Stats \n2. Update Products \n3. Transactions \n4. View Transaction Logs \n5. Request Loan \n00. Main Menu" # NEW: Added Request Loan
            session.update_state('farmer_main_menu', user_input, current_payload) # Pass payload
            session.save() # Explicit save
        else:
            response_text = "Invalid choice. Please choose 1, 2 or 0 to go back."
            session.update_state('farmer_transactions_menu', user_input, current_payload) # Stay in this menu
            session.save() # Explicit save

    elif session.current_menu_state == 'farmer_pay_loan_id':
        logged_in_user_id = session.data_payload.get('logged_in_user_id')
        current_payload = session.data_payload.copy() # Copy current payload to carry forward
        try:
            loan_id = int(user_input)
            loan = Loan.objects.filter(id=loan_id, farmer_id=logged_in_user_id, status='active').first()
            if loan:
                current_payload['loan_id_to_pay'] = loan.id
                current_payload['loan_amount_due'] = float(loan.amount) # Store as float for payload
                current_payload['lender_id'] = loan.lender.id # Store lender ID
                response_text = f"Loan ID: {loan.id}, Amount Due: {loan.amount:.2f}. Enter your 4-digit PIN to confirm payment:"
                session.update_state('farmer_pay_loan_pin', user_input, current_payload) # Pass payload
                session.save() # Explicit save
            else:
                response_text = "Active loan not found with that ID. Please try again:"
                session.update_state('farmer_pay_loan_id', user_input, current_payload) # Stay in this state
                session.save() # Explicit save
        except ValueError:
            response_text = "Invalid Loan ID. Please enter a number."
            session.update_state('farmer_pay_loan_id', user_input, current_payload) # Stay in this state
            session.save() # Explicit save

    elif session.current_menu_state == 'farmer_pay_loan_pin':
        logged_in_user_id = session.data_payload.get('logged_in_user_id')
        farmer_account = Account.objects.get(id=logged_in_user_id)
        current_payload = session.data_payload.copy() # Copy current payload to carry forward

        if farmer_account.check_pin(user_input):
            loan_id = session.data_payload.get('loan_id_to_pay')
            loan_amount_due = Decimal(str(session.data_payload.get('loan_amount_due'))) # Convert back to Decimal
            lender_id = session.data_payload.get('lender_id')
            lender_account = Account.objects.get(id=lender_id)

            if lender_account.role == 'platform_lender':
                # If lender is FarmCred, auto-confirm repayment
                with db_transaction.atomic():
                    loan = Loan.objects.get(id=loan_id, farmer=farmer_account, status='active')
                    loan.date_repaid = timezone.localdate()
                    loan.on_time = (loan.date_repaid <= loan.due_date) if loan.due_date else True
                    loan.status = 'repaid'
                    loan.save(update_fields=['date_repaid', 'on_time', 'status'])

                    Transaction.objects.create(
                        account_party=lender_account, # FarmCred receives income
                        name=f"Loan Repayment Received (Loan ID: {loan.id})",
                        date=timezone.localdate(),
                        category="loan_repayment",
                        status="income",
                        amount=loan_amount_due
                    )
                response_text = f"Loan {loan_id} payment confirmed by FarmCred."
                session_status = "END"
                session.end_session()
                session.save() # Explicit save
            else:
                # If lender is an Investor, create a PendingConfirmation
                confirmation_id = generate_confirmation_id()
                expires_at = timezone.now() + datetime.timedelta(minutes=30) # Investor has 30 mins to confirm
                PendingConfirmation.objects.create(
                    confirmation_id=confirmation_id,
                    initiator_account=farmer_account,
                    target_account=lender_account,
                    request_type=PendingConfirmation.TYPE_LOAN_REPAYMENT_CONFIRM,
                    related_object_id=loan_id,
                    data_context={
                        'loan_id': loan_id,
                        'amount_received': float(loan_amount_due), # Store as float for payload
                        'farmer_id': farmer_account.id,
                        'farmer_name': farmer_account.full_name
                    },
                    expires_at=expires_at
                )
                _send_sms(lender_account.phone_number, 
                          f"Farmer {farmer_account.full_name} (ID: {farmer_account.id}) is confirming repayment of GHS {loan_amount_due:.2f} for Loan {loan_id}. Enter this code in USSD: {confirmation_id}. Reply 1 to CONFIRM RECEIPT / 2 to DENY.")
                response_text = f"Loan {loan_id} payment confirmed! Confirmation request sent to Lender (code: {confirmation_id})."
                session_status = "END"
                session.end_session()
                session.save() # Explicit save
        else:
            response_text = "Invalid PIN. Please try again."
            session.update_state('farmer_pay_loan_pin', user_input, current_payload) # Stay in this state
            session.save() # Explicit save


    elif session.current_menu_state == 'farmer_logs_display':
        current_payload = session.data_payload.copy() # Copy current payload to carry forward
        log_data = session.data_payload.get('log_data', "No recent activity.")

        if user_input == '1': # Share via SMS
            response_text = "Enter recipient's phone number to share logs:"
            session.update_state('farmer_logs_sms_recipient', user_input, current_payload) # Pass payload
            session.save() # Explicit save
        elif user_input == '0': # Back
            response_text = "Farmer Menu: \n1. Check My Stats \n2. Update Products \n3. Transactions \n4. View Transaction Logs \n5. Request Loan \n00. Main Menu" # NEW: Added Request Loan
            session.update_state('farmer_main_menu', user_input, current_payload) # Pass payload
            session.save() # Explicit save
        else:
            response_text = f"{log_data}\nInvalid choice. Please choose 1 or 0."
            session.update_state('farmer_logs_display', user_input, current_payload) # Stay in this state
            session.save() # Explicit save

    elif session.current_menu_state == 'farmer_logs_sms_recipient':
        current_payload = session.data_payload.copy() # Copy current payload to carry forward
        recipient_phone = user_input
        log_data = session.data_payload.get('log_data', "No recent activity.")
        
        if re.fullmatch(r'^\d{10,15}$', recipient_phone): # Basic phone number validation
            _send_sms(recipient_phone, f"FarmCred Activity Log for {session.phone_number}:\n{log_data}")
            response_text = "Logs sent successfully via SMS!"
            session_status = "END"
            session.end_session()
            session.save() # Explicit save
        else:
            response_text = "Invalid phone number format. Please enter a valid number:"
            session.update_state('farmer_logs_sms_recipient', user_input, current_payload) # Stay in this state
            session.save() # Explicit save

    elif session.current_menu_state == 'farmer_stats_display':
        current_payload = session.data_payload.copy() # Copy current payload to carry forward
        logged_in_user_id = session.data_payload.get('logged_in_user_id')
        farmer_profile = Account.objects.get(id=logged_in_user_id).farmer_profile
        
        if user_input == '1': # Share via SMS
            response_text = "Enter recipient's phone number to share stats:"
            session.update_state('farmer_stats_sms_recipient', user_input, current_payload) # Pass payload
            session.save() # Explicit save
        elif user_input == '0': # Back
            response_text = "Farmer Menu: \n1. Check My Stats \n2. Update Products \n3. Transactions \n4. View Transaction Logs \n5. Request Loan \n00. Main Menu" # NEW: Added Request Loan
            session.update_state('farmer_main_menu', user_input, current_payload) # Pass payload
            session.save() # Explicit save
        else:
            response_text = (
                f"My Stats:\n"
                f"Trust Score: {farmer_profile.trust_score_percent:.2f}%\n"
                f"Trust Level: {farmer_profile.trust_level_stars:.1f} Stars\n\n"
                f"Invalid choice. Please choose 1 or 0."
            )
            session.update_state('farmer_stats_display', user_input, current_payload) # Stay in this state
            session.save() # Explicit save

    elif session.current_menu_state == 'farmer_stats_sms_recipient':
        current_payload = session.data_payload.copy() # Copy current payload to carry forward
        recipient_phone = user_input
        logged_in_user_id = session.data_payload.get('logged_in_user_id')
        farmer_profile = Account.objects.get(id=logged_in_user_id).farmer_profile

        if re.fullmatch(r'^\d{10,15}$', recipient_phone): # Basic phone number validation
            stats_message = (
                f"FarmCred Trust Stats for {farmer_profile.full_name}:\n"
                f"Trust Score: {farmer_profile.trust_score_percent:.2f}%\n"
                f"Trust Level: {farmer_profile.trust_level_stars:.1f} Stars"
            )
            _send_sms(recipient_phone, stats_message)
            response_text = "Stats sent successfully via SMS!"
            session_status = "END"
            session.end_session()
            session.save() # Explicit save
        else:
            response_text = "Invalid phone number format. Please enter a valid number:"
            session.update_state('farmer_stats_sms_recipient', user_input, current_payload) # Stay in this state
            session.save() # Explicit save


    # --- INVESTOR MAIN MENU (Existing) ---
    elif session.current_menu_state == 'investor_main_menu':
        logged_in_user_id = session.data_payload.get('logged_in_user_id')
        print(f"DEBUG VIEWS: Investor Main Menu. fetched logged_in_user_id: {logged_in_user_id}, payload: {session.data_payload}")
        if not logged_in_user_id:
            response_text = "Your session is invalid. Please start again from Main Menu."
            session_status = "END"
            session.end_session()
            session.save() # Explicit save
            return Response(f"END {response_text}", content_type='text/plain')
        
        investor_account = Account.objects.get(id=logged_in_user_id)
        current_payload = session.data_payload.copy() # Copy current payload to carry forward

        if user_input == '1': # View Farmer Trust
            response_text = "Enter Farmer ID (e.g., a number) to view trust scores:"
            session.update_state('investor_view_farmer_trust_id', user_input, current_payload) # Pass payload
            session.save() # Explicit save
        elif user_input == '2': # Proceed to Invest
            response_text = "Proceed to Invest: \n1. View Loan Requests \n2. Make a Loan Offer \n0. Back"
            session.update_state('investor_invest_menu', user_input, current_payload) # Pass payload
            session.save() # Explicit save
        elif user_input == '3': # Transactions
            response_text = "Investor Transactions (NOT YET IMPLEMENTED):" # Placeholder
            session.update_state('investor_transactions_menu', user_input, current_payload) # Pass payload
            session.save() # Explicit save
        elif user_input == '0': # Back to main menu
            response_text = "Welcome to FarmCred. Are you a: \n1. Farmer \n2. Investor \n4. Buyer" # Updated options
            session.update_state('user_type_selection', user_input)
            session.save() # Explicit save
        else:
            response_text = "Invalid choice. Please choose from 1-3 or 0 to go back."
            session.update_state('investor_main_menu', user_input, current_payload) # Stay in current state
            session.save() # Explicit save

    elif session.current_menu_state == 'investor_view_farmer_trust_id':
        logged_in_user_id = session.data_payload.get('logged_in_user_id')
        investor_account = Account.objects.get(id=logged_in_user_id)
        current_payload = session.data_payload.copy() # Copy current payload to carry forward

        try:
            farmer_id = int(user_input)
            target_farmer_account = Account.objects.filter(id=farmer_id, role='farmer').first()
            
            if target_farmer_account:
                # Create PendingConfirmation for trust view consent
                confirmation_id = generate_confirmation_id()
                expires_at = timezone.now() + datetime.timedelta(minutes=30) # Farmer has 30 mins to respond
                PendingConfirmation.objects.create(
                    confirmation_id=confirmation_id,
                    initiator_account=investor_account, # Investor is the initiator
                    target_account=target_farmer_account, # Farmer is the target
                    request_type=PendingConfirmation.TYPE_TRUST_VIEW_REQUEST, # Changed from TYPE_TRUST_VIEW_CONSENT
                    expires_at=expires_at
                )
                _send_sms(target_farmer_account.phone_number, 
                          f"Investor {investor_account.full_name} (ID: {investor_account.id}) wants to view your profile. Enter this code in USSD: {confirmation_id}. Reply 1 to Allow / 2 to Deny.")
                
                response_text = f"Request sent to Farmer {target_farmer_account.full_name} (ID: {target_farmer_account.id}).\nWaiting for their confirmation (code: {confirmation_id}).\n0. Back"
                session.update_state('investor_waiting_for_consent', user_input, current_payload) # New state for waiting
                session.save() # Explicit save
            else:
                response_text = "Farmer not found or invalid ID. Please try again:"
                session.update_state('investor_view_farmer_trust_id', user_input, current_payload) # Stay in this state
                session.save() # Explicit save
        except ValueError:
            response_text = "Invalid Farmer ID. Please enter a number."
            session.update_state('investor_view_farmer_trust_id', user_input, current_payload) # Stay in this state
            session.save() # Explicit save
        except Exception as e:
            print(f"DEBUG VIEWS: Error in investor_view_farmer_trust_id: {e}")
            response_text = "An error occurred. Please try again."
            session_status = "END"
            session.end_session()
            session.save() # Explicit save

    elif session.current_menu_state == 'investor_waiting_for_consent':
        # This state is primarily for the investor to wait.
        # If they enter '0' they go back to the investor menu.
        if user_input == '0':
            response_text = "Investor Menu: \n1. View Farmer Trust \n2. Proceed to Invest \n3. Transactions \n00. Main Menu"
            session.update_state('investor_main_menu', user_input)
            session.save() # Explicit save
        else:
            # If they enter anything else, assume they are still waiting or trying to re-enter a code
            # We don't want to process arbitrary input here.
            response_text = "Still waiting for farmer's confirmation. Press 0 to go back to Investor Menu."
            session.update_state('investor_waiting_for_consent', user_input) # Stay in this state
            session.save() # Explicit save


    elif session.current_menu_state == 'investor_invest_menu':
        logged_in_user_id = session.data_payload.get('logged_in_user_id')
        current_payload = session.data_payload.copy() # Copy current payload to carry forward

        if user_input == '1': # View Loan Requests (from farmers)
            # Fetch active loan requests that are NOT from FarmCred itself
            loan_requests = Loan.objects.filter(status='pending', lender__isnull=True).order_by('-date_taken')[:5] # Assuming 'pending' status for requests
            
            if loan_requests.exists():
                loan_list = "Available Loan Requests:\n"
                for i, loan in enumerate(loan_requests):
                    loan_list += f"{i+1}. Farmer ID: {loan.farmer.id}, Amount: GHS {loan.amount:.2f}, Due: {loan.due_date}\n"
                response_text = f"{loan_list}Reply with loan number to view details, or 0 to go back."
                current_payload['loan_requests_list'] = [loan.id for loan in loan_requests] # Store IDs for next step
                session.update_state('investor_view_loan_requests_select', user_input, current_payload) # Pass payload
                session.save() # Explicit save
            else:
                response_text = "No pending loan requests at this time.\n0. Back"
                session.update_state('investor_invest_menu', user_input, current_payload) # Stay in this menu
                session.save() # Explicit save
        elif user_input == '2': # Make a Loan Offer
            response_text = "Enter Farmer ID to make an offer:"
            session.update_state('investor_make_loan_offer_farmer_id', user_input, current_payload) # Pass payload
            session.save() # Explicit save
        elif user_input == '0': # Back
            response_text = "Investor Menu: \n1. View Farmer Trust \n2. Proceed to Invest \n3. Transactions \n00. Main Menu"
            session.update_state('investor_main_menu', user_input, current_payload) # Pass payload
            session.save() # Explicit save
        else:
            response_text = "Invalid choice. Please choose 1, 2 or 0 to go back."
            session.update_state('investor_invest_menu', user_input, current_payload) # Stay in this menu
            session.save() # Explicit save

    elif session.current_menu_state == 'investor_make_loan_offer_farmer_id':
        logged_in_user_id = session.data_payload.get('logged_in_user_id')
        current_payload = session.data_payload.copy() # Copy current payload to carry forward
        try:
            farmer_id = int(user_input)
            target_farmer_account = Account.objects.filter(id=farmer_id, role='farmer').first()
            if target_farmer_account:
                current_payload['target_farmer_id'] = target_farmer_account.id
                response_text = f"Enter loan amount for {target_farmer_account.full_name} (e.g., 1000.00):"
                session.update_state('investor_make_loan_offer_amount', user_input, current_payload) # Pass payload
                session.save() # Explicit save
            else:
                response_text = "Farmer not found or invalid ID. Please try again:"
                session.update_state('investor_make_loan_offer_farmer_id', user_input, current_payload) # Stay in this state
                session.save() # Explicit save
        except ValueError:
            response_text = "Invalid Farmer ID. Please enter a number."
            session.update_state('investor_make_loan_offer_farmer_id', user_input, current_payload) # Stay in this state
            session.save() # Explicit save

    elif session.current_menu_state == 'investor_make_loan_offer_amount':
        current_payload = session.data_payload.copy() # Copy current payload to carry forward
        try:
            amount = Decimal(user_input)
            if amount <= 0:
                response_text = "Amount must be a positive number. Please re-enter:"
                session.update_state('investor_make_loan_offer_amount', user_input, current_payload) # Stay in this state
                session.save() # Explicit save
            else:
                current_payload['loan_amount'] = float(amount) # Store as float
                response_text = "Enter interest rate (e.g., 10.0 for 10%):"
                session.update_state('investor_make_loan_offer_interest', user_input, current_payload) # Pass payload
                session.save() # Explicit save
        except ValueError:
            response_text = "Invalid amount. Please enter a number (e.g., 1000.00):"
            session.update_state('investor_make_loan_offer_amount', user_input, current_payload) # Stay in this state
            session.save() # Explicit save

    elif session.current_menu_state == 'investor_make_loan_offer_interest':
        current_payload = session.data_payload.copy() # Copy current payload to carry forward
        try:
            interest = Decimal(user_input)
            if not (0 <= interest <= 100): # Basic validation for percentage
                response_text = "Interest rate must be between 0 and 100. Please re-enter:"
                session.update_state('investor_make_loan_offer_interest', user_input, current_payload) # Stay in this state
                session.save() # Explicit save
            else:
                current_payload['loan_interest'] = float(interest) # Store as float
                response_text = "Enter repayment period in months (e.g., 3, 6, 12):"
                session.update_state('investor_make_loan_offer_repayment_months', user_input, current_payload) # Pass payload
                session.save() # Explicit save
        except ValueError:
            response_text = "Invalid interest rate. Please enter a number (e.g., 10.0):"
            session.update_state('investor_make_loan_offer_interest', user_input, current_payload) # Stay in this state
            session.save() # Explicit save

    elif session.current_menu_state == 'investor_make_loan_offer_repayment_months':
        current_payload = session.data_payload.copy() # Copy current payload to carry forward
        try:
            repayment_months = int(user_input)
            if repayment_months <= 0:
                response_text = "Repayment period must be a positive number of months. Please re-enter:"
                session.update_state('investor_make_loan_offer_repayment_months', user_input, current_payload) # Stay in this state
                session.save() # Explicit save
            else:
                current_payload['repayment_months'] = repayment_months
                response_text = "Enter preferred payment method (e.g., Mobile Money, Bank Transfer):"
                session.update_state('investor_make_loan_offer_payment_method', user_input, current_payload) # Pass payload
                session.save() # Explicit save
        except ValueError:
            response_text = "Invalid repayment period. Please enter a whole number of months."
            session.update_state('investor_make_loan_offer_repayment_months', user_input, current_payload) # Stay in this state
            session.save() # Explicit save

    elif session.current_menu_state == 'investor_make_loan_offer_payment_method':
        logged_in_user_id = session.data_payload.get('logged_in_user_id')
        investor_account = Account.objects.get(id=logged_in_user_id)
        current_payload = session.data_payload.copy() # Copy current payload to carry forward

        target_farmer_id = session.data_payload.get('target_farmer_id')
        target_farmer_account = Account.objects.get(id=target_farmer_id)
        
        loan_amount = Decimal(str(session.data_payload.get('loan_amount'))) # Convert back to Decimal
        loan_interest = Decimal(str(session.data_payload.get('loan_interest'))) # Convert back to Decimal
        repayment_months = session.data_payload.get('repayment_months')
        payment_method = user_input

        # Create PendingConfirmation for the loan offer
        confirmation_id = generate_confirmation_id()
        expires_at = timezone.now() + datetime.timedelta(minutes=30) # Farmer has 30 mins to respond
        PendingConfirmation.objects.create(
            confirmation_id=confirmation_id,
            initiator_account=investor_account, # Investor is the initiator
            target_account=target_farmer_account, # Farmer is the target
            request_type=PendingConfirmation.TYPE_LOAN_OFFER,
            data_context={
                'amount': float(loan_amount), # Store as float for payload
                'interest': float(loan_interest), # Store as float for payload
                'repayment_months': repayment_months,
                'payment_method': payment_method,
                'investor_id': investor_account.id # Include investor ID in context
            },
            expires_at=expires_at
        )
        _send_sms(target_farmer_account.phone_number, 
                  f"Investor {investor_account.full_name} (ID: {investor_account.id}) has a loan offer for you: GHS {loan_amount:.2f} at {loan_interest:.1f}% over {repayment_months} months. Enter this code in USSD: {confirmation_id}. Reply 1 to ACCEPT / 2 to REJECT.")
        
        response_text = f"Loan offer sent to Farmer {target_farmer_account.full_name} (code: {confirmation_id})."
        session_status = "END"
        session.end_session()
        session.save() # Explicit save

    # --- BUYER MAIN MENU (NEW) ---
    elif session.current_menu_state == 'buyer_main_menu':
        logged_in_user_id = session.data_payload.get('logged_in_user_id')
        print(f"DEBUG VIEWS: Buyer Main Menu. logged_in_user_id: {logged_in_user_id}, payload: {session.data_payload}")
        if not logged_in_user_id:
            response_text = "Your session is invalid. Please start again from Main Menu."
            session_status = "END"
            session.end_session()
            session.save() # Explicit save
            return Response(f"END {response_text}", content_type='text/plain')

        current_payload = session.data_payload.copy() # Copy current payload to carry forward

        if user_input == '1': # Record Produce Purchase
            response_text = "Enter Farmer ID for the purchase:"
            session.update_state('buyer_record_purchase_farmer_id', user_input, current_payload) # Pass payload
            session.save() # Explicit save
        elif user_input == '0': # Back to main menu
            response_text = "Welcome to FarmCred. Are you a: \n1. Farmer \n2. Investor \n4. Buyer" # Updated options
            session.update_state('user_type_selection', user_input)
            session.save() # Explicit save
        else:
            response_text = "Invalid choice. Please choose 1 or 0 to go back."
            session.update_state('buyer_main_menu', user_input, current_payload) # Stay in current state
            session.save() # Explicit save

    elif session.current_menu_state == 'buyer_record_purchase_farmer_id':
        logged_in_user_id = session.data_payload.get('logged_in_user_id')
        buyer_account = Account.objects.get(id=logged_in_user_id)
        current_payload = session.data_payload.copy() # Copy current payload to carry forward

        try:
            farmer_id = int(user_input)
            target_farmer_account = Account.objects.filter(id=farmer_id, role='farmer').first()
            
            if target_farmer_account and hasattr(target_farmer_account, 'farmer_profile'):
                farmer_profile = target_farmer_account.farmer_profile
                if farmer_profile.produce:
                    products_list = farmer_profile.produce
                    current_payload['target_farmer_id'] = target_farmer_account.id
                    current_payload['farmer_produce'] = products_list # Store farmer's products
                    product_options = "\n".join([f"{i+1}. {p}" for i, p in enumerate(products_list)])
                    response_text = f"Select product from {farmer_profile.full_name}:\n{product_options}\n0. Back"
                    session.update_state('buyer_select_product', user_input, current_payload) # Pass payload
                    session.save() # Explicit save
                else:
                    response_text = "This farmer has no products listed.\n0. Back"
                    session.update_state('buyer_main_menu', user_input, current_payload) # Go back to buyer menu
                    session.save() # Explicit save
            else:
                response_text = "Farmer not found or invalid ID. Please try again:"
                session.update_state('buyer_record_purchase_farmer_id', user_input, current_payload) # Stay in this state
                session.save() # Explicit save
        except ValueError:
            response_text = "Invalid Farmer ID. Please enter a number."
            session.update_state('buyer_record_purchase_farmer_id', user_input, current_payload) # Stay in this state
            session.save() # Explicit save

    elif session.current_menu_state == 'buyer_select_product':
        current_payload = session.data_payload.copy() # Copy current payload to carry forward
        products_list = session.data_payload.get('farmer_produce', [])

        if user_input == '0': # Back
            response_text = "Enter Farmer ID for the purchase:"
            session.update_state('buyer_record_purchase_farmer_id', user_input, current_payload) # Go back to farmer ID entry
            session.save() # Explicit save
        else:
            try:
                selected_index = int(user_input) - 1
                if 0 <= selected_index < len(products_list):
                    selected_product_str = products_list[selected_index]
                    product_parts = selected_product_str.split('@')
                    product_name = product_parts[0]
                    product_price = Decimal(product_parts[1])

                    current_payload['selected_product_str'] = selected_product_str
                    current_payload['selected_product_name'] = product_name
                    current_payload['selected_product_price'] = float(product_price) # Store as float
                    response_text = f"Enter quantity for '{product_name}' (e.g., 10):"
                    session.update_state('buyer_enter_quantity', user_input, current_payload) # Go to quantity entry
                    session.save() # Explicit save
                else:
                    response_text = "Invalid selection. Please choose a number from the list or 0 to go back."
                    session.update_state('buyer_select_product', user_input, current_payload) # Stay in this state
                    session.save() # Explicit save
            except ValueError:
                response_text = "Invalid input. Please enter a number."
                session.update_state('buyer_select_product', user_input, current_payload) # Stay in this state
                session.save() # Explicit save

    elif session.current_menu_state == 'buyer_enter_quantity':
        current_payload = session.data_payload.copy() # Copy current payload to carry forward
        selected_product_name = session.data_payload.get('selected_product_name')
        selected_product_price = Decimal(str(session.data_payload.get('selected_product_price'))) # Convert back to Decimal

        try:
            quantity = Decimal(user_input)
            if quantity <= 0:
                response_text = "Quantity must be a positive number. Please re-enter:"
                session.update_state('buyer_enter_quantity', user_input, current_payload) # Stay in this state
                session.save() # Explicit save
            else:
                total_amount = quantity * selected_product_price
                current_payload['purchase_quantity'] = float(quantity) # Store as float
                current_payload['total_purchase_amount'] = float(total_amount) # Store as float
                
                # Format quantity for display (remove .0 if it's a whole number)
                qty_display = int(quantity) if quantity == int(quantity) else quantity

                response_text = (
                    f"Purchase Summary:\n"
                    f"Product: {selected_product_name}\n"
                    f"Quantity: {qty_display}\n"
                    f"Total: GHS {total_amount:.2f}\n"
                    f"1. Confirm Purchase\n"
                    f"0. Back"
                )
                session.update_state('buyer_confirm_purchase', user_input, current_payload) # Go to confirmation
                session.save() # Explicit save
        except ValueError:
            response_text = "Invalid quantity. Please enter a number (e.g., 10):"
            session.update_state('buyer_enter_quantity', user_input, current_payload) # Stay in this state
            session.save() # Explicit save

    elif session.current_menu_state == 'buyer_confirm_purchase':
        logged_in_user_id = session.data_payload.get('logged_in_user_id')
        buyer_account = Account.objects.get(id=logged_in_user_id)
        current_payload = session.data_payload.copy() # Copy current payload to carry forward

        if user_input == '1': # Confirm Purchase
            target_farmer_id = session.data_payload.get('target_farmer_id')
            target_farmer_account = Account.objects.get(id=target_farmer_id)
            
            product_name = session.data_payload.get('selected_product_name')
            quantity = session.data_payload.get('purchase_quantity')
            total_amount = Decimal(str(session.data_payload.get('total_purchase_amount'))) # Convert back to Decimal

            # Create PendingConfirmation for produce purchase
            confirmation_id = generate_confirmation_id()
            expires_at = timezone.now() + datetime.timedelta(minutes=30) # Farmer has 30 mins to confirm
            PendingConfirmation.objects.create(
                confirmation_id=confirmation_id,
                initiator_account=buyer_account, # Buyer is the initiator
                target_account=target_farmer_account, # Farmer is the target
                request_type=PendingConfirmation.TYPE_PRODUCE_PURCHASE_CONFIRM,
                data_context={
                    'product_name': product_name,
                    'quantity': float(quantity), # Store as float for payload
                    'total_amount': float(total_amount), # Store as float for payload
                    'buyer_id': buyer_account.id,
                    'buyer_name': buyer_account.full_name
                },
                expires_at=expires_at
            )
            # Format quantity for display in SMS (remove .0 if it's a whole number)
            qty_display = int(quantity) if quantity == int(quantity) else quantity

            _send_sms(target_farmer_account.phone_number, 
                      f"Buyer {buyer_account.full_name} (ID: {buyer_account.id}) is confirming purchase of {product_name} (Qty: {qty_display}) for GHS {total_amount:.2f}.\n"
                      f"Confirm payment received. Enter this code in USSD: {confirmation_id}. Reply 1 to CONFIRM / 2 to DENY.")
            
            response_text = f"Purchase request sent to Farmer {target_farmer_account.full_name}. Waiting for their confirmation (code: {confirmation_id})."
            session_status = "END"
            session.end_session()
            session.save() # Explicit save

        elif user_input == '0': # Back
            response_text = (
                f"Enter quantity for '{session.data_payload.get('selected_product_name')}' (e.g., 10):"
            )
            session.update_state('buyer_enter_quantity', user_input, current_payload)
            session.save() # Explicit save
        else:
            response_text = "Invalid choice. 1 to Confirm, 0 to Back."
            session.update_state('buyer_confirm_purchase', user_input, current_payload)
            session.save() # Explicit save


    # --- Fallback/Error Handling ---
    else:
        # If the state is unrecognized, or session is somehow corrupted
        response_text = "An error occurred or your session expired. Please dial *800# to restart."
        session_status = "END"
        session.end_session()
        session.save() # Explicit save


    # Final response to USSD gateway
    return Response(f"{session_status} {response_text}", content_type='text/plain')

