from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction as db_transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from decimal import Decimal
import logging
import uuid
from django.db.models import Q
from django.db.utils import IntegrityError # NEW: Import IntegrityError
from django.http import Http404
# Import models
from account.models import Account
from marketplace.models import ProduceListing
from core.models import Transaction
from .models import Order, PaymentTransaction, BuyerReview

# Import serializers
from .serializers import (
    OrderSerializer,
    InitiateOrderSerializer,
    PaymentTransactionSerializer,
    BuyerReviewSerializer,
    RaiseDisputeSerializer,
    ResolveDisputeSerializer # NEW: Import ResolveDisputeSerializer
)

# Import custom permissions
from core.permissions import IsFarmer, IsBuyer, IsPlatformLenderOrAdmin # NEW: Import IsPlatformLenderOrAdmin

# Import notification utilities
from core.utils import send_sms, send_email

logger = logging.getLogger(__name__)

# --- NEW Helper function for creating core Transaction records ---
def create_core_transaction(account_party, amount, category, status, related_order, description):
    """
    Helper function to create a new core Transaction record.
    This encapsulates the logic for creating transactions in one place.
    """
    Transaction.objects.create(
        account_party=account_party,
        amount=amount,
        category=category,
        status=status,
        related_order=related_order,
        description=description,
        name=description
    )

# --- Helper Function for Escrow Account (Placeholder) ---
def get_escrow_account():
    """Retrieves or creates the FarmCred Escrow account."""
    # This assumes a single, designated 'escrow' account for internal transfers.
    escrow_account, created = Account.objects.get_or_create(
        email="escrow@farmcred.com",
        defaults={
            'phone_number': '233509999999', # Example phone number for escrow
            'full_name': 'FarmCred Escrow',
            'role': 'platform_escrow', # A new role for internal system accounts if needed
            'is_active': True,
            'is_staff': True,
            'is_superuser': False,
        }
    )
    if created:
        escrow_account.set_password(Account.objects.make_random_password()) # Set a random password
        escrow_account.save()
        logger.info(f"Created FarmCred Escrow account: {escrow_account.email}")
    return escrow_account


# --- Order Management Views (Buyer & Farmer) ---

