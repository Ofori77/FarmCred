# marketplace/tests.py

from django.test import TestCase
from rest_framework.test import APIClient
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta, datetime
from decimal import Decimal
from rest_framework import status

# Import models
from account.models import Account
from core.models import FarmerProfile # Needed for farmer_profile setup
from .models import ProduceListing, Conversation, Message
# Import Order model from payments app for initiate_purchase_order test
from payments.models import Order

class MarketplaceAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # --- Create Test Users ---
        # Farmer
        self.farmer_email = "farmer_market@example.com"
        self.farmer_password = "password123"
        self.farmer_phone = "233241000001"
        self.farmer_user = Account.objects.create_user(
            email=self.farmer_email,
            password=self.farmer_password,
            phone_number=self.farmer_phone,
            full_name="Market Farmer",
            role="farmer"
        )
        self.farmer_profile = FarmerProfile.objects.create(
            account=self.farmer_user,
            full_name="Market Farmer",
            phone_number=self.farmer_phone,
            trust_level_stars=Decimal('4.0'),
            trust_score_percent=Decimal('75.00'),
            region="Ashanti"
        )
        self.farmer_token = self._get_jwt_token(self.farmer_email, self.farmer_password)
        self.farmer_client = APIClient()
        self.farmer_client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.farmer_token['access'])

        # Buyer
        self.buyer_email = "buyer_market@example.com"
        self.buyer_password = "password123"
        self.buyer_phone = "233242000001"
        self.buyer_user = Account.objects.create_user(
            email=self.buyer_email,
            password=self.buyer_password,
            phone_number=self.buyer_phone,
            full_name="Market Buyer",
            role="buyer"
        )
        self.buyer_token = self._get_jwt_token(self.buyer_email, self.buyer_password)
        self.buyer_client = APIClient()
        self.buyer_client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.buyer_token['access'])

        # --- Create Sample Produce Listing ---
        self.sample_listing = ProduceListing.objects.create(
            farmer=self.farmer_user,
            produce_type="Tomatoes",
            quantity_available=Decimal('50.00'),
            unit_of_measure="kg",
            base_price_per_unit=Decimal('2.50'),
            discount_percentage=Decimal('10.00'), # 10% discount
            location_description="Kumasi Central Market",
            available_from=timezone.localdate(),
            available_until=timezone.localdate() + timedelta(days=7),
            status=ProduceListing.STATUS_ACTIVE,
            image_url="https://example.com/tomatoes.jpg"
        )

    def _get_jwt_token(self, email, password):
        """Helper function to get JWT tokens."""
        url = reverse('token_obtain_pair') # Assuming 'token_obtain_pair' is your JWT login endpoint
        response = self.client.post(url, {'email': email, 'password': password}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data

    # --- Produce Listing Tests ---

    def test_list_all_produce_listings(self):
        """Tests that all active produce listings are returned."""
        # FIX: Changed URL name from 'list_all_produce_listings' to 'all_produce_listings'
        url = reverse('all_produce_listings')
        response = self.buyer_client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['produce_type'], "Tomatoes")
        self.assertAlmostEqual(Decimal(response.data[0]['current_price_per_unit']), Decimal('2.25')) # 2.50 - 10%

    def test_list_all_produce_listings_inactive(self):
        """Tests that inactive listings are not returned."""
        ProduceListing.objects.create(
            farmer=self.farmer_user,
            produce_type="Maize",
            quantity_available=Decimal('100.00'),
            unit_of_measure="bags",
            base_price_per_unit=Decimal('10.00'),
            location_description="Ejura",
            available_from=timezone.localdate(),
            available_until=timezone.localdate() + timedelta(days=7),
            status=ProduceListing.STATUS_INACTIVE, # Inactive status
        )
        # FIX: Changed URL name from 'list_all_produce_listings' to 'all_produce_listings'
        url = reverse('all_produce_listings')
        response = self.buyer_client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1) # Only the active one should be there

    def test_farmer_list_own_produce_listings(self):
        """Tests that a farmer can list their own produce listings."""
        url = reverse('farmer_produce_listings')
        response = self.farmer_client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['produce_type'], "Tomatoes")

    def test_list_all_produce_listings_unauthenticated(self):
        """
        Ensure that the produce listing endpoint is accessible
        to unauthenticated clients.
        """
        url = reverse('all_produce_listings')
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # You can also add an assertion to check the number of listings returned
        # self.assertEqual(len(response.data), 1)    

    def test_farmer_create_produce_listing_success(self):
        """Tests that a farmer can successfully create a new produce listing."""
        url = reverse('farmer_produce_listings')
        data = {
            "produce_type": "Yam",
            "quantity_available": "100.00",
            "unit_of_measure": "pieces",
            "base_price_per_unit": "15.00",
            "location_description": "Techiman Market",
            "available_from": str(timezone.localdate()),
            "available_until": str(timezone.localdate() + timedelta(days=14)),
            "status": "active",
            "image_url": "https://example.com/yam.jpg"
        }
        response = self.farmer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ProduceListing.objects.count(), 2)
        new_listing = ProduceListing.objects.get(produce_type="Yam")
        self.assertEqual(new_listing.farmer, self.farmer_user)
        self.assertEqual(response.data['produce_type'], "Yam")

    def test_farmer_create_produce_listing_invalid_data(self):
        """Tests that creating a listing with invalid data fails."""
        url = reverse('farmer_produce_listings')
        data = {
            "produce_type": "Cassava",
            "quantity_available": "-10.00", # Invalid quantity
            "unit_of_measure": "kg",
            "base_price_per_unit": "5.00",
            "location_description": "Accra",
            "available_from": str(timezone.localdate()),
            "available_until": str(timezone.localdate() + timedelta(days=14)),
            "status": "active",
        }
        response = self.farmer_client.post(url, data, format='json')
        # FIX: Expecting 400 Bad Request due to min_value validation
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('quantity_available', response.data)
        self.assertIn('Ensure this value is greater than or equal to 0.00.', response.data['quantity_available'][0])


    def test_farmer_retrieve_produce_listing_detail(self):
        """Tests that a farmer can retrieve details of their own listing."""
        url = reverse('farmer_produce_listing_detail', kwargs={'pk': self.sample_listing.id})
        response = self.farmer_client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['produce_type'], "Tomatoes")

    def test_farmer_update_produce_listing_full(self):
        """Tests that a farmer can fully update their own listing."""
        url = reverse('farmer_produce_listing_detail', kwargs={'pk': self.sample_listing.id})
        updated_data = {
            "produce_type": "Fresh Tomatoes",
            "quantity_available": "75.00",
            "unit_of_measure": "kg",
            "base_price_per_unit": "3.00",
            "discount_percentage": "0.00",
            "location_description": "Kumasi Market, Stall 5",
            "available_from": str(timezone.localdate()),
            "available_until": str(timezone.localdate() + timedelta(days=10)),
            "status": "active",
            "image_url": "https://example.com/fresh_tomatoes.jpg"
        }
        response = self.farmer_client.put(url, updated_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.sample_listing.refresh_from_db()
        self.assertEqual(self.sample_listing.produce_type, "Fresh Tomatoes")
        self.assertEqual(self.sample_listing.quantity_available, Decimal('75.00'))
        self.assertAlmostEqual(Decimal(response.data['current_price_per_unit']), Decimal('3.00'))

    def test_farmer_update_produce_listing_partial(self):
        """Tests that a farmer can partially update their own listing."""
        url = reverse('farmer_produce_listing_detail', kwargs={'pk': self.sample_listing.id})
        partial_data = {
            "quantity_available": "60.00",
            "status": "inactive",
        }
        response = self.farmer_client.patch(url, partial_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.sample_listing.refresh_from_db()
        self.assertEqual(self.sample_listing.quantity_available, Decimal('60.00'))
        self.assertEqual(self.sample_listing.status, ProduceListing.STATUS_INACTIVE)
        # Ensure other fields are unchanged
        self.assertEqual(self.sample_listing.produce_type, "Tomatoes")

    def test_farmer_delete_produce_listing(self):
        """Tests that a farmer can soft delete their own listing."""
        url = reverse('farmer_produce_listing_detail', kwargs={'pk': self.sample_listing.id})
        response = self.farmer_client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.sample_listing.refresh_from_db()
        self.assertEqual(self.sample_listing.status, ProduceListing.STATUS_DELETED)

    # --- Conversation and Messaging Tests ---

    def test_buyer_initiate_conversation_success(self):
        """Tests that a buyer can initiate a new conversation with a farmer."""
        url = reverse('conversations_list_and_initiate')
        data = {
            "listing_id": self.sample_listing.id,
            "initial_message": "Hello, I'm interested in your tomatoes!"
        }
        response = self.buyer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Conversation.objects.count(), 1)
        conversation = Conversation.objects.first()
        self.assertEqual(conversation.farmer, self.farmer_user)
        self.assertEqual(conversation.buyer, self.buyer_user)
        self.assertEqual(conversation.related_listing, self.sample_listing)
        self.assertEqual(Message.objects.count(), 1)
        self.assertEqual(Message.objects.first().content, "Hello, I'm interested in your tomatoes!")

    def test_buyer_initiate_conversation_existing_adds_message(self):
        """Tests that initiating a conversation with an existing listing adds a message to it."""
        # First, create an initial conversation
        self.test_buyer_initiate_conversation_success()
        
        url = reverse('conversations_list_and_initiate')
        data = {
            "listing_id": self.sample_listing.id,
            "initial_message": "Just following up on my previous message."
        }
        response = self.buyer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK) # Should return 200, not 201
        self.assertEqual(Conversation.objects.count(), 1) # Still only one conversation
        self.assertEqual(Message.objects.count(), 2) # But now two messages
        self.assertEqual(Message.objects.last().content, "Just following up on my previous message.")

    def test_farmer_cannot_initiate_conversation(self):
        """Tests that a farmer cannot initiate a conversation via this endpoint."""
        url = reverse('conversations_list_and_initiate')
        data = {
            "listing_id": self.sample_listing.id,
            "initial_message": "I'm the farmer, just testing."
        }
        response = self.farmer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Only buyers can initiate conversations.", response.data['detail'])

    def test_list_conversations_for_participant(self):
        """Tests that participants can list their conversations."""
        self.test_buyer_initiate_conversation_success() # Creates one conversation

        # Buyer lists conversations
        url = reverse('conversations_list_and_initiate')
        buyer_response = self.buyer_client.get(url, format='json')
        self.assertEqual(buyer_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(buyer_response.data), 1)
        self.assertEqual(buyer_response.data[0]['farmer_full_name'], self.farmer_user.full_name)

        # Farmer lists conversations
        farmer_response = self.farmer_client.get(url, format='json')
        self.assertEqual(farmer_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(farmer_response.data), 1)
        self.assertEqual(farmer_response.data[0]['buyer_full_name'], self.buyer_user.full_name)

    def test_retrieve_conversation_messages_success(self):
        """Tests that participants can retrieve messages from a conversation."""
        self.test_buyer_initiate_conversation_success()
        conversation = Conversation.objects.first()
        Message.objects.create(
            conversation=conversation,
            sender=self.farmer_user,
            recipient=self.buyer_user,
            content="Sure, how much do you need?"
        )

        url = reverse('retrieve_conversation_messages', kwargs={'pk': conversation.id})
        response = self.buyer_client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]['content'], "Hello, I'm interested in your tomatoes!")
        self.assertEqual(response.data[1]['content'], "Sure, how much do you need?")

    def test_retrieve_conversation_messages_unauthorized(self):
        """Tests that a non-participant cannot retrieve conversation messages."""
        self.test_buyer_initiate_conversation_success()
        conversation = Conversation.objects.first()

        # Create a third user (e.g., another farmer or investor)
        other_user = Account.objects.create_user(
            email="other@example.com",
            password="password123",
            phone_number="233243000001",
            full_name="Other User",
            role="investor"
        )
        other_token = self._get_jwt_token(other_user.email, "password123")
        other_client = APIClient()
        other_client.credentials(HTTP_AUTHORIZATION='Bearer ' + other_token['access'])

        url = reverse('retrieve_conversation_messages', kwargs={'pk': conversation.id})
        response = other_client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('not a participant', response.data['detail'])

    def test_send_message_success(self):
        """Tests that a participant can send a message in a conversation."""
        self.test_buyer_initiate_conversation_success()
        conversation = Conversation.objects.first()

        url = reverse('send_message', kwargs={'pk': conversation.id})
        data = {"content": "I need 20kg. What's the best price?"}
        response = self.buyer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Message.objects.count(), 2)
        self.assertEqual(Message.objects.last().content, "I need 20kg. What's the best price?")
        # Check that conversation's updated_at was updated
        conversation.refresh_from_db()
        self.assertGreater(conversation.updated_at, conversation.created_at)

    def test_send_message_unauthorized(self):
        """Tests that a non-participant cannot send a message."""
        self.test_buyer_initiate_conversation_success()
        conversation = Conversation.objects.first()

        # Create a third user (e.g., another farmer or investor)
        other_user = Account.objects.create_user(
            email="other@example.com",
            password="password123",
            phone_number="233243000001",
            full_name="Other User",
            role="investor"
        )
        other_token = self._get_jwt_token(other_user.email, "password123")
        other_client = APIClient()
        other_client.credentials(HTTP_AUTHORIZATION='Bearer ' + other_token['access'])

        url = reverse('send_message', kwargs={'pk': conversation.id})
        data = {"content": "Intruder message!"}
        response = other_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('not a participant', response.data['detail'])

    # --- Initiate Purchase Order Test (Integration with Payments App) ---
    def test_initiate_purchase_order_success(self):
        """
        Tests that a buyer can successfully initiate a purchase order,
        which calls the payments app's initiate_order view.
        """
        url = reverse('initiate_purchase_order', kwargs={'pk': self.sample_listing.id})
        data = {
            'quantity': '10.00',
            'delivery_date': str(timezone.localdate() + timedelta(days=5))
        }
        
        # Call the marketplace view, which internally calls payments.views.initiate_order
        response = self.buyer_client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", response.data) # Check for order ID
        self.assertIn("total_amount", response.data) # Check for total_amount

        # Verify that an Order object was created in the database
        order = Order.objects.get(buyer=self.buyer_user, produce_listing=self.sample_listing)
        self.assertIsNotNone(order)
        self.assertEqual(order.quantity, Decimal('10.00'))
        # Calculate expected total amount based on sample_listing's price and discount
        expected_total_amount = Decimal('10.00') * self.sample_listing.get_current_price_per_unit()
        self.assertAlmostEqual(order.total_amount, expected_total_amount)
        self.assertEqual(order.status, Order.STATUS_PENDING_PAYMENT)
        self.assertEqual(order.farmer, self.farmer_user)

    def test_initiate_purchase_order_invalid_quantity(self):
        """
        Tests that initiating a purchase order with an invalid quantity fails.
        This tests the validation passed through to the payments app.
        """
        url = reverse('initiate_purchase_order', kwargs={'pk': self.sample_listing.id})
        data = {
            'quantity': '1000.00', # Exceeds available quantity
        }
        response = self.buyer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('quantity', response.data)
        self.assertIn('Requested quantity exceeds available quantity.', response.data['quantity'][0])

    def test_initiate_purchase_order_unauthorized(self):
        """
        Tests that a non-buyer (e.g., farmer) cannot initiate a purchase order.
        """
        url = reverse('initiate_purchase_order', kwargs={'pk': self.sample_listing.id})
        data = {
            'quantity': '10.00',
        }
        # Farmer tries to initiate a purchase
        response = self.farmer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('You do not have permission to perform this action.', response.data['detail'])

