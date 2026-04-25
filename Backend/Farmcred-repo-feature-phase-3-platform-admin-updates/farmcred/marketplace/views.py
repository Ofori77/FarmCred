# marketplace/views.py

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
import logging
from django.db import transaction as db_transaction
from rest_framework.permissions import AllowAny # <-- Import this

# NEW: Import APIRequestFactory for internal view calls
from rest_framework.test import APIRequestFactory
# REMOVED: from rest_framework.views import APIView # Not needed for function-based views

# Import models
from account.models import Account
from .models import ProduceListing, Conversation, Message
# NEW: Import the function directly
from payments.views import initiate_order as payments_initiate_order
from core.models import FarmerProfile # Needed for accessing farmer profile details

# Import serializers
from .serializers import ProduceListingSerializer, ConversationSerializer, MessageSerializer, ProduceListingCreateSerializer

# Import custom permissions
from core.permissions import IsFarmer, IsBuyer # Assuming these are defined in core.permissions
from rest_framework.decorators import authentication_classes
from rest_framework.authentication import SessionAuthentication, BasicAuthentication


logger = logging.getLogger(__name__)

# --- Produce Listing Views ---

@api_view(['GET'])
@permission_classes([AllowAny])
@authentication_classes([])  # <-- No authentication needed
def list_all_produce_listings(request):
    """
    GET /api/marketplace/listings/
    Lists all active produce listings available for buyers to browse.
    Only listings with status 'active' and not expired are shown.
    """
    listings = ProduceListing.objects.filter(
        status='active',
        available_until__gte=timezone.localdate()
    ).order_by('-created_at')

    serializer = ProduceListingSerializer(listings, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([AllowAny])
@authentication_classes([])  # <-- No authentication needed
def public_produce_listing_detail(request, pk):
    """
    GET /api/marketplace/listings/<int:pk>/
    Retrieves detailed information for a specific produce listing.
    Public endpoint accessible to all users (authenticated or not).
    """
    try:
        listing = ProduceListing.objects.get(pk=pk)
    except ProduceListing.DoesNotExist:
        return Response({'detail': 'Produce listing not found.'},
                        status=status.HTTP_404_NOT_FOUND)

    serializer = ProduceListingSerializer(listing)
    return Response(serializer.data)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsFarmer])
def farmer_produce_listings(request):
    """
    GET /api/marketplace/farmer/listings/
    Lists a farmer's own produce listings.

    POST /api/marketplace/farmer/listings/
    Allows a farmer to create a new produce listing.
    """
    if request.method == 'GET':
        listings = ProduceListing.objects.filter(farmer=request.user).order_by('-created_at')
        serializer = ProduceListingSerializer(listings, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        # Use ProduceListingCreateSerializer for creation to handle farmer auto-assignment
        serializer = ProduceListingCreateSerializer(data=request.data)
        if serializer.is_valid():
            # Assign the current authenticated farmer to the listing
            serializer.save(farmer=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated, IsFarmer])