@api_view(['POST'])
@permission_classes([AllowAny]) # Allow both authenticated and guest users
def initiate_order(request):
    """
    POST /api/payments/orders/initiate/
    Allows a buyer (authenticated or guest) to initiate a new purchase order for a produce listing.
    This creates an Order in 'pending_payment' status.
    """
    serializer = InitiateOrderSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Use a database transaction to ensure atomicity
    try:
        with db_transaction.atomic():
            listing = serializer.validated_data['listing_id']
            quantity = serializer.validated_data['quantity']
            delivery_date = serializer.validated_data.get('delivery_date')
            is_guest = serializer.validated_data.get('is_guest', False)

            # For authenticated users, validate they can't buy their own produce
            if request.user and request.user.is_authenticated:
                if request.user.role == 'farmer' and request.user == listing.farmer:
                    return Response(
                        {"detail": "A farmer cannot initiate an order for their own listing."},
                        status=status.HTTP_403_FORBIDDEN
                    )

            # Calculate total amount with discount
            base_price = listing.base_price_per_unit
            
            # Ensure discount_percentage is not None, default to 0.0 if it is
            discount_percentage = listing.discount_percentage if listing.discount_percentage is not None else Decimal('0.0')
            
            # Calculate the discounted price per unit
            # Ensure discount_percentage is treated as a Decimal for accurate calculation
            discount_factor = Decimal('1.0') - (discount_percentage / Decimal('100.0'))
            price_after_discount = base_price * discount_factor
            
            # Calculate the total amount
            calculated_total_amount = quantity * price_after_discount

            # Create the order object - handle guest vs authenticated users
            if is_guest or not (request.user and request.user.is_authenticated):
                # Guest order
                order = Order.objects.create(
                    buyer=None,  # No buyer account for guest
                    guest_name=serializer.validated_data.get('guest_name'),
                    guest_email=serializer.validated_data.get('guest_email'),
                    guest_phone=serializer.validated_data.get('guest_phone'),
                    farmer=listing.farmer,
                    produce_listing=listing,
                    quantity=quantity,
                    total_amount=calculated_total_amount,
                    delivery_date=delivery_date,
                    status=Order.STATUS_PENDING_PAYMENT,
                    escrow_reference=str(uuid.uuid4())
                )
            else:
                # Authenticated user order
                order = Order.objects.create(
                    buyer=request.user,
                    farmer=listing.farmer,
                    produce_listing=listing,
                    quantity=quantity,
                    total_amount=calculated_total_amount,
                    delivery_date=delivery_date,
                    status=Order.STATUS_PENDING_PAYMENT,
                    escrow_reference=str(uuid.uuid4())
                )

            # Update the listing's available quantity
            listing.quantity_available -= quantity
            listing.save(update_fields=['quantity_available'])

            # Return the created order details
            response_serializer = OrderSerializer(order)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    except IntegrityError as e:
        logger.error(f"Database integrity error while initiating order: {e}", exc_info=True)
        return Response({"detail": "An internal error occurred. Please try again later."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.error(f"Unexpected error while initiating order: {e}", exc_info=True)
        return Response({"detail": "An unexpected error occurred."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny]) # CHANGED: AllowAny for webhook simulation
def payment_callback(request, order_id):
    """
    POST /api/payments/orders/<int:order_id>/payment-callback/
    Simulated endpoint for a payment gateway webhook.
    Confirms payment for an order and moves funds to escrow.
    In a real system, this would be secured by payment gateway secrets/IP whitelisting.
    """
    # For simulation, assume request.data contains 'status' (e.g., 'successful', 'failed')
    # and 'transaction_reference' from the payment gateway.
    payment_status = request.data.get('status')
    payment_gateway_ref = request.data.get('transaction_reference')

    if not payment_status or not payment_gateway_ref:
        return Response({"detail": "Missing payment status or transaction reference."},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        order = Order.objects.get(id=order_id, status=Order.STATUS_PENDING_PAYMENT)
    except Order.DoesNotExist:
        return Response({"detail": "Order not found or not in 'pending_payment' status."},
                        status=status.HTTP_404_NOT_FOUND)

    try:
        with db_transaction.atomic():
            if payment_status == 'successful':
                order.is_paid = True
                order.status = Order.STATUS_PAID_TO_ESCROW
                order.escrow_reference = payment_gateway_ref # Use gateway ref as escrow ref
                order.save(update_fields=['is_paid', 'status', 'escrow_reference'])

                escrow_account = get_escrow_account()

                # Record payment transaction (deposit into escrow)
                PaymentTransaction.objects.create(
                    order=order,
                    payer=order.buyer, # Buyer is the one who paid
                    recipient=escrow_account, # Funds go to escrow
                    amount=order.total_amount,
                    transaction_type=PaymentTransaction.TYPE_ESCROW_DEPOSIT,
                    status=PaymentTransaction.STATUS_SUCCESSFUL,
                    gateway_reference=payment_gateway_ref
                )

                # Record core Transaction for buyer (expense)
                Transaction.objects.create(
                    account_party=order.buyer,
                    name=f"Payment to Escrow for Order {order.id}",
                    date=timezone.localdate(),
                    amount=order.total_amount,
                    category='produce_purchase',
                    status='expense',
                    related_order=order  # CORRECTED: Added the related_order field
                )
                # Record core Transaction for escrow (income)
                Transaction.objects.create(
                    account_party=escrow_account,
                    name=f"Escrow Deposit for Order {order.id} (from {order.buyer.full_name})",
                    date=timezone.localdate(),
                    amount=order.total_amount,
                    category='escrow_deposit',
                    status='income',
                    related_order=order  # CORRECTED: Added the related_order field
                )

                # Notify farmer that payment has been made to escrow
                farmer_phone = order.farmer.phone_number
                if farmer_phone:
                    sms_message = (
                        f"Payment of GHS {order.total_amount:.2f} for Order ID: {order.id} "
                        f"({order.produce_listing.produce_type}) has been successfully deposited into escrow. "
                        f"You can now proceed with delivery."
                    )
                    send_sms(farmer_phone, sms_message)

                return Response({"message": f"Payment for Order {order.id} confirmed and funds in escrow."},
                                status=status.HTTP_200_OK)
            else: # payment_status == 'failed'
                # Update order status to cancelled or failed payment
                order.status = Order.STATUS_CANCELLED
                order.save(update_fields=['status'])

                PaymentTransaction.objects.create(
                    order=order,
                    payer=order.buyer,
                    recipient=get_escrow_account(),
                    amount=order.total_amount,
                    transaction_type=PaymentTransaction.TYPE_ESCROW_DEPOSIT,
                    status=PaymentTransaction.STATUS_FAILED,
                    gateway_reference=payment_gateway_ref
                )
                return Response({"message": f"Payment for Order {order.id} failed. Order cancelled."},
                                status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error processing payment callback for order {order_id}: {e}", exc_info=True)
        return Response({"detail": "An error occurred while processing the payment callback."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsFarmer])
def confirm_delivery(request, order_id):
    """
    POST /api/payments/orders/<int:order_id>/confirm-delivery/
    Allows a farmer to confirm that they have delivered the goods for an order.
    Moves order status to 'farmer_confirmed_delivery'.
    """
    farmer_account = request.user
    try:
        order = Order.objects.get(
            id=order_id,
            farmer=farmer_account,
            status=Order.STATUS_PAID_TO_ESCROW # Only confirm delivery if funds are in escrow
        )
    except Order.DoesNotExist:
        return Response({"detail": "Order not found or not in 'paid_to_escrow' status."},
                        status=status.HTTP_404_NOT_FOUND)

    try:
        with db_transaction.atomic():
            order.is_delivered = True
            order.status = Order.STATUS_FARMER_CONFIRMED_DELIVERY
            order.delivery_date = timezone.localdate() # Set actual delivery date
            order.save(update_fields=['is_delivered', 'status', 'delivery_date'])

            # Notify buyer to confirm receipt
            buyer_phone = order.buyer.phone_number
            if buyer_phone:
                sms_message = (
                    f"Farmer {farmer_account.full_name} has confirmed delivery for your Order ID: {order.id} "
                    f"({order.produce_listing.produce_type}). Please confirm receipt to release funds to farmer."
                )
                send_sms(buyer_phone, sms_message)

            return Response({"message": f"Delivery confirmed for Order {order.id}. Waiting for buyer's receipt confirmation."},
                            status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error confirming delivery for order {order_id}: {e}", exc_info=True)
        return Response({"detail": "An error occurred while confirming delivery."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsBuyer])
def confirm_receipt_and_release_funds(request, order_id):
    """
    POST /api/payments/orders/<int:order_id>/confirm-receipt/
    Allows a buyer to confirm receipt of goods.
    Triggers the release of funds from escrow to the farmer.
    Moves order status to 'completed'.
    """
    buyer_account = request.user
    try:
        order = Order.objects.get(
            id=order_id,
            buyer=buyer_account,
            status__in=[Order.STATUS_PAID_TO_ESCROW, Order.STATUS_FARMER_CONFIRMED_DELIVERY]
        )
    except Order.DoesNotExist:
        return Response({"detail": "Order not found or not in a state ready for receipt confirmation."},
                        status=status.HTTP_404_NOT_FOUND)

    if order.status == Order.STATUS_COMPLETED:
        return Response({"detail": "This order has already been completed."},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        with db_transaction.atomic():
            order.is_receipt_confirmed = True
            order.status = Order.STATUS_COMPLETED
            # Removed the line `order.completion_date = timezone.now()`
            order.save(update_fields=['is_receipt_confirmed', 'status']) # Removed 'completion_date' from update_fields

            escrow_account = get_escrow_account()

            # Record payment transaction (release from escrow)
            PaymentTransaction.objects.create(
                order=order,
                payer=escrow_account,
                recipient=order.farmer,
                amount=order.total_amount,
                transaction_type=PaymentTransaction.TYPE_ESCROW_RELEASE,
                status=PaymentTransaction.STATUS_SUCCESSFUL,
                # CORRECTED: Changed `payment_gateway_reference` to `gateway_reference`
                gateway_reference=f"ESCROW_RELEASE_{order.id}"
            )

            # Record core Transaction for farmer (income)
            Transaction.objects.create(
                account_party=order.farmer,
                name=f"Funds Released from Escrow for Order {order.id}",
                date=timezone.localdate(),
                amount=order.total_amount,
                category='produce_sale',
                status='income',
                related_order=order # CORRECTED: Added the related_order field
            )
            # Record core Transaction for escrow (expense)
            Transaction.objects.create(
                account_party=escrow_account,
                name=f"Escrow Release for Order {order.id} to {order.farmer.full_name}",
                date=timezone.localdate(),
                amount=order.total_amount,
                category='escrow_release',
                status='expense',
                related_order=order # CORRECTED: Added the related_order field
            )

            # Notify farmer that funds have been released
            farmer_phone = order.farmer.phone_number
            if farmer_phone:
                sms_message = (
                    f"GHS {order.total_amount:.2f} for Order ID: {order.id} "
                    f"({order.produce_listing.produce_type}) has been released from escrow to your account. "
                    f"Thank you for completing the transaction!"
                )
                send_sms(farmer_phone, sms_message)

            # Notify buyer that transaction is complete
            buyer_phone = order.buyer.phone_number
            if buyer_phone:
                sms_message = (
                    f"You confirmed receipt for Order ID: {order.id}. Transaction complete. "
                    f"Please consider leaving a review for {order.farmer.full_name}."
                )
                send_sms(buyer_phone, sms_message)

            serializer = OrderSerializer(order)
            return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error confirming receipt and releasing funds for order {order_id}: {e}", exc_info=True)
        return Response({"detail": "An error occurred while confirming receipt."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_order(request, order_id):
    """
    POST /api/payments/orders/<int:order_id>/cancel/
    Allows a buyer or farmer to cancel an order.
    Cancellation logic depends on the current order status.
    """
    user_account = request.user
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

    if not (order.buyer == user_account or order.farmer == user_account):
        return Response({"detail": "You are not a participant in this order."},
                        status=status.HTTP_403_FORBIDDEN)

    if order.status in [Order.STATUS_COMPLETED, Order.STATUS_DISPUTED, Order.STATUS_CANCELLED]:
        return Response({"detail": f"Order cannot be cancelled in '{order.status}' status."},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        with db_transaction.atomic():
            order.status = Order.STATUS_CANCELLED
            order.save(update_fields=['status'])

            message = f"Order {order.id} has been cancelled."
            escrow_account = get_escrow_account()

            if order.is_paid:
                PaymentTransaction.objects.create(
                    order=order,
                    payer=escrow_account,
                    recipient=order.buyer,
                    amount=order.total_amount,
                    transaction_type=PaymentTransaction.TYPE_ESCROW_REFUND,
                    status=PaymentTransaction.STATUS_SUCCESSFUL,
                    # CORRECTED: Changed `payment_gateway_reference` to `gateway_reference`
                    gateway_reference=f"ESCROW_REFUND_{order.id}"
                )
                
                Transaction.objects.create(
                    account_party=order.buyer,
                    name=f"Refund for Cancelled Order {order.id}",
                    date=timezone.localdate(),
                    amount=order.total_amount,
                    category='refund',
                    status='income',
                    related_order=order # CORRECTED: Added the related_order field
                )
                
                Transaction.objects.create(
                    account_party=escrow_account,
                    name=f"Escrow Refund for Order {order.id} to {order.buyer.full_name}",
                    date=timezone.localdate(),
                    amount=order.total_amount,
                    category='escrow_refund',
                    status='expense',
                    related_order=order # CORRECTED: Added the related_order field
                )
                
                message += " Funds have been refunded to the buyer."
                
                if order.buyer.phone_number:
                    send_sms(order.buyer.phone_number, f"Your payment for Order ID: {order.id} has been refunded due to cancellation.")
                if order.farmer.phone_number:
                    send_sms(order.farmer.phone_number, f"Order ID: {order.id} has been cancelled. Funds were refunded to buyer.")
            else:
                if order.buyer.phone_number:
                    send_sms(order.buyer.phone_number, f"Order ID: {order.id} has been cancelled.")
                if order.farmer.phone_number:
                    send_sms(order.farmer.phone_number, f"Order ID: {order.id} has been cancelled.")

            return Response({"message": message}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error cancelling order {order_id}: {e}", exc_info=True)
        return Response({"detail": "An error occurred while cancelling the order."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_my_orders(request):
    """
    GET /api/payments/my-orders/
    Lists all orders for the authenticated user, whether they are the buyer or the farmer.
    """
    user_account = request.user
    orders = Order.objects.filter(
        Q(buyer=user_account) | Q(farmer=user_account)
    ).order_by('-order_date')

    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def retrieve_order_detail(request, pk):
    """
    GET /api/payments/orders/<int:pk>/
    Retrieves details of a specific order.
    Only participants (buyer or farmer) can view the order.
    """
    user_account = request.user
    try:
        order = Order.objects.get(pk=pk)
    except Order.DoesNotExist:
        return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

    if not (order.buyer == user_account or order.farmer == user_account):
        return Response({'detail': 'You are not a participant in this order.'},
                        status=status.HTTP_403_FORBIDDEN)

    serializer = OrderSerializer(order)
    return Response(serializer.data, status=status.HTTP_200_OK)


# --- Buyer Review Views ---


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsBuyer])
def create_buyer_review(request):
    """
    POST /api/payments/reviews/
    Allows a buyer to submit a review for a farmer after a completed order.
    """
    buyer_account = request.user
    serializer = BuyerReviewSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    order = serializer.validated_data['order']

    # Additional validation to ensure the buyer is indeed the buyer of this order
    if order.buyer != buyer_account:
        return Response({"detail": "You can only review orders you have placed."},
                        status=status.HTTP_403_FORBIDDEN)
    
    # Ensure the farmer is the one associated with the order
    farmer_account = order.farmer

    try:
        with db_transaction.atomic():
            review = serializer.save(buyer=buyer_account, farmer=farmer_account)

            # Recalculate farmer's trust score/level based on new review
            # This would typically be done via a signal or a management command
            # For simplicity, we can trigger a recalculation here if needed
            # e.g., farmer_account.farmer_profile.update_trust_score()
            # For now, we'll assume a signal handles this or it's done periodically.

            return Response(BuyerReviewSerializer(review).data, status=status.HTTP_201_CREATED)
    except IntegrityError:
        # This will catch the unique constraint violation for the 'order' field.
        return Response(
            {"detail": "A review for this order has already been submitted."},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Error creating buyer review: {e}", exc_info=True)
        return Response({"detail": "An error occurred while creating the review."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_my_reviews(request):
    """
    GET /api/payments/my-reviews/
    Lists all reviews given by the authenticated user (if buyer)
    or received by the authenticated user (if farmer).
    """
    user_account = request.user
    
    if user_account.role == 'buyer':
        reviews = BuyerReview.objects.filter(buyer=user_account).order_by('-created_at')
    elif user_account.role == 'farmer':
        reviews = BuyerReview.objects.filter(farmer=user_account).order_by('-created_at')
    else:
        return Response({"detail": "Only buyers and farmers can have reviews."},
                        status=status.HTTP_403_FORBIDDEN)

    serializer = BuyerReviewSerializer(reviews, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


# --- Dispute Resolution Views ---

@api_view(['POST'])
@permission_classes([IsAuthenticated]) # Both buyer and farmer can raise a dispute
def raise_dispute(request, order_id):
    """
    POST /api/payments/orders/<int:order_id>/raise-dispute/
    Allows a buyer or farmer to raise a dispute on a completed or delivered order.
    Changes order status to 'disputed' and notifies platform.
    """
    user_account = request.user
    serializer = RaiseDisputeSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    reason = serializer.validated_data['reason']

    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

    # Check if user is a participant in the order
    if not (order.buyer == user_account or order.farmer == user_account):
        return Response({"detail": "You are not a participant in this order."},
                        status=status.HTTP_403_FORBIDDEN)

    # Only allow dispute on orders that are 'completed', 'farmer_confirmed_delivery', or 'paid_to_escrow'
    if order.status not in [Order.STATUS_COMPLETED, Order.STATUS_FARMER_CONFIRMED_DELIVERY, Order.STATUS_PAID_TO_ESCROW]:
        return Response({"detail": f"Order cannot be disputed in '{order.status}' status."},
                        status=status.HTTP_400_BAD_REQUEST)
    
    # Prevent re-disputing an already disputed order
    if order.status == Order.STATUS_DISPUTED:
        return Response({"detail": f"This order is already in a disputed state."}, # FIX: Changed message to be more specific
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        with db_transaction.atomic():
            order.status = Order.STATUS_DISPUTED
            order.save(update_fields=['status'])

            # Record a PaymentTransaction for the dispute initiation
            escrow_account = get_escrow_account()
            PaymentTransaction.objects.create(
                order=order,
                payer=user_account, # The user who raised the dispute
                recipient=escrow_account, # Escrow holds the funds in dispute
                amount=order.total_amount,
                transaction_type=PaymentTransaction.TYPE_DISPUTE_RESOLUTION,
                status=PaymentTransaction.STATUS_PENDING, # Dispute is pending resolution
                gateway_reference=f"DISPUTE-{order.id}-{uuid.uuid4()}"
            )

        # FIX: Wrap notification calls in a try-except to prevent unhandled exceptions
        # from crashing the view. Log the error instead of returning a 500.
        try:
            # Notify the other party and platform admins about the dispute
            other_party_account = order.farmer if user_account == order.buyer else order.buyer
            if other_party_account.phone_number:
                send_sms(other_party_account.phone_number,
                            f"Order ID: {order.id} has been marked as DISPUTED by {user_account.full_name}. "
                            f"Reason: {reason}. FarmCred support will review and contact you.")
            
            # Notify platform lender/admin (assuming they have a phone number)
            platform_lender = Account.objects.filter(role='platform_lender').first()
            if platform_lender and platform_lender.phone_number:
                send_sms(platform_lender.phone_number,
                            f"ACTION REQUIRED: Order ID: {order.id} is now DISPUTED by {user_account.full_name}. "
                            f"Reason: {reason}. Please review.")
            
            if platform_lender and platform_lender.email:
                send_email(platform_lender.email,
                            f"Dispute Raised for Order ID: {order.id}",
                            f"Order ID: {order.id} is now DISPUTED by {user_account.full_name} ({user_account.role}).\n\n"
                            f"Reason: {reason}\n\n"
                            f"Please log in to the admin dashboard to review and resolve this dispute.")
        except Exception as notification_error:
            logger.error(f"Error sending dispute notifications for order {order.id}: {notification_error}", exc_info=True)


        return Response({"message": f"Dispute raised for Order {order.id}. FarmCred support will review and contact you."},
                        status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error raising dispute for order {order_id}: {e}", exc_info=True)
        return Response({"detail": "An error occurred while raising the dispute."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)
# --- Dispute Resolution API Endpoint ---
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsPlatformLenderOrAdmin])
def resolve_dispute(request, order_id):
    """
    POST /api/payments/orders/{order_id}/resolve-dispute/
    Resolves a disputed order by either releasing funds to the farmer,
    refunding the buyer, or splitting the funds.
    This endpoint is only accessible by Platform Lenders and Admins.
    """
    order = get_object_or_404(Order, id=order_id)

    if order.status != Order.STATUS_DISPUTED:
        return Response({"detail": "Order is not in 'disputed' status."},
                        status=status.HTTP_400_BAD_REQUEST)

    serializer = ResolveDisputeSerializer(data=request.data, context={'order_instance': order})
    serializer.is_valid(raise_exception=True)

    resolution_type = serializer.validated_data['resolution_type']
    amount_to_farmer = serializer.validated_data.get('amount_to_farmer')
    resolution_notes = serializer.validated_data.get('resolution_notes')
    escrow_account = get_escrow_account()

    with db_transaction.atomic():
        if resolution_type == 'release_to_farmer':
            amount = order.total_amount
            order.status = Order.STATUS_COMPLETED

            PaymentTransaction.objects.create(
                order=order,
                transaction_type=PaymentTransaction.TYPE_DISPUTE_RESOLUTION,
                amount=amount,
                payer=escrow_account,
                recipient=order.farmer,
                status=PaymentTransaction.STATUS_SUCCESSFUL,
                gateway_reference=f"dispute_res_{order.id}_{uuid.uuid4()}"
            )

            # Create core Transaction records for the ledger
            create_core_transaction(
                account_party=order.farmer,
                amount=amount,
                category='produce_sale',
                status='income',
                related_order=order,
                # FIX: Add a unique UUID to the description to ensure it's always unique
                description=f"Dispute resolved: Funds released to farmer for Order {order.id} - UUID: {uuid.uuid4()}"
            )
            create_core_transaction(
                account_party=escrow_account,
                amount=amount,
                category='escrow_release',
                status='expense',
                related_order=order,
                # FIX: Add a unique UUID to the description to ensure it's always unique
                description=f"Dispute resolved: Escrow funds released to farmer for Order {order.id} - UUID: {uuid.uuid4()}"
            )

            message_to_buyer = f"Order {order.id} dispute resolved. GHS {amount:.2f} has been released to the farmer."
            message_to_farmer = f"Order {order.id} dispute resolved. GHS {amount:.2f} has been released to your account."

        elif resolution_type == 'refund_to_buyer':
            amount = order.total_amount
            order.status = Order.STATUS_COMPLETED

            PaymentTransaction.objects.create(
                order=order,
                transaction_type=PaymentTransaction.TYPE_DISPUTE_RESOLUTION,
                amount=amount,
                payer=escrow_account,
                recipient=order.buyer,
                status=PaymentTransaction.STATUS_SUCCESSFUL,
                gateway_reference=f"dispute_res_{order.id}_{uuid.uuid4()}"
            )

            create_core_transaction(
                account_party=order.buyer,
                amount=amount,
                category='refund',
                status='income',
                related_order=order,
                # FIX: Add a unique UUID to the description to ensure it's always unique
                description=f"Dispute resolved: Funds refunded to buyer for Order {order.id} - UUID: {uuid.uuid4()}"
            )
            create_core_transaction(
                account_party=escrow_account,
                amount=amount,
                category='escrow_refund',
                status='expense',
                related_order=order,
                # FIX: Add a unique UUID to the description to ensure it's always unique
                description=f"Dispute resolved: Escrow funds refunded to buyer for Order {order.id} - UUID: {uuid.uuid4()}"
            )

            message_to_buyer = f"Order {order.id} dispute resolved. GHS {amount:.2f} has been refunded to your account."
            message_to_farmer = f"Order {order.id} dispute resolved. GHS {amount:.2f} has been refunded to the buyer."

        elif resolution_type == 'split_funds':
            amount_to_farmer = Decimal(str(amount_to_farmer))
            amount_to_buyer = order.total_amount - amount_to_farmer
            order.status = Order.STATUS_COMPLETED

            PaymentTransaction.objects.create(
                order=order,
                transaction_type=PaymentTransaction.TYPE_DISPUTE_RESOLUTION,
                amount=amount_to_farmer,
                payer=escrow_account,
                recipient=order.farmer,
                status=PaymentTransaction.STATUS_SUCCESSFUL,
                gateway_reference=f"dispute_res_farmer_{order.id}_{uuid.uuid4()}"
            )
            PaymentTransaction.objects.create(
                order=order,
                transaction_type=PaymentTransaction.TYPE_DISPUTE_RESOLUTION,
                amount=amount_to_buyer,
                payer=escrow_account,
                recipient=order.buyer,
                status=PaymentTransaction.STATUS_SUCCESSFUL,
                gateway_reference=f"dispute_res_buyer_{order.id}_{uuid.uuid4()}"
            )

            # Create core Transaction records for the ledger
            # FIX: Add unique UUIDs to descriptions to prevent MultipleObjectsReturned error
            create_core_transaction(
                account_party=order.farmer,
                amount=amount_to_farmer,
                category='produce_sale',
                status='income',
                related_order=order,
                description=f"Dispute resolved: Split funds released to farmer for Order {order.id} - UUID: {uuid.uuid4()}"
            )
            create_core_transaction(
                account_party=order.buyer,
                amount=amount_to_buyer,
                category='refund',
                status='income',
                related_order=order,
                description=f"Dispute resolved: Split funds refunded to buyer for Order {order.id} - UUID: {uuid.uuid4()}"
            )
            create_core_transaction(
                account_party=escrow_account,
                amount=amount_to_farmer,
                category='escrow_release',
                status='expense',
                related_order=order,
                description=f"Dispute resolved: Escrow funds released to farmer for Order {order.id} - UUID: {uuid.uuid4()}"
            )
            create_core_transaction(
                account_party=escrow_account,
                amount=amount_to_buyer,
                category='escrow_refund',
                status='expense',
                related_order=order,
                description=f"Dispute resolved: Escrow funds refunded to buyer for Order {order.id} - UUID: {uuid.uuid4()}"
            )
            
            message_to_buyer = f"Order {order.id} dispute resolved: GHS {amount_to_buyer:.2f} refunded to your account."
            message_to_farmer = f"Order {order.id} dispute resolved: GHS {amount_to_farmer:.2f} released to your account."
        
        order.save()

        if order.buyer.phone_number and message_to_buyer:
            send_sms(order.buyer.phone_number, message_to_buyer + (f" Notes: {resolution_notes}" if resolution_notes else ""))
        if order.farmer.phone_number and message_to_farmer:
            send_sms(order.farmer.phone_number, message_to_farmer + (f" Notes: {resolution_notes}" if resolution_notes else ""))

        return Response({"message": f"Dispute for Order {order.id} resolved as '{resolution_type}'. "
                                    f"Notes: {resolution_notes}"},
                        status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsPlatformLenderOrAdmin])
def list_disputed_orders(request):
    """
    GET /api/payments/orders/disputes/
    Lists all orders currently in a disputed state.
    """
    disputed_orders = Order.objects.filter(status=Order.STATUS_DISPUTED).order_by('-updated_at')
    serializer = OrderSerializer(disputed_orders, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)