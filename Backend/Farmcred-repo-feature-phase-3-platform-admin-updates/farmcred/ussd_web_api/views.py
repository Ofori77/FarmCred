# ussd_web_api/views.py

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.db import transaction as db_transaction
from django.utils import timezone
import datetime
import random
import string
import re
from decimal import Decimal # Import Decimal for calculations
import logging # Import logging

logger = logging.getLogger(__name__) # Get a logger instance

# Import models
from account.models import Account
# Import models AND constants from core.models
from core.models import (
    FarmerProfile, InvestorProfile, Loan, Transaction, BuyerProfile,
    MIN_TRUST_LEVEL_STARS_FOR_LOAN, MIN_TRUST_SCORE_PERCENT_FOR_LOAN, FARMCRED_DEFAULT_INTEREST_RATE
)
# FIX: Import PendingConfirmation from ussd.models (where TYPE_ constants are defined)
from ussd.models import PendingConfirmation

# Import serializers
from .serializers import (
    UssdWebLoginSerializer,
    ConfirmationRequestSerializer, ConfirmationActionSerializer,
    FarmerProductSerializer, AddUpdateProductRequestSerializer, RemoveProductRequestSerializer, ShareStatsLogsSerializer,
    InitiateLoanOfferSerializer, InitiateProducePurchaseSerializer, InitiateTrustViewSerializer, InitiateLoanRepaymentConfirmationSerializer,
    LoanRequestAmountSerializer # Now imported from serializers.py
)

# Import permissions
from .permissions import IsFarmer, IsInvestor, IsBuyer, IsAdmin

# Import core serializers for nested data where needed
from core.serializers import (
    FarmerProfileOverviewSerializer,
    FarmerTrustBreakdownSerializer,
    TransactionSerializer,
    LoanSerializer,
    FarmerListSerializer,
)

# --- Helper function for sending SMS (Placeholder from ussd/views.py) ---
def _send_sms(phone_number, message):
    """
    Placeholder function for sending SMS via Hubtel or another SMS gateway.
    In a real implementation, you would use Hubtel's API here.
    """
    logger.info(f"--- SMS Placeholder: Sending '{message}' to {phone_number} ---")
    # In a real system, you'd integrate with an SMS API here.
    # For now, we simulate success.
    return True 

# --- Helper function for generating confirmation IDs (from ussd/views.py) ---
def generate_confirmation_id():
    """Generates a unique 6-digit numeric confirmation ID."""
    return ''.join(random.choices(string.digits, k=6))

# --- Helper to get Platform Lender Account ---
def get_platform_lender_account():
    """Retrieves or creates the FarmCred Platform Lender account."""
    # This assumes a single, designated 'platform_lender' account.
    # In a production system, this might be configured more robustly.
    platform_lender, created = Account.objects.get_or_create(
        email="platform@farmcred.com",
        defaults={
            'phone_number': '233501234567', # Example phone number for platform
            'full_name': 'FarmCred Platform',
            'role': 'platform_lender',
            'is_active': True,
            'is_staff': True, # Mark as staff if it's an internal system account
            'is_superuser': False,
        }
    )
    if created:
        platform_lender.set_password(Account.objects.make_random_password()) # Set a random password
        platform_lender.save()
        logger.info(f"Created FarmCred Platform Lender account: {platform_lender.email}")
    return platform_lender


# --- Authentication & Registration Endpoints ---

@api_view(['POST'])
@permission_classes([AllowAny])
def ussd_web_login(request):
    """
    POST /api/ussd-web/login/
    Allows users to log in using their phone number and USSD PIN.
    Returns JWT tokens upon successful authentication.
    """
    serializer = UssdWebLoginSerializer(data=request.data)
    if serializer.is_valid():
        account = serializer.validated_data['account']
        
        # Generate JWT tokens for the authenticated account
        refresh = RefreshToken.for_user(account)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user_id': account.id,
            'email': account.email,
            'phone_number': account.phone_number,
            'role': account.role,
            'full_name': account.full_name
        }, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_roles(request):
    """
    GET /api/ussd-web/user-roles/
    Returns a list of all available user roles.
    Useful for frontend dropdowns during registration/selection.
    """
    roles = [choice[0] for choice in Account.ROLE_CHOICES]
    return Response(roles, status=status.HTTP_200_OK)