def farmer_produce_listing_detail(request, pk):
    """
    GET /api/marketplace/farmer/listings/<int:pk>/
    PUT/PATCH /api/marketplace/farmer/listings/<int:pk>/
    DELETE /api/marketplace/farmer/listings/<int:pk>/
    Retrieves, updates, or soft deletes a specific produce listing by a farmer.
    A farmer can only manage their own listings.
    """
    try:
        listing = ProduceListing.objects.get(pk=pk, farmer=request.user)
    except ProduceListing.DoesNotExist:
        return Response({'detail': 'Produce listing not found or you do not have permission.'},
                        status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = ProduceListingSerializer(listing)
        return Response(serializer.data)

    elif request.method in ['PUT', 'PATCH']:
        # Use ProduceListingCreateSerializer for validation and saving
        serializer = ProduceListingCreateSerializer(listing, data=request.data, partial=request.method == 'PATCH')
        if serializer.is_valid():
            serializer.save()
            # NEW: Re-serialize with ProduceListingSerializer to include calculated fields in response
            response_serializer = ProduceListingSerializer(listing)
            return Response(response_serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        # Soft delete: change status to 'deleted'
        listing.status = ProduceListing.STATUS_DELETED
        listing.save(update_fields=['status'])
        return Response(status=status.HTTP_204_NO_CONTENT)

# --- Conversation and Messaging Views ---

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def conversations_list_and_initiate(request):
    """
    GET /api/marketplace/conversations/
    Lists all conversations for the authenticated user (farmer or buyer).

    POST /api/marketplace/conversations/
    Allows a buyer to initiate a new conversation with a farmer about a produce listing.
    If a conversation already exists for the given listing and participants,
    it adds the initial message to that existing conversation.
    """
    user_account = request.user

    if request.method == 'GET':
        # List conversations where the user is either the farmer or the buyer
        conversations = Conversation.objects.filter(
            Q(farmer=user_account) | Q(buyer=user_account)
        ).order_by('-updated_at') # Show most recent conversations first

        serializer = ConversationSerializer(conversations, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        if user_account.role != 'buyer':
            return Response({'detail': 'Only buyers can initiate conversations.'},
                            status=status.HTTP_403_FORBIDDEN)

        listing_id = request.data.get('listing_id')
        initial_message_content = request.data.get('initial_message')

        if not listing_id or not initial_message_content:
            return Response({'detail': 'Listing ID and initial message are required.'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            produce_listing = ProduceListing.objects.get(pk=listing_id, status='active')
        except ProduceListing.DoesNotExist:
            return Response({'detail': 'Produce listing not found or is not active.'},
                            status=status.HTTP_404_NOT_FOUND)

        target_farmer = produce_listing.farmer

        with db_transaction.atomic():
            # Check if a conversation already exists for this listing between these two parties
            conversation, created = Conversation.objects.get_or_create(
                farmer=target_farmer,
                buyer=user_account,
                related_listing=produce_listing,
                defaults={'created_at': timezone.now(), 'updated_at': timezone.now()}
            )

            # Create the message
            Message.objects.create(
                conversation=conversation,
                sender=user_account, # The buyer is the initiator/sender
                recipient=target_farmer,
                content=initial_message_content,
                status='sent'
            )
            # Update conversation's updated_at timestamp
            conversation.updated_at = timezone.now()
            conversation.save(update_fields=['updated_at'])

            serializer = ConversationSerializer(conversation)
            if created:
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response(serializer.data, status=status.HTTP_200_OK) # Indicate existing conversation updated

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def retrieve_conversation_messages(request, pk):
    """
    GET /api/marketplace/conversations/<int:pk>/messages/
    Retrieves all messages for a specific conversation.
    Only participants of the conversation can view messages.
    """
    user_account = request.user
    try:
        conversation = Conversation.objects.get(pk=pk)
    except Conversation.DoesNotExist:
        return Response({'detail': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Check if the user is a participant in this conversation
    if not (conversation.farmer == user_account or conversation.buyer == user_account):
        return Response({'detail': 'You are not a participant in this conversation.'},
                        status=status.HTTP_403_FORBIDDEN)

    messages = Message.objects.filter(conversation=conversation).order_by('created_at')
    serializer = MessageSerializer(messages, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_message(request, pk):
    """
    POST /api/marketplace/conversations/<int:pk>/send-message/
    Sends a new message within an existing conversation.
    Only participants of the conversation can send messages.
    """
    user_account = request.user
    content = request.data.get('content')

    if not content:
        return Response({'detail': 'Message content cannot be empty.'},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        conversation = Conversation.objects.get(pk=pk)
    except Conversation.DoesNotExist:
        return Response({'detail': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Determine sender and recipient based on who is sending the message
    if conversation.farmer == user_account:
        sender = user_account
        recipient = conversation.buyer
    elif conversation.buyer == user_account:
        sender = user_account
        recipient = conversation.farmer
    else:
        return Response({'detail': 'You are not a participant in this conversation.'},
                        status=status.HTTP_403_FORBIDDEN)

    message = Message.objects.create(
        conversation=conversation,
        sender=sender,
        recipient=recipient,
        content=content,
        status='sent' # Use string literal for status
    )
    # Update conversation's updated_at timestamp to bring it to the top of the list
    conversation.updated_at = timezone.now()
    conversation.save(update_fields=['updated_at'])

    serializer = MessageSerializer(message)
    return Response(serializer.data, status=status.HTTP_201_CREATED)

# --- Placeholder for Phase 2: Integrated Payments ---

@api_view(['POST'])
@permission_classes([AllowAny]) # Allow anyone to initiate purchases
def initiate_purchase_order(request, pk):
    """
    POST /api/marketplace/listings/<int:pk>/purchase/
    Allows a buyer to initiate a purchase order for a produce listing.
    This view acts as a bridge, calling the initiate_order logic in the payments app.
    Requires 'quantity' in the request body.
    For authenticated users, uses their account.
    For guest users, requires guest_name, guest_email, guest_phone.
    """
    # Get quantity and delivery_date from request.data
    quantity = request.data.get('quantity')
    delivery_date = request.data.get('delivery_date') # Optional delivery date

    if not quantity:
        return Response({"detail": "Quantity is required to initiate a purchase."},
                        status=status.HTTP_400_BAD_REQUEST)

    # Check if user is authenticated
    if request.user and request.user.is_authenticated:
        # Authenticated user flow
        order_init_data = {
            'listing_id': pk,
            'quantity': quantity,
            'delivery_date': delivery_date,
            'is_guest': False
        }
    else:
        # Guest user flow - require guest information
        guest_name = request.data.get('guest_name')
        guest_email = request.data.get('guest_email')
        guest_phone = request.data.get('guest_phone')
        
        if not all([guest_name, guest_email, guest_phone]):
            return Response({
                "detail": "For guest purchases, guest_name, guest_email, and guest_phone are required."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        order_init_data = {
            'listing_id': pk,
            'quantity': quantity,
            'delivery_date': delivery_date,
            'is_guest': True,
            'guest_name': guest_name,
            'guest_email': guest_email,
            'guest_phone': guest_phone
        }

    # Create a new APIRequestFactory instance to build a fresh request
    factory = APIRequestFactory()
    
    # Create a mock POST request with the specific data for the payments view.
    # The data will be correctly formatted as JSON in the request body.
    payments_mock_request = factory.post('/payments/orders/initiate/', order_init_data, format='json')
    
    # For authenticated users, manually authenticate the mock request
    if request.user and request.user.is_authenticated:
        from rest_framework.test import force_authenticate
        force_authenticate(payments_mock_request, user=request.user)
    
    # Call the payments_initiate_order function directly.
    # It expects a DRF Request object as its first argument.
    response = payments_initiate_order(payments_mock_request)
    
    # The payments_initiate_order view returns a DRF Response object.
    # We can directly return its data and status.
    return Response(response.data, status=response.status_code)