# --- Farmer Endpoints (USSD-specific interactions) ---

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsFarmer])
def farmer_products(request):
    """
    GET /api/ussd-web/farmer/products/
    Lists all products for the authenticated farmer.

    POST /api/ussd-web/farmer/products/
    Adds a new product for the authenticated farmer.
    """
    farmer_account = request.user
    try:
        farmer_profile = farmer_account.farmer_profile
    except FarmerProfile.DoesNotExist:
        return Response({'detail': 'Farmer profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        products_data = []
        for p_str in farmer_profile.produce:
            try:
                name, price_str = p_str.split('@')
                products_data.append({'name': name, 'price': Decimal(price_str)})
            except ValueError:
                products_data.append({'name': p_str, 'price': None}) # Handle malformed entries
        
        serializer = FarmerProductSerializer(products_data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        serializer = AddUpdateProductRequestSerializer(data=request.data)
        if serializer.is_valid():
            product_name = serializer.validated_data['product_name']
            product_price = serializer.validated_data['product_price']

            new_produce_entry = f"{product_name}@{product_price:.2f}"
            
            # Check for existing product name (case-insensitive)
            existing_product_names = [p.split('@')[0].lower() for p in farmer_profile.produce if '@' in p]
            if product_name.lower() in existing_product_names:
                return Response({'detail': f"Product '{product_name}' already exists."}, status=status.HTTP_400_BAD_REQUEST)

            farmer_profile.produce.append(new_produce_entry)
            farmer_profile.save(update_fields=['produce'])
            return Response({'message': f"Product '{product_name}' added successfully!"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsFarmer])
def farmer_update_product_price(request):
    """
    PATCH /api/ussd-web/farmer/products/update-price/
    Updates the price of an existing product for the authenticated farmer.
    Requires 'product_name' and 'product_price'.
    """
    farmer_account = request.user
    try:
        farmer_profile = farmer_account.farmer_profile
    except FarmerProfile.DoesNotExist:
        return Response({'detail': 'Farmer profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = AddUpdateProductRequestSerializer(data=request.data)
    if serializer.is_valid():
        product_name_to_update = serializer.validated_data['product_name']
        new_price = serializer.validated_data['product_price']

        updated = False
        for i, p_str in enumerate(farmer_profile.produce):
            if '@' in p_str:
                name, _ = p_str.split('@')
                if name.lower() == product_name_to_update.lower():
                    farmer_profile.produce[i] = f"{name}@{new_price:.2f}"
                    updated = True
                    break
        
        if updated:
            farmer_profile.save(update_fields=['produce'])
            return Response({'message': f"Price for '{product_name_to_update}' updated to {new_price:.2f}!"}, status=status.HTTP_200_OK)
        else:
            return Response({'detail': f"Product '{product_name_to_update}' not found in your list."}, status=status.HTTP_404_NOT_FOUND)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsFarmer])
def farmer_remove_product(request):
    """
    DELETE /api/ussd-web/farmer/products/remove/
    Removes a product from the authenticated farmer's list.
    Requires 'product_name' in the request body.
    """
    farmer_account = request.user
    try:
        farmer_profile = farmer_account.farmer_profile
    except FarmerProfile.DoesNotExist:
        return Response({'detail': 'Farmer profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = RemoveProductRequestSerializer(data=request.data)
    if serializer.is_valid():
        product_name_to_remove = serializer.validated_data['product_name']

        original_produce_len = len(farmer_profile.produce)
        # Filter out the product to remove (case-insensitive)
        farmer_profile.produce = [
            p_str for p_str in farmer_profile.produce
            if not (p_str.split('@')[0].lower() == product_name_to_remove.lower() if '@' in p_str else p_str.lower() == product_name_to_remove.lower())
        ]
        
        if len(farmer_profile.produce) < original_produce_len:
            farmer_profile.save(update_fields=['produce'])
            return Response({'message': f"Product '{product_name_to_remove}' removed successfully!"}, status=status.HTTP_200_OK)
        else:
            return Response({'detail': f"Product '{product_name_to_remove}' not found in your list."}, status=status.HTTP_404_NOT_FOUND)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'POST']) # Added GET for qualification info
@permission_classes([IsAuthenticated, IsFarmer])
def farmer_request_loan(request):
    """
    GET /api/ussd-web/farmer/request-loan/
    Returns qualification information (max amount) for a loan.

    POST /api/ussd-web/farmer/request-loan/
    Allows a farmer to request a loan directly from the FarmCred platform.
    This mirrors the USSD loan request flow, including qualification checks.
    """
    farmer_account = request.user
    try:
        farmer_profile = farmer_account.farmer_profile
    except FarmerProfile.DoesNotExist:
        return Response({'detail': 'Farmer profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Get active loans for the farmer
    active_loans_count = Loan.objects.filter(farmer=farmer_account, status='active').count()

    # Define thresholds for a second loan
    SECOND_LOAN_MIN_TRUST_STARS = Decimal('4.5')
    SECOND_LOAN_MIN_TRUST_SCORE = Decimal('90.00')

    # 1. Check for active loans based on new logic
    if active_loans_count >= 2:
        return Response(
            {'detail': 'You currently have two or more active loans. Please settle existing loans before requesting a new one.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    elif active_loans_count == 1:
        # If one active loan, check for high trust to allow a second
        if (farmer_profile.trust_level_stars < SECOND_LOAN_MIN_TRUST_STARS or
                farmer_profile.trust_score_percent < SECOND_LOAN_MIN_TRUST_SCORE):
            return Response(
                {'detail': f"You currently have one active loan. To request a second loan, you need a Trust Level of {SECOND_LOAN_MIN_TRUST_STARS:.1f} Stars and a Trust Score of {SECOND_LOAN_MIN_TRUST_SCORE:.2f}%. Yours: {farmer_profile.trust_level_stars:.1f} Stars & {farmer_profile.trust_score_percent:.2f}%."},
                status=status.HTTP_400_BAD_REQUEST
            )
        # If they have one loan and meet high trust criteria, they can proceed to request another.
        # The qualification message/logic below will then apply for the *second* loan.
    elif active_loans_count == 0:
        # If no active loans, apply standard trust criteria for the first loan
        if (farmer_profile.trust_level_stars < MIN_TRUST_LEVEL_STARS_FOR_LOAN or
                farmer_profile.trust_score_percent < MIN_TRUST_SCORE_PERCENT_FOR_LOAN):
            return Response(
                {'detail': f"You do not meet the minimum trust criteria for a loan. Required: {MIN_TRUST_LEVEL_STARS_FOR_LOAN:.1f} Stars & {MIN_TRUST_SCORE_PERCENT_FOR_LOAN:.2f}%. Yours: {farmer_profile.trust_level_stars:.1f} Stars & {farmer_profile.trust_score_percent:.2f}%."},
                status=status.HTTP_400_BAD_REQUEST
            )

    # If GET request, return qualification info
    if request.method == 'GET':
        max_qualified_amount = farmer_profile.get_max_qualified_loan_amount()
        message_prefix = ""
        if active_loans_count == 1:
            message_prefix = "You currently have one active loan. "
        
        return Response({
            'message': f"{message_prefix}Based on your Trust Level ({farmer_profile.trust_level_stars:.1f} Stars) and Score ({farmer_profile.trust_score_percent:.2f}%), you qualify for a loan up to GHS {max_qualified_amount:.2f}.",
            'max_qualified_amount': max_qualified_amount,
            'default_interest_rate': float(FARMCRED_DEFAULT_INTEREST_RATE)
        }, status=status.HTTP_200_OK)


    # If POST request, process the loan request
    elif request.method == 'POST':
        serializer = LoanRequestAmountSerializer(data=request.data) # Use the serializer from serializers.py
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        requested_amount = serializer.validated_data['amount']
        max_qualified_amount = farmer_profile.get_max_qualified_loan_amount()

        if requested_amount > max_qualified_amount:
            return Response(
                {'detail': f"Desired amount exceeds your qualified limit of GHS {max_qualified_amount:.2f}. Please request an amount within your limit."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Determine repayment period based on on-time repayment ratio
        on_time_ratio = farmer_profile.on_time_repayment_ratio()
        repayment_period_months = 1 # Default
        if on_time_ratio >= Decimal('0.90'): # 90% or more on-time
            repayment_period_months = 6
        elif on_time_ratio >= Decimal('0.60'): # 60-89% on-time
            repayment_period_months = 3
        
        platform_lender = get_platform_lender_account()

        try:
            with db_transaction.atomic():
                # Create the loan
                loan = Loan.objects.create(
                    farmer=farmer_account,
                    lender=platform_lender,
                    amount=requested_amount,
                    date_taken=timezone.localdate(),
                    due_date=timezone.localdate() + datetime.timedelta(days=repayment_period_months * 30), # Approximate
                    status='active',
                    interest_rate=FARMCRED_DEFAULT_INTEREST_RATE,
                    repayment_period_months=repayment_period_months,
                    on_time=False # Default, will be updated on repayment
                )

                # Record transaction for farmer (income)
                Transaction.objects.create(
                    account_party=farmer_account,
                    name=f"Loan Disbursement (Loan ID: {loan.id})",
                    date=timezone.localdate(), # CORRECTED: Use timezone.localdate()
                    amount=requested_amount,
                    category='loan_disbursement',
                    status='income'
                )
                # Record transaction for platform lender (expense)
                Transaction.objects.create(
                    account_party=platform_lender,
                    name=f"Loan Disbursement to Farmer {farmer_account.full_name} (Loan ID: {loan.id})",
                    date=timezone.localdate(), # CORRECTED: Use timezone.localdate()
                    amount=requested_amount,
                    category='loan_disbursement',
                    status='expense'
                )

            return Response(
                {'message': f"Your loan request for GHS {requested_amount:.2f} has been approved and will be disbursed shortly. Loan ID: {loan.id}",
                 'loan_id': loan.id,
                 'repayment_period_months': repayment_period_months,
                 'interest_rate': float(FARMCRED_DEFAULT_INTEREST_RATE)},
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            logger.error(f"Error processing loan request: {e}", exc_info=True) # Log exception details
            return Response({'detail': 'An error occurred while processing your loan request. Please try again later.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({'detail': 'Invalid request method.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsFarmer])
def farmer_initiate_loan_repayment_confirmation(request):
    """
    POST /api/ussd-web/farmer/initiate-loan-repayment-confirmation/
    Allows a farmer to initiate a loan repayment confirmation for a specific loan.
    This creates a PendingConfirmation for the lender.
    """
    farmer_account = request.user
    serializer = InitiateLoanRepaymentConfirmationSerializer(data=request.data)
    if serializer.is_valid():
        loan_id = serializer.validated_data['loan_id']
        amount_confirmed = Decimal(str(serializer.validated_data['amount_confirmed'])) # Ensure Decimal
        
        try:
            loan = Loan.objects.get(id=loan_id, farmer=farmer_account)
            
            # If the lender is the platform, no confirmation is needed via SMS.
            # The loan can be marked as repaid directly.
            if loan.lender.role == 'platform_lender':
                with db_transaction.atomic():
                    loan.status = 'repaid'
                    loan.date_repaid = timezone.localdate()
                    loan.on_time = (timezone.localdate() <= loan.due_date)
                    loan.is_active = False
                    loan.save(update_fields=['status', 'date_repaid', 'on_time', 'is_active'])

                    # Record transaction for farmer (expense)
                    Transaction.objects.create(
                        account_party=farmer_account,
                        name=f"Loan Repayment (Loan ID: {loan.id})",
                        date=timezone.localdate(),
                        amount=amount_confirmed,
                        category='loan_repayment',
                        status='expense'
                    )
                    # Record transaction for platform lender (income)
                    Transaction.objects.create(
                        account_party=loan.lender,
                        name=f"Loan Repayment Received from Farmer {farmer_account.full_name} (Loan ID: {loan.id})",
                        date=timezone.localdate(),
                        amount=amount_confirmed,
                        category='loan_repayment',
                        status='income'
                    )
                return Response({'message': f"Loan {loan.id} payment confirmed by FarmCred directly."}, status=status.HTTP_200_OK)

            # If lender is an Investor, create PendingConfirmation
            confirmation_id = generate_confirmation_id()
            pending_conf = PendingConfirmation.objects.create(
                confirmation_id=confirmation_id,
                initiator_account=farmer_account,
                target_account=loan.lender,
                request_type=PendingConfirmation.TYPE_LOAN_REPAYMENT_CONFIRM,
                expires_at=timezone.now() + datetime.timedelta(minutes=5), # 5 minutes for confirmation
                data_context={
                    'loan_id': loan.id,
                    'amount_received': float(amount_confirmed),
                    'farmer_id': farmer_account.id
                }
            )

            if loan.lender.phone_number:
                confirmation_message = (
                    f"Farmer {farmer_account.full_name} (ID: {farmer_account.id}) is confirming payment of GHS {amount_confirmed:.2f} for Loan {loan.id}.\n"
                    f"Enter this code in USSD: {confirmation_id}. Reply 1 to CONFIRM RECEIPT / 2 to DENY."
                )
                _send_sms(loan.lender.phone_number, confirmation_message)

            return Response({
                'message': f"Confirmation request sent to Lender for Loan {loan.id}. Confirmation ID: {confirmation_id}",
                'confirmation_id': confirmation_id
            }, status=status.HTTP_200_OK)

        except Loan.DoesNotExist:
            return Response({'detail': 'Loan not found or does not belong to you.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error initiating loan repayment confirmation: {e}", exc_info=True) # Log exception details
            return Response({'detail': 'An error occurred while initiating repayment confirmation.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsFarmer])
def farmer_toggle_discoverability(request):
    """
    POST /api/ussd-web/farmer/toggle-discoverability/
    Allows a farmer to toggle their profile's visibility on the investor browse page.
    """
    farmer_account = request.user
    try:
        farmer_profile = farmer_account.farmer_profile
    except FarmerProfile.DoesNotExist:
        return Response({'detail': 'Farmer profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    farmer_profile.is_discoverable_by_investors = not farmer_profile.is_discoverable_by_investors
    farmer_profile.save(update_fields=['is_discoverable_by_investors'])

    status_message = "visible" if farmer_profile.is_discoverable_by_investors else "hidden"
    return Response(
        {'message': f"Your profile is now {status_message} to investors on the browse page.",
         'is_discoverable_by_investors': farmer_profile.is_discoverable_by_investors},
        status=status.HTTP_200_OK
    )

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsFarmer])
def share_stats_logs(request):
    """
    POST /api/ussd-web/farmer/share-stats-logs/
    Allows a farmer to share their stats or logs via SMS to a recipient.
    """
    farmer_account = request.user
    try:
        farmer_profile = farmer_account.farmer_profile
    except FarmerProfile.DoesNotExist:
        return Response({'detail': 'Farmer profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = ShareStatsLogsSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    recipient_phone_number = serializer.validated_data['recipient_phone_number']
    
    # Construct the message content based on farmer's stats
    # This is a simplified version; you might want to include more detailed logs/transactions
    message_content = (
        f"FarmCred Stats for {farmer_account.full_name}:\n"
        f"Trust Score: {farmer_profile.trust_score_percent:.2f}%\n"
        f"Trust Level: {farmer_profile.trust_level_stars:.1f} Stars\n"
        f"Total Income Last 12 Months: GHS {farmer_profile.total_income_last_12_months:.2f}\n"
        f"Max Qualified Loan: GHS {farmer_profile.get_max_qualified_loan_amount():.2f}"
    )

    if _send_sms(recipient_phone_number, message_content):
        return Response({'message': 'Stats/Logs sent successfully via SMS!'}, status=status.HTTP_200_OK)
    else:
        return Response({'detail': 'Failed to send SMS. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- Investor Endpoints (USSD-specific interactions) ---

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsInvestor])
def investor_browse_farmers(request):
    """
    GET /api/ussd-web/investor/farmers/
    Allows an investor to browse discoverable farmers.
    Returns a list of farmer profiles that are marked as discoverable.
    """
    # Only return farmers who have opted to be discoverable
    discoverable_farmers = FarmerProfile.objects.filter(
        is_discoverable_by_investors=True,
        account__is_active=True # Ensure the account is active
    ).select_related('account') # Select related account to avoid N+1 queries

    # Use FarmerListSerializer from core.serializers, or a custom one if specific fields are needed
    # FarmerListSerializer should include relevant summary info for investors (e.g., ID, name, region, trust levels)
    serializer = FarmerListSerializer(discoverable_farmers, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsInvestor])
def investor_initiate_loan_offer(request):
    """
    POST /api/ussd-web/investor/initiate-loan-offer/
    Allows an investor to initiate a loan offer to a farmer.
    This creates a PendingConfirmation for the farmer.
    """
    investor_account = request.user
    serializer = InitiateLoanOfferSerializer(data=request.data)
    if serializer.is_valid():
        farmer_id = serializer.validated_data['farmer_id']
        amount = Decimal(str(serializer.validated_data['amount'])) # Ensure Decimal
        interest_rate = Decimal(str(serializer.validated_data['interest_rate'])) # Ensure Decimal
        repayment_period_months = serializer.validated_data['repayment_period_months']

        try:
            farmer_account = Account.objects.get(id=farmer_id, role='farmer', is_active=True)
            
            confirmation_id = generate_confirmation_id()
            pending_conf = PendingConfirmation.objects.create(
                confirmation_id=confirmation_id,
                initiator_account=investor_account,
                target_account=farmer_account,
                request_type=PendingConfirmation.TYPE_LOAN_OFFER,
                expires_at=timezone.now() + datetime.timedelta(minutes=10), # 10 minutes for confirmation
                data_context={
                    'lender_id': investor_account.id,
                    'amount': float(amount),
                    'interest_rate': float(interest_rate),
                    'repayment_period_months': repayment_period_months,
                    'investor_name': investor_account.full_name
                }
            )

            if farmer_account.phone_number:
                offer_message = (
                    f"You have a new loan offer from {investor_account.full_name} (ID: {investor_account.id}) "
                    f"for GHS {amount:.2f} at {interest_rate:.2f}% interest over {repayment_period_months} months.\n"
                    f"Enter this code in USSD: {confirmation_id}. Reply 1 to ACCEPT / 2 to DECLINE."
                )
                _send_sms(farmer_account.phone_number, offer_message)

            return Response({
                'message': f"Loan offer initiated for Farmer {farmer_account.full_name}. Confirmation ID: {confirmation_id}",
                'confirmation_id': confirmation_id
            }, status=status.HTTP_200_OK)

        except Account.DoesNotExist:
            return Response({'detail': 'Farmer not found or is inactive.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error initiating loan offer: {e}", exc_info=True) # Log exception details
            return Response({'detail': 'An error occurred while initiating loan offer.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsInvestor])
def investor_initiate_trust_view(request):
    """
    POST /api/ussd-web/investor/initiate-trust-view/
    Allows an investor to initiate a request to view a farmer's detailed trust breakdown.
    This creates a PendingConfirmation for the farmer.
    """
    investor_account = request.user
    serializer = InitiateTrustViewSerializer(data=request.data)
    if serializer.is_valid():
        farmer_id = serializer.validated_data['farmer_id']

        try:
            farmer_account = Account.objects.get(id=farmer_id, role='farmer', is_active=True)
            
            confirmation_id = generate_confirmation_id()
            pending_conf = PendingConfirmation.objects.create(
                confirmation_id=confirmation_id,
                initiator_account=investor_account,
                target_account=farmer_account,
                request_type=PendingConfirmation.TYPE_TRUST_VIEW_REQUEST,
                expires_at=timezone.now() + datetime.timedelta(minutes=5), # 5 minutes for confirmation
                data_context={
                    'investor_id': investor_account.id,
                    'investor_name': investor_account.full_name
                }
            )

            if farmer_account.phone_number:
                request_message = (
                    f"Investor {investor_account.full_name} (ID: {investor_account.id}) "
                    f"wants to view your detailed trust information.\n"
                    f"Enter this code in USSD: {confirmation_id}. Reply 1 to ALLOW / 2 to DENY."
                )
                _send_sms(farmer_account.phone_number, request_message)

            return Response({
                'message': f"Trust view request sent to Farmer {farmer_account.full_name}. Confirmation ID: {confirmation_id}",
                'confirmation_id': confirmation_id
            }, status=status.HTTP_200_OK)

        except Account.DoesNotExist:
            return Response({'detail': 'Farmer not found or is inactive.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error initiating trust view request: {e}", exc_info=True) # Log exception details
            return Response({'detail': 'An error occurred while initiating trust view request.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsInvestor])
def investor_initiate_repayment_confirmation(request):
    """
    POST /api/ussd-web/investor/initiate-repayment-confirmation/
    Allows an investor to initiate a confirmation of loan repayment received from a farmer.
    This creates a PendingConfirmation for the farmer.
    """
    investor_account = request.user
    serializer = InitiateLoanRepaymentConfirmationSerializer(data=request.data)
    if serializer.is_valid():
        loan_id = serializer.validated_data['loan_id']
        amount_confirmed = Decimal(str(serializer.validated_data['amount_confirmed'])) # Ensure Decimal
        
        try:
            loan = Loan.objects.get(id=loan_id, lender=investor_account)
            
            confirmation_id = generate_confirmation_id()
            pending_conf = PendingConfirmation.objects.create(
                confirmation_id=confirmation_id,
                initiator_account=investor_account,
                target_account=loan.farmer,
                request_type=PendingConfirmation.TYPE_LOAN_REPAYMENT_CONFIRM,
                expires_at=timezone.now() + datetime.timedelta(minutes=5), # 5 minutes for confirmation
                data_context={
                    'loan_id': loan.id,
                    'amount_received': float(amount_confirmed),
                    'lender_id': investor_account.id
                }
            )

            if loan.farmer.phone_number:
                confirmation_message = (
                    f"Investor {investor_account.full_name} (ID: {investor_account.id}) is confirming receipt of GHS {amount_confirmed:.2f} for Loan {loan.id}.\n"
                    f"Enter this code in USSD: {confirmation_id}. Reply 1 to CONFIRM PAYMENT / 2 to DENY."
                )
                _send_sms(loan.farmer.phone_number, confirmation_message)

            return Response({
                'message': f"Confirmation request sent to Farmer for Loan {loan.id}. Confirmation ID: {confirmation_id}",
                'confirmation_id': confirmation_id
            }, status=status.HTTP_200_OK)

        except Loan.DoesNotExist:
            return Response({'detail': 'Loan not found or does not belong to you.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error initiating repayment confirmation: {e}", exc_info=True) # Log exception details
            return Response({'detail': 'An error occurred while initiating repayment confirmation.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# --- Buyer Endpoints (USSD-specific interactions) ---

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsBuyer])
def initiate_produce_purchase(request):
    """
    POST /api/ussd-web/buyer/initiate-produce-purchase/
    Allows a buyer to initiate a produce purchase from a farmer.
    This creates a PendingConfirmation for the farmer.
    """
    buyer_account = request.user
    serializer = InitiateProducePurchaseSerializer(data=request.data)
    # FIX: Return serializer errors directly if not valid
    if not serializer.is_valid():
        logger.warning(f"InitiateProducePurchaseSerializer validation failed: {serializer.errors}") # Log validation errors
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # If serializer is valid, extract validated data
    farmer_id = serializer.validated_data['farmer_id']
    product_name = serializer.validated_data['actual_product_name'] # Use actual name from validation
    quantity = serializer.validated_data['quantity']
    total_amount = serializer.validated_data['total_amount']

    try:
        farmer_account = Account.objects.get(id=farmer_id, role='farmer', is_active=True)
        
        confirmation_id = generate_confirmation_id()
        pending_conf = PendingConfirmation.objects.create(
            confirmation_id=confirmation_id,
            initiator_account=buyer_account,
            target_account=farmer_account,
            request_type=PendingConfirmation.TYPE_PRODUCE_PURCHASE_CONFIRM,
            expires_at=timezone.now() + datetime.timedelta(minutes=5), # 5 minutes for confirmation
            data_context={
                'buyer_id': buyer_account.id,
                'product_name': product_name,
                'quantity': float(quantity), # Store as float for JSONField
                'total_amount': float(total_amount), # Store as float for JSONField
                'buyer_name': buyer_account.full_name
            }
        )

        if farmer_account.phone_number:
            # Cast quantity to int for display if it's a whole number
            qty_display = int(quantity) if quantity == int(quantity) else quantity
            purchase_message = (
                f"Buyer {buyer_account.full_name} (ID: {buyer_account.id}) is confirming purchase of {product_name} (Qty: {qty_display}) for GHS {total_amount:.2f}.\n"
                f"Confirm payment received. Enter this code in USSD: {confirmation_id}. Reply 1 to CONFIRM / 2 to DENY."
            )
            _send_sms(farmer_account.phone_number, purchase_message)
        
        return Response({
            'message': f"Purchase request sent to Farmer {farmer_account.full_name}. Waiting for their confirmation. Confirmation ID: {confirmation_id}",
            'confirmation_id': confirmation_id
        }, status=status.HTTP_200_OK)

    except Account.DoesNotExist:
        return Response({'detail': 'Farmer not found or is inactive.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error initiating produce purchase: {e}", exc_info=True) # Log exception details
        return Response({'detail': 'An error occurred while initiating produce purchase.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- Pending Confirmation Management Endpoints (Cross-Role) ---

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_pending_confirmations(request):
    """
    GET /api/ussd-web/pending-confirmations/
    Lists all pending confirmation requests that target the authenticated user.
    """
    user_account = request.user
    pending_confs = PendingConfirmation.objects.filter(
        target_account=user_account,
        status=PendingConfirmation.STATUS_PENDING,
        expires_at__gte=timezone.now() # Only show non-expired confirmations
    ).order_by('-created_at')

    serializer = ConfirmationRequestSerializer(pending_confs, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_request_action(request, pk):
    """
    POST /api/ussd-web/pending-confirmations/<int:pk>/action/
    Allows the authenticated user to accept or deny a specific pending confirmation request.
    Requires 'action' ('accept' or 'deny') and optionally 'pin' in the request body.
    """
    user_account = request.user
    serializer = ConfirmationActionSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    action = serializer.validated_data['action']
    pin = serializer.validated_data.get('pin') # Optional PIN for certain actions

    try:
        pending_conf = PendingConfirmation.objects.get(
            pk=pk,
            target_account=user_account,
            status=PendingConfirmation.STATUS_PENDING,
            expires_at__gte=timezone.now()
        )
    except PendingConfirmation.DoesNotExist:
        return Response({'detail': 'Confirmation request not found, already processed, or expired.'}, status=status.HTTP_404_NOT_FOUND)

    # --- PIN Check Logic (if applicable for certain actions) ---
    # Example: If a loan repayment confirmation requires PIN from the lender
    # if pending_conf.request_type == PendingConfirmation.TYPE_LOAN_REPAYMENT_CONFIRM and user_account.role == 'investor':
    #     if not pin:
    #         return Response({'detail': 'PIN is required for this action.'}, status=status.HTTP_400_BAD_REQUEST)
    #     if not user_account.check_pin(pin):
    #         return Response({'detail': 'Invalid PIN.'}, status=status.HTTP_401_UNAUTHORIZED)
    # This logic can be expanded based on specific security requirements for each confirmation type.

    with db_transaction.atomic():
        if action == 'accept':
            pending_conf.status = PendingConfirmation.STATUS_CONFIRMED
            pending_conf.confirmed_at = timezone.now()
            pending_conf.save(update_fields=['status', 'confirmed_at'])

            # --- Perform the actual business logic based on request_type ---
            if pending_conf.request_type == PendingConfirmation.TYPE_LOAN_OFFER:
                # Farmer accepts loan offer from an Investor
                data_context = pending_conf.data_context
                lender_id = data_context.get('lender_id')
                amount = Decimal(str(data_context.get('amount')))
                interest_rate = Decimal(str(data_context.get('interest_rate', '0.0')))
                repayment_period_months = data_context.get('repayment_period_months', 3)

                try:
                    lender_account = Account.objects.get(id=lender_id)
                    loan = Loan.objects.create(
                        farmer=user_account, # The farmer is the target_account, who accepted
                        lender=lender_account,
                        amount=amount,
                        date_taken=timezone.localdate(),
                        due_date=timezone.localdate() + datetime.timedelta(days=repayment_period_months * 30), # Approximate
                        status='active',
                        interest_rate=interest_rate,
                        repayment_period_months=repayment_period_months,
                        on_time=False # Default, will be updated on repayment
                    )
                    # Record transaction for farmer (income)
                    Transaction.objects.create(
                        account_party=user_account,
                        name=f"Loan Disbursement (Loan ID: {loan.id})",
                        date=timezone.localdate(),
                        amount=amount,
                        category='loan_disbursement',
                        status='income'
                    )
                    # Record transaction for lender (expense)
                    Transaction.objects.create(
                        account_party=lender_account,
                        name=f"Loan Disbursement to Farmer {user_account.full_name} (Loan ID: {loan.id})",
                        date=timezone.localdate(),
                        amount=amount,
                        category='loan_disbursement',
                        status='expense'
                    )

                    # Notify lender (optional, via SMS or internal notification)
                    if lender_account.phone_number:
                        _send_sms(lender_account.phone_number, f"Farmer {user_account.full_name} accepted your loan offer of GHS {amount:.2f} (Loan ID: {loan.id}).")
                    return Response({'message': f'Loan offer accepted and Loan {loan.id} created successfully.'}, status=status.HTTP_200_OK)
                except Account.DoesNotExist:
                    logger.error(f"Lender account {lender_id} not found for loan offer confirmation.", exc_info=True)
                    return Response({'detail': 'Lender for this offer not found.'}, status=status.HTTP_404_NOT_FOUND)
                except Exception as e:
                    logger.error(f"Error processing accepted loan offer: {e}", exc_info=True) # Log exception details
                    return Response({'detail': f'Error processing accepted loan offer: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            elif pending_conf.request_type == PendingConfirmation.TYPE_PRODUCE_PURCHASE_CONFIRM:
                # Farmer accepts produce purchase request from a Buyer
                data_context = pending_conf.data_context
                buyer_id = data_context.get('buyer_id')
                product_name = data_context.get('product_name')
                quantity = Decimal(str(data_context.get('quantity')))
                total_amount = Decimal(str(data_context.get('total_amount')))

                try:
                    buyer_account = Account.objects.get(id=buyer_id)
                    
                    # Record transaction for farmer (income from sale)
                    # The 'farmer' field in Transaction model is for the *seller* of produce.
                    # When the account_party is the farmer, 'farmer' can be omitted or set to user_account.
                    Transaction.objects.create(
                        account_party=user_account, # The farmer is the target_account, who confirmed receipt
                        buyer=buyer_account, # Explicitly link the buyer
                        name=f"Produce Sale: {product_name} x {quantity}",
                        date=timezone.localdate(),
                        category='produce_sale',
                        status='income',
                        amount=total_amount
                    )
                    # Record transaction for buyer (expense for purchase)
                    # Here, account_party is the buyer. The Transaction model does NOT have a 'farmer' field.
                    # The link to the selling farmer is implied by the 'name' and the corresponding transaction
                    # on the farmer's side.
                    Transaction.objects.create(
                        account_party=buyer_account,
                        # REMOVED: 'farmer=user_account' as Transaction model does not have this field
                        name=f"Produce Purchase: {product_name} x {quantity} from {user_account.full_name}",
                        date=timezone.localdate(), # CORRECTED: Use timezone.localdate()
                        category='produce_purchase',
                        status='expense',
                        amount=total_amount
                    )

                    # Notify buyer
                    if buyer_account.phone_number:
                        _send_sms(buyer_account.phone_number, f"Farmer {user_account.full_name} confirmed your purchase of {quantity} {product_name} for GHS {total_amount:.2f}.")
                    return Response({'message': 'Produce purchase request accepted and transaction recorded.'}, status=status.HTTP_200_OK)
                except Account.DoesNotExist:
                    logger.error(f"Buyer account {buyer_id} not found for produce purchase confirmation.", exc_info=True)
                    return Response({'detail': 'Buyer for this purchase not found.'}, status=status.HTTP_404_NOT_FOUND)
                except Exception as e:
                    logger.error(f"Error processing accepted produce purchase: {e}", exc_info=True) # Log exception details
                    return Response({'detail': f'Error processing accepted produce purchase: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            elif pending_conf.request_type == PendingConfirmation.TYPE_TRUST_VIEW_REQUEST:
                # Farmer allows trust view to an Investor
                # No direct model change needed here, the confirmation's status is enough.
                # The core app's investor_farmer_profile_detail view would check this confirmation.
                investor_account = pending_conf.initiator_account
                if investor_account.phone_number:
                    _send_sms(investor_account.phone_number, f"Farmer {user_account.full_name} has granted your request to view their trust profile.")
                return Response({'message': 'Trust view request accepted.'}, status=status.HTTP_200_OK)

            elif pending_conf.request_type == PendingConfirmation.TYPE_LOAN_REPAYMENT_CONFIRM:
                # Lender (Investor) confirms loan repayment from a Farmer
                data_context = pending_conf.data_context
                loan_id = data_context.get('loan_id')
                amount_received = Decimal(str(data_context.get('amount_received')))
                
                try:
                    loan = Loan.objects.get(id=loan_id)

                    # Ensure the current user (target_account) is the lender of this loan
                    if loan.lender != user_account:
                        return Response({'detail': 'You are not the lender for this loan.'}, status=status.HTTP_403_FORBIDDEN)

                    # Update loan status and date_repaid
                    loan.status = 'repaid'
                    loan.date_repaid = timezone.localdate()
                    loan.on_time = (timezone.localdate() <= loan.due_date) # Set on_time based on current date vs due date
                    loan.is_active = False # Mark as inactive once repaid
                    loan.save(update_fields=['status', 'date_repaid', 'on_time', 'is_active'])

                    # Record transaction for the farmer (expense) - Initiator of this confirmation
                    farmer_account = pending_conf.initiator_account # The farmer who initiated the repayment confirmation
                    Transaction.objects.create(
                        account_party=farmer_account,
                        name=f"Loan Repayment (Loan ID: {loan.id})",
                        date=timezone.localdate(),
                        amount=amount_received,
                        category='loan_repayment',
                        status='expense'
                    )
                    # Record transaction for the lender (income) - Current user
                    Transaction.objects.create(
                        account_party=user_account,
                        name=f"Loan Repayment Received from Farmer {farmer_account.full_name} (Loan ID: {loan.id})",
                        date=timezone.localdate(),
                        amount=amount_received,
                        category='loan_repayment',
                        status='income'
                    )

                    # Notify the farmer who initiated the repayment confirmation
                    if farmer_account.phone_number:
                        _send_sms(farmer_account.phone_number, f"Your repayment for Loan {loan.id} has been confirmed by {user_account.full_name}.")

                    return Response({'message': f'Loan {loan.id} repayment confirmed and loan updated.'}, status=status.HTTP_200_OK)
                except Loan.DoesNotExist:
                    logger.error(f"Loan {loan_id} not found for repayment confirmation.", exc_info=True)
                    return Response({'detail': 'Loan not found.'}, status=status.HTTP_404_NOT_FOUND)
                except Exception as e:
                    logger.error(f"Error processing loan repayment confirmation: {e}", exc_info=True) # Log exception details
                    return Response({'detail': f'Error processing loan repayment confirmation: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            else:
                logger.warning(f"Unknown confirmation type received: {pending_conf.request_type}")
                return Response({'detail': 'Unknown confirmation type.'}, status=status.HTTP_400_BAD_REQUEST)

        elif action == 'deny':
            pending_conf.status = PendingConfirmation.STATUS_DENIED
            pending_conf.confirmed_at = timezone.now()
            pending_conf.save(update_fields=['status', 'confirmed_at'])

            # Notify initiator of denial
            if pending_conf.initiator_account.phone_number:
                _send_sms(pending_conf.initiator_account.phone_number, f"Your request (ID: {pending_conf.confirmation_id}) was denied by {user_account.full_name}.")
            
            return Response({'message': 'Confirmation request denied.'}, status=status.HTTP_200_OK)

    return Response({'detail': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_confirmation_status(request, pk):
    """
    GET /api/ussd-web/pending-confirmations/<int:pk>/status/
    Retrieves the current status of a specific pending confirmation request.
    Useful for frontend polling.
    """
    user_account = request.user
    try:
        pending_conf = PendingConfirmation.objects.get(pk=pk)
        # Ensure the user is either the initiator or the target of the confirmation
        if not (pending_conf.initiator_account == user_account or pending_conf.target_account == user_account):
            return Response({'detail': 'You are not authorized to view this confirmation.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = ConfirmationRequestSerializer(pending_conf)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except PendingConfirmation.DoesNotExist:
        return Response({'detail': 'Confirmation request not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error retrieving confirmation status: {e}", exc_info=True) # Log exception details
        return Response({'detail': 'An error occurred while retrieving confirmation status.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

