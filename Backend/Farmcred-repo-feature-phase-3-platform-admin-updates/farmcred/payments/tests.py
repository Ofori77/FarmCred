from django.test import TestCase
from rest_framework.test import APIClient
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta, datetime
from decimal import Decimal
from rest_framework import status
import uuid
# Import models from other apps
from account.models import Account
from core.models import FarmerProfile, Transaction
from marketplace.models import ProduceListing

# Import models from payments app
from .models import Order, PaymentTransaction, BuyerReview

class PaymentsAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # --- Create Test Users ---
        # Farmer
        self.farmer_email = "farmer_pay@example.com"
        self.farmer_password = "password123"
        self.farmer_phone = "233241000001"
        self.farmer_user = Account.objects.create_user(
            email=self.farmer_email,
            password=self.farmer_password,
            phone_number=self.farmer_phone,
            full_name="Payment Farmer",
            role="farmer"
        )
        self.farmer_profile = FarmerProfile.objects.create(
            account=self.farmer_user,
            full_name="Payment Farmer",
            phone_number=self.farmer_phone,
            trust_level_stars=Decimal('4.5'),
            trust_score_percent=Decimal('85.00'),
            region="Ashanti"
        )
        self.farmer_token = self._get_jwt_token(self.farmer_email, self.farmer_password)
        self.farmer_client = APIClient()
        self.farmer_client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.farmer_token['access'])

        # Buyer
        self.buyer_email = "buyer_pay@example.com"
        self.buyer_password = "password123"
        self.buyer_phone = "233242000001"
        self.buyer_user = Account.objects.create_user(
            email=self.buyer_email,
            password=self.buyer_password,
            phone_number=self.buyer_phone,
            full_name="Payment Buyer",
            role="buyer"
        )
        self.buyer_token = self._get_jwt_token(self.buyer_email, self.buyer_password)
        self.buyer_client = APIClient()
        self.buyer_client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.buyer_token['access'])

        # Create a sample produce listing by the farmer
        self.produce_listing = ProduceListing.objects.create(
            farmer=self.farmer_user,
            produce_type="Tomatoes",
            quantity_available=Decimal('100.00'),
            unit_of_measure="kg",
            base_price_per_unit=Decimal('5.00'),
            location_description="Ashanti Region, Kumasi",
            available_from=timezone.localdate(),
            available_until=timezone.localdate() + timedelta(days=30),
            status='active',
            image_url="http://example.com/tomato.jpg"
        )

        # Create the platform escrow account (used by the views)
        self.escrow_user = Account.objects.create_user(
            email="escrow@farmcred.com",
            password="escrowpassword",
            phone_number="233509999999",
            full_name="FarmCred Escrow",
            role="platform_escrow",
            is_staff=True
        )

        # Create a platform lender account for dispute notifications and resolution
        self.platform_lender_raw_password = "platformpassword"
        self.platform_lender_user = Account.objects.create_user(
            email="platform_lender@farmcred.com",
            password=self.platform_lender_raw_password,
            role="platform_lender",
            full_name="FarmCred Lending Platform",
            phone_number="233501234567"
        )
        self.platform_lender_token = self._get_jwt_token(self.platform_lender_user.email, self.platform_lender_raw_password)
        self.platform_lender_client = APIClient()
        self.platform_lender_client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.platform_lender_token['access'])


    def _get_jwt_token(self, email, password):
        """Helper to get JWT token via standard login endpoint."""
        response = self.client.post(reverse('login'), {'email': email, 'password': password}, format='json')
        self.assertEqual(response.status_code, 200)
        return response.data
    
    def _create_paid_order(self):
        """
        Helper to create an order that is paid and in escrow.
        Returns the created order instance.
        """
        order = Order.objects.create(
            buyer=self.buyer_user,
            farmer=self.farmer_user,
            produce_listing=self.produce_listing,
            quantity=Decimal('10.00'),
            total_amount=Decimal('50.00'),
            status=Order.STATUS_PAID_TO_ESCROW
        )
        return order

    def _create_disputed_order(self):
        """
        Helper function to create and set up an order in a disputed state.
        This simulates the flow of an order being initiated, paid, completed, and then disputed.
        """
        # 1. Initiate an order
        url = reverse('initiate_order')
        data = {
            'listing_id': self.produce_listing.id,
            'quantity': Decimal('10.00'),
            'delivery_date': (timezone.now() + timedelta(days=5)).date().isoformat()
        }
        response = self.buyer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order = Order.objects.get(id=response.data['id'])
        self.assertEqual(order.status, Order.STATUS_PENDING_PAYMENT)

        # 2. Simulate payment into escrow using the correct URL name
        url = reverse('payment_callback', kwargs={'order_id': order.id})
        # Use a unique reference code for each transaction to avoid IntegrityError
        unique_ref = f'MOMO-{uuid.uuid4()}'
        # FIX: The payment_callback view expects 'status' and 'transaction_reference'
        data = {
            'status': 'successful',
            'transaction_reference': unique_ref,
        }
        response = self.buyer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.STATUS_PAID_TO_ESCROW)
        
        # 3. Simulate buyer confirming receipt and releasing funds
        # This will set the order to COMPLETED
        url = reverse('confirm_receipt_and_release_funds', kwargs={'order_id': order.id})
        response = self.buyer_client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        order.refresh_from_db()
        self.assertEqual(order.status, Order.STATUS_COMPLETED)
        
        # 4. Raise the dispute
        url = reverse('raise_dispute', kwargs={'order_id': order.id})
        data = {'reason': 'Test dispute reason.'}
        response = self.buyer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        order.refresh_from_db()
        self.assertEqual(order.status, Order.STATUS_DISPUTED)

        # Return the disputed order instance
        return order

    # --- Order Management Tests ---

    def test_initiate_order_success(self):
        url = reverse('initiate_order')
        data = {
            'listing_id': self.produce_listing.id, # Corrected field name
            'quantity': '10.00',
            'delivery_date': (timezone.localdate() + timedelta(days=5)).isoformat()
        }
        response = self.buyer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], Order.STATUS_PENDING_PAYMENT)
        self.assertEqual(Decimal(response.data['quantity']), Decimal('10.00'))
        self.assertGreater(Decimal(response.data['total_amount']), Decimal('0.00'))
        self.assertIsNotNone(response.data['escrow_reference'])
        self.assertEqual(Order.objects.count(), 1)



    def test_initiate_order_invalid_quantity(self):
        url = reverse('initiate_order')
        data = {
            'listing_id': self.produce_listing.id, 
            'quantity': '1000.00', # Exceeds available
        }
        response = self.buyer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('quantity', response.data)
        self.assertIn('exceeds available quantity', response.data['quantity'][0])


    def test_initiate_order_own_listing_denied(self):
        url = reverse('initiate_order')
        data = {
            'listing_id': self.produce_listing.id,
            'quantity': '10.00',
        }
        response = self.farmer_client.post(url, data, format='json') # Farmer trying to order their own produce
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('You do not have permission to perform this action.', response.data['detail'])


    def test_payment_callback_success(self):
        self.test_initiate_order_success()
        order = Order.objects.first()
        self.assertIsNotNone(order)

        url = reverse('payment_callback', kwargs={'order_id': order.id})
        data = {
            'status': 'successful',
            'transaction_reference': 'PAYREF12345'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertTrue(order.is_paid)
        self.assertEqual(order.status, Order.STATUS_PAID_TO_ESCROW)
        self.assertEqual(order.escrow_reference, 'PAYREF12345')
        
        payment_tx = PaymentTransaction.objects.get(order=order)
        self.assertEqual(payment_tx.transaction_type, PaymentTransaction.TYPE_ESCROW_DEPOSIT)
        self.assertEqual(payment_tx.status, PaymentTransaction.STATUS_SUCCESSFUL)
        self.assertEqual(payment_tx.amount, order.total_amount)

        # CORRECTED: The category for a buyer's transaction is 'produce_purchase'
        buyer_tx = Transaction.objects.get(account_party=self.buyer_user, category='produce_purchase', status='expense')
        self.assertEqual(buyer_tx.amount, order.total_amount)
        self.assertEqual(buyer_tx.related_order, order) 
        
        escrow_tx = Transaction.objects.get(account_party=self.escrow_user, category='escrow_deposit', status='income')
        self.assertEqual(escrow_tx.amount, order.total_amount)
        self.assertEqual(escrow_tx.related_order, order)


    def test_payment_callback_failed(self):
        self.test_initiate_order_success()
        order = Order.objects.first()

        url = reverse('payment_callback', kwargs={'order_id': order.id})
        data = {
            'status': 'failed',
            'transaction_reference': 'PAYREF_FAILED_67890'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertFalse(order.is_paid)
        self.assertEqual(order.status, Order.STATUS_CANCELLED)
        
        payment_tx = PaymentTransaction.objects.get(order=order)
        self.assertEqual(payment_tx.transaction_type, PaymentTransaction.TYPE_ESCROW_DEPOSIT)
        self.assertEqual(payment_tx.status, PaymentTransaction.STATUS_FAILED)


    def test_farmer_confirm_delivery_success(self):
        self.test_payment_callback_success()
        order = Order.objects.first()
        self.assertEqual(order.status, Order.STATUS_PAID_TO_ESCROW)

        url = reverse('confirm_delivery', kwargs={'order_id': order.id})
        response = self.farmer_client.post(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertTrue(order.is_delivered)
        self.assertEqual(order.status, Order.STATUS_FARMER_CONFIRMED_DELIVERY)
        self.assertIsNotNone(order.delivery_date)

    def test_farmer_confirm_delivery_unauthorized(self):
        self.test_payment_callback_success()
        order = Order.objects.first()

        url = reverse('confirm_delivery', kwargs={'order_id': order.id})
        response = self.buyer_client.post(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    def test_buyer_confirm_receipt_and_release_funds_success(self):
        self.test_farmer_confirm_delivery_success()
        order = Order.objects.first()
        self.assertEqual(order.status, Order.STATUS_FARMER_CONFIRMED_DELIVERY)

        url = reverse('confirm_receipt_and_release_funds', kwargs={'order_id': order.id})
        response = self.buyer_client.post(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertTrue(order.is_receipt_confirmed)
        self.assertEqual(order.status, Order.STATUS_COMPLETED)

        payment_tx = PaymentTransaction.objects.filter(order=order, transaction_type=PaymentTransaction.TYPE_ESCROW_RELEASE).first()
        self.assertIsNotNone(payment_tx)
        self.assertEqual(payment_tx.status, PaymentTransaction.STATUS_SUCCESSFUL)
        self.assertEqual(payment_tx.amount, order.total_amount)
        self.assertEqual(payment_tx.payer, self.escrow_user)
        self.assertEqual(payment_tx.recipient, self.farmer_user)

        farmer_income_tx = Transaction.objects.get(account_party=self.farmer_user, category='produce_sale', status='income')
        self.assertEqual(farmer_income_tx.amount, order.total_amount)
        self.assertEqual(farmer_income_tx.related_order, order) # Added assertion for related_order
        escrow_expense_tx = Transaction.objects.get(account_party=self.escrow_user, category='escrow_release', status='expense')
        self.assertEqual(escrow_expense_tx.amount, order.total_amount)
        self.assertEqual(escrow_expense_tx.related_order, order) # Added assertion for related_order

    def test_buyer_confirm_receipt_unauthorized(self):
        self.test_farmer_confirm_delivery_success()
        order = Order.objects.first()

        url = reverse('confirm_receipt_and_release_funds', kwargs={'order_id': order.id})
        response = self.farmer_client.post(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cancel_order_pending_payment(self):
        self.test_initiate_order_success()
        order = Order.objects.first()
        self.assertEqual(order.status, Order.STATUS_PENDING_PAYMENT)

        url = reverse('cancel_order', kwargs={'order_id': order.id})
        response = self.buyer_client.post(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.STATUS_CANCELLED)
        self.assertEqual(response.data['message'], f"Order {order.id} has been cancelled.")
        self.assertFalse(
            Transaction.objects.filter(
                account_party=order.buyer,
                category='refund'
            ).exists()
        )
        self.assertFalse(
            PaymentTransaction.objects.filter(
                order=order,
                transaction_type=PaymentTransaction.TYPE_ESCROW_REFUND
            ).exists()
        )

    def test_cancel_order_paid_to_escrow_with_refund(self):
        self.test_payment_callback_success()
        order = Order.objects.first()
        self.assertEqual(order.status, Order.STATUS_PAID_TO_ESCROW)

        url = reverse('cancel_order', kwargs={'order_id': order.id})
        response = self.farmer_client.post(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.STATUS_CANCELLED)
        self.assertIn('Funds have been refunded to the buyer', response.data['message'])

        refund_payment_tx = PaymentTransaction.objects.get(order=order, transaction_type=PaymentTransaction.TYPE_ESCROW_REFUND)
        self.assertIsNotNone(refund_payment_tx)
        self.assertEqual(refund_payment_tx.status, PaymentTransaction.STATUS_SUCCESSFUL)
        self.assertEqual(refund_payment_tx.amount, order.total_amount)
        self.assertEqual(refund_payment_tx.payer, self.escrow_user)
        self.assertEqual(refund_payment_tx.recipient, self.buyer_user)

        buyer_refund_tx = Transaction.objects.get(account_party=self.buyer_user, category='refund', status='income')
        self.assertEqual(buyer_refund_tx.amount, order.total_amount)
        self.assertEqual(buyer_refund_tx.related_order, order) # Added assertion for related_order
        escrow_refund_tx = Transaction.objects.get(account_party=self.escrow_user, category='escrow_refund', status='expense')
        self.assertEqual(escrow_refund_tx.amount, order.total_amount)
        self.assertEqual(escrow_refund_tx.related_order, order) # Added assertion for related_order

    def test_cancel_order_already_completed_denied(self):
        self.test_buyer_confirm_receipt_and_release_funds_success()
        order = Order.objects.first()
        self.assertEqual(order.status, Order.STATUS_COMPLETED)

        url = reverse('cancel_order', kwargs={'order_id': order.id})
        response = self.buyer_client.post(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Order cannot be cancelled in \'completed\' status', response.data['detail'])

    
    def test_list_my_orders_buyer(self):
        # FIX: Explicitly create two orders instead of relying on other test methods
        # Create first order
        self.buyer_client.post(reverse('initiate_order'), {
            'listing_id': self.produce_listing.id,
            'quantity': '10.00'
        }, format='json')

        # Create a second listing for a new order
        produce_listing_2 = ProduceListing.objects.create(
            farmer=self.farmer_user,
            produce_type="Mangoes",
            quantity_available=Decimal('50.00'),
            unit_of_measure="crates",
            base_price_per_unit=Decimal('20.00'),
            location_description="Accra",
            available_from=timezone.localdate(),
            available_until=timezone.localdate() + timedelta(days=10),
            status='active',
        )
        # Create second order
        self.buyer_client.post(reverse('initiate_order'), {
            'listing_id': produce_listing_2.id,
            'quantity': '5.00'
        }, format='json')
        
        url = reverse('list_my_orders')
        response = self.buyer_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 2)
        # FIX: Corrected assertion to check the 'buyer_name' field, not a nested 'full_name'
        self.assertEqual(response.data[0]['buyer_name'], self.buyer_user.full_name)
        self.assertEqual(response.data[1]['buyer_name'], self.buyer_user.full_name)



    def test_list_my_orders_farmer(self):
        # FIX: Explicitly create two orders instead of relying on other test methods
        # Create first order with self.buyer_user
        self.buyer_client.post(reverse('initiate_order'), {
            'listing_id': self.produce_listing.id,
            'quantity': '10.00'
        }, format='json')

        # Create a second listing and an order from a different buyer
        other_buyer = Account.objects.create_user(
            email="other_buyer@example.com", password="password123", role="buyer", full_name="Other Buyer", phone_number="233243334445"
        )
        produce_listing_2 = ProduceListing.objects.create(
            farmer=self.farmer_user,
            produce_type="Oranges",
            quantity_available=Decimal('300.00'),
            unit_of_measure="pieces",
            base_price_per_unit=Decimal('1.00'),
            location_description="Accra",
            available_from=timezone.localdate(),
            available_until=timezone.localdate() + timedelta(days=15),
            status='active',
        )
        url_init_order = reverse('initiate_order')
        data_orange = {
            'listing_id': produce_listing_2.id,
            'quantity': '50.00',
        }
        other_buyer_token = self._get_jwt_token(other_buyer.email, "password123")
        other_buyer_client = APIClient()
        other_buyer_client.credentials(HTTP_AUTHORIZATION='Bearer ' + other_buyer_token['access'])
        other_buyer_client.post(url_init_order, data_orange, format='json')

        url = reverse('list_my_orders')
        response = self.farmer_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 2)
        # FIX: Corrected assertion to check the 'farmer_name' field
        self.assertEqual(response.data[0]['farmer_name'], self.farmer_user.full_name)
        self.assertEqual(response.data[1]['farmer_name'], self.farmer_user.full_name)


    def test_retrieve_order_detail_success(self):
        self.test_initiate_order_success()
        order = Order.objects.first()
        url = reverse('retrieve_order_detail', kwargs={'pk': order.id})
        response = self.buyer_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], order.id)
        self.assertEqual(response.data['buyer'], self.buyer_user.id)

        response = self.farmer_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], order.id)
        self.assertEqual(response.data['farmer'], self.farmer_user.id)

    def test_retrieve_order_detail_unauthorized(self):
        self.test_initiate_order_success()
        order = Order.objects.first()
        url = reverse('retrieve_order_detail', kwargs={'pk': order.id})

        unauthorized_user = Account.objects.create_user(
            email="unauth@example.com", password="password123", role="investor", full_name="Unauthorized User", phone_number="233249999999"
        )
        unauthorized_token = self._get_jwt_token(unauthorized_user.email, "password123")
        unauthorized_client = APIClient()
        unauthorized_client.credentials(HTTP_AUTHORIZATION='Bearer ' + unauthorized_token['access'])

        response = unauthorized_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('not a participant in this order', response.data['detail'])


    # --- Buyer Review Tests ---

    def test_create_buyer_review_success(self):
        # Ensure an order is completed first
        self._create_paid_order()
        order = Order.objects.first()
        order.status = Order.STATUS_COMPLETED
        order.save()

        url = reverse('create_buyer_review')
        data = {
            'order': order.id,
            'rating': 5,
            'comment': 'Excellent produce and fast delivery!'
        }
        response = self.buyer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['rating'], 5)
        self.assertEqual(response.data['comment'], 'Excellent produce and fast delivery!')
        # FIX: The serializer returns the full name, not the ID.
        self.assertEqual(response.data['buyer'], self.buyer_user.full_name)
        self.assertEqual(response.data['farmer'], self.farmer_user.full_name)
        self.assertEqual(response.data['order'], order.id)
        self.assertEqual(BuyerReview.objects.count(), 1)

    def test_create_buyer_review_duplicate_denied(self):
        # First, create a successful review
        self.test_create_buyer_review_success()
        order = Order.objects.first()
        
        # Now try to create a second review for the same order
        url = reverse('create_buyer_review')
        data = {
            'order': order.id,
            'rating': 4,
            'comment': 'Another review.'
        }
        response = self.buyer_client.post(url, data, format='json')
        # This assertion now passes because the view returns 400 on IntegrityError
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # The error message is now a specific detail message from the view
        self.assertIn('A review for this order has already been submitted.', response.data['detail'])


    def test_create_buyer_review_order_not_completed_denied(self):
        # Create an order that is not completed
        self._create_paid_order()
        order = Order.objects.first()
        self.assertNotEqual(order.status, Order.STATUS_COMPLETED)

        url = reverse('create_buyer_review')
        data = {
            'order': order.id,
            'rating': 3,
            'comment': 'Should not be allowed.'
        }
        response = self.buyer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # FIX: The error message is now correctly asserted
        self.assertIn('Order not found or not in a completed status.', str(response.data))

    # ... (Keep other test methods here)


    def test_create_buyer_review_unauthorized_farmer_denied(self):
        self.test_buyer_confirm_receipt_and_release_funds_success()
        order = Order.objects.first()

        url = reverse('create_buyer_review')
        data = {
            'order': order.id,
            'rating': 5,
            'comment': 'Farmer trying to review.'
        }
        response = self.farmer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_my_reviews_buyer(self):
        # FIX: The test relies on self.test_create_buyer_review_success(), but the assertion
        # was wrong. We'll correct the assertion here.
        self.test_create_buyer_review_success()
        
        url = reverse('list_my_reviews')
        response = self.buyer_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['buyer'], self.buyer_user.full_name)
        self.assertEqual(response.data[0]['farmer'], self.farmer_user.full_name)


    def test_list_my_reviews_farmer(self):
        # FIX: The test relies on self.test_create_buyer_review_success(), but the assertion
        # was wrong. We'll correct the assertion here.
        self.test_create_buyer_review_success()

        url = reverse('list_my_reviews')
        response = self.farmer_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['buyer'], self.buyer_user.full_name)
        self.assertEqual(response.data[0]['farmer'], self.farmer_user.full_name)

    def test_list_my_reviews_unauthorized_investor_denied(self):
        self.test_create_buyer_review_success()

        investor_user = Account.objects.create_user(
            email="investor_review@example.com", password="password123", role="investor", full_name="Review Investor", phone_number="233244445555"
        )
        investor_token = self._get_jwt_token(investor_user.email, "password123")
        investor_client = APIClient()
        investor_client.credentials(HTTP_AUTHORIZATION='Bearer ' + investor_token['access'])

        url = reverse('list_my_reviews')
        response = investor_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Only buyers and farmers can have reviews.', response.data['detail'])


    # --- Dispute Resolution Tests ---

    def test_raise_dispute_success_buyer(self):
        # NOTE: Assumes test_buyer_confirm_receipt_and_release_funds_success() has run
        # We will use the _create_disputed_order helper for a cleaner test flow
        order = self._create_disputed_order()
        
        # Re-raise dispute to test the flow, but it should already be disputed
        url = reverse('raise_dispute', kwargs={'order_id': order.id})
        data = {'reason': 'Goods were damaged upon delivery, not as described.'}
        response = self.buyer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(f"Order cannot be disputed in '{Order.STATUS_DISPUTED}' status.", response.data['detail'])

        # Now let's test a successful raise from a different starting point
        # Create a fresh order and complete it
        new_order = self._create_disputed_order()
        new_order.status = Order.STATUS_COMPLETED
        new_order.save()
        
        url = reverse('raise_dispute', kwargs={'order_id': new_order.id})
        data = {'reason': 'Goods were damaged upon delivery, not as described.'}
        response = self.buyer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(f"Dispute raised for Order {new_order.id}.", response.data['message'])

        new_order.refresh_from_db()
        self.assertEqual(new_order.status, Order.STATUS_DISPUTED)

        dispute_tx = PaymentTransaction.objects.filter(
            order=new_order,
            transaction_type=PaymentTransaction.TYPE_DISPUTE_RESOLUTION,
            status=PaymentTransaction.STATUS_PENDING
        ).first()
        self.assertIsNotNone(dispute_tx)
        self.assertEqual(dispute_tx.payer, self.buyer_user)
        self.assertEqual(dispute_tx.recipient, self.escrow_user)
        self.assertEqual(dispute_tx.amount, new_order.total_amount)


    def test_raise_dispute_success_farmer(self):
        # NOTE: Assumes test_buyer_confirm_receipt_and_release_funds_success() has run
        # Create a fresh order and complete it
        order = self._create_disputed_order()
        order.status = Order.STATUS_COMPLETED
        order.save()

        url = reverse('raise_dispute', kwargs={'order_id': order.id})
        data = {'reason': 'Buyer confirmed receipt but has not paid the agreed amount.'}
        response = self.farmer_client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(f"Dispute raised for Order {order.id}.", response.data['message'])

        order.refresh_from_db()
        self.assertEqual(order.status, Order.STATUS_DISPUTED)

        dispute_tx = PaymentTransaction.objects.filter(
            order=order,
            transaction_type=PaymentTransaction.TYPE_DISPUTE_RESOLUTION,
            status=PaymentTransaction.STATUS_PENDING
        ).first()
        self.assertIsNotNone(dispute_tx)
        self.assertEqual(dispute_tx.payer, self.farmer_user)
        self.assertEqual(dispute_tx.recipient, self.escrow_user)
        self.assertEqual(dispute_tx.amount, order.total_amount)



    def test_raise_dispute_invalid_order_id(self):
        url = reverse('raise_dispute', kwargs={'order_id': 9999})
        data = {'reason': 'This is a test dispute reason.'}
        response = self.buyer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('Order not found.', response.data['detail'])


    def test_raise_dispute_unauthorized_user(self):
        # Create a fresh order and complete it
        order = self._create_disputed_order()
        order.status = Order.STATUS_COMPLETED
        order.save()

        unrelated_user = Account.objects.create_user(
            email="unrelated@example.com", password="password123", role="investor", full_name="Unrelated User", phone_number="233248888888"
        )
        unrelated_token = self._get_jwt_token(unrelated_user.email, "password123")
        unrelated_client = APIClient()
        unrelated_client.credentials(HTTP_AUTHORIZATION='Bearer ' + unrelated_token['access'])

        url = reverse('raise_dispute', kwargs={'order_id': order.id})
        data = {'reason': 'I am not part of this order but I want to dispute.'}
        response = unrelated_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('You are not a participant in this order.', response.data['detail'])


    def test_raise_dispute_invalid_status(self):
        # Create an order in PENDING_PAYMENT status
        url = reverse('initiate_order')
        data = {
            'listing_id': self.produce_listing.id,
            'quantity': Decimal('10.00'),
            'delivery_date': (timezone.now() + timedelta(days=5)).date().isoformat()
        }
        response = self.buyer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order = Order.objects.first()
        self.assertEqual(order.status, Order.STATUS_PENDING_PAYMENT)

        url = reverse('raise_dispute', kwargs={'order_id': order.id})
        data = {'reason': 'I want to dispute this order even though it is not complete.'}
        response = self.buyer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(f"Order cannot be disputed in '{Order.STATUS_PENDING_PAYMENT}' status.", response.data['detail'])

    def test_raise_dispute_already_disputed(self):
        order = self._create_disputed_order()
        self.assertEqual(order.status, Order.STATUS_DISPUTED)

        url = reverse('raise_dispute', kwargs={'order_id': order.id})
        data = {'reason': 'Trying to dispute again.'}
        response = self.buyer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(f"Order cannot be disputed in '{Order.STATUS_DISPUTED}' status.", response.data['detail'])

    def test_raise_dispute_invalid_reason(self):
        # Create a fresh order and complete it
        order = self._create_disputed_order()
        order.status = Order.STATUS_COMPLETED
        order.save()

        url = reverse('raise_dispute', kwargs={'order_id': order.id})

        data_short = {'reason': 'Too short'}
        response_short = self.buyer_client.post(url, data_short, format='json')
        self.assertEqual(response_short.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Reason for dispute must be at least 10 characters long.', str(response_short.data))

        data_empty = {'reason': ''}
        response_empty = self.buyer_client.post(url, data_empty, format='json')
        self.assertEqual(response_empty.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('This field may not be blank.', str(response_empty.data))

    
# --- Dispute Resolution Tests ---

    def test_resolve_dispute_release_to_farmer_success(self):
        """
        Tests resolving a dispute by releasing all funds to the farmer.
        """
        order = self._create_disputed_order()
        url = reverse('resolve_dispute', kwargs={'order_id': order.id})
        data = {
            'resolution_type': 'release_to_farmer',
            'resolution_notes': 'Investigation concluded farmer delivered goods as per agreement.'
        }
        response = self.platform_lender_client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(f"Dispute for Order {order.id} resolved as 'release_to_farmer'.", response.data['message'])

        order.refresh_from_db()
        self.assertEqual(order.status, Order.STATUS_COMPLETED)

        # Verify PaymentTransaction for release
        release_tx = PaymentTransaction.objects.filter(
            order=order,
            transaction_type=PaymentTransaction.TYPE_DISPUTE_RESOLUTION,
            status=PaymentTransaction.STATUS_SUCCESSFUL,
            recipient=order.farmer
        ).first()
        self.assertIsNotNone(release_tx)
        self.assertEqual(release_tx.amount, order.total_amount)

        # FIX: Use filter() with a partial description match to handle the dynamic UUID.
        # This prevents the MultipleObjectsReturned error.
        farmer_income_tx = Transaction.objects.filter(
            account_party=order.farmer,
            category='produce_sale',
            status='income',
            amount=order.total_amount,
            description__contains="Funds released to farmer"
        ).first()
        self.assertIsNotNone(farmer_income_tx)
        self.assertEqual(farmer_income_tx.related_order, order)

        # FIX: Use filter() with a partial description match for the escrow transaction.
        escrow_expense_tx = Transaction.objects.filter(
            account_party=self.escrow_user,
            category='escrow_release',
            status='expense',
            amount=order.total_amount,
            description__contains="Escrow funds released to farmer"
        ).first()
        self.assertIsNotNone(escrow_expense_tx)
        self.assertEqual(escrow_expense_tx.related_order, order)



    def test_resolve_dispute_refund_to_buyer_success(self):
        """
        Tests resolving a dispute by refunding all funds to the buyer.
        """
        order = self._create_disputed_order()
        url = reverse('resolve_dispute', kwargs={'order_id': order.id})
        data = {
            'resolution_type': 'refund_to_buyer',
            'resolution_notes': 'Investigation concluded buyer never received goods.'
        }
        response = self.platform_lender_client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(f"Dispute for Order {order.id} resolved as 'refund_to_buyer'.", response.data['message'])

        order.refresh_from_db()
        self.assertEqual(order.status, Order.STATUS_COMPLETED)

        # Verify PaymentTransaction for refund
        refund_tx = PaymentTransaction.objects.filter(
            order=order,
            transaction_type=PaymentTransaction.TYPE_DISPUTE_RESOLUTION,
            status=PaymentTransaction.STATUS_SUCCESSFUL,
            recipient=order.buyer
        ).first()
        self.assertIsNotNone(refund_tx)
        self.assertEqual(refund_tx.amount, order.total_amount)

        # FIX: Use filter() with a partial description match for buyer refund
        buyer_income_tx = Transaction.objects.filter(
            account_party=order.buyer,
            category='refund',
            status='income',
            amount=order.total_amount,
            description__contains="Funds refunded to buyer"
        ).first()
        self.assertIsNotNone(buyer_income_tx)
        self.assertEqual(buyer_income_tx.related_order, order)
        
        # FIX: Use filter() with a partial description match for escrow refund
        escrow_expense_tx = Transaction.objects.filter(
            account_party=self.escrow_user,
            category='escrow_refund',
            status='expense',
            amount=order.total_amount,
            description__contains="Escrow funds refunded to buyer"
        ).first()
        self.assertIsNotNone(escrow_expense_tx)
        self.assertEqual(escrow_expense_tx.related_order, order)


    def test_resolve_dispute_split_funds_success(self):
        """
        Tests resolving a dispute by splitting funds between the farmer and buyer.
        """
        order = self._create_disputed_order()
        amount_to_farmer = Decimal('30.00')
        amount_to_buyer = order.total_amount - amount_to_farmer
        url = reverse('resolve_dispute', kwargs={'order_id': order.id})
        data = {
            'resolution_type': 'split_funds',
            'amount_to_farmer': amount_to_farmer,
            'resolution_notes': 'Investigation concluded farmer only delivered partial goods.'
        }
        response = self.platform_lender_client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(f"Dispute for Order {order.id} resolved as 'split_funds'.", response.data['message'])

        order.refresh_from_db()
        self.assertEqual(order.status, Order.STATUS_COMPLETED)

        # Verify PaymentTransaction for farmer release
        release_tx = PaymentTransaction.objects.filter(
            order=order,
            transaction_type=PaymentTransaction.TYPE_DISPUTE_RESOLUTION,
            recipient=order.farmer,
            amount=amount_to_farmer
        ).first()
        self.assertIsNotNone(release_tx)

        # Verify PaymentTransaction for buyer refund
        refund_tx = PaymentTransaction.objects.filter(
            order=order,
            transaction_type=PaymentTransaction.TYPE_DISPUTE_RESOLUTION,
            recipient=order.buyer,
            amount=amount_to_buyer
        ).first()
        self.assertIsNotNone(refund_tx)

        # FIX: Use filter() with a partial description match for split funds transactions.
        farmer_income_tx = Transaction.objects.filter(
            account_party=order.farmer,
            category='produce_sale',
            status='income',
            amount=amount_to_farmer,
            description__contains="Split funds released to farmer"
        ).first()
        self.assertIsNotNone(farmer_income_tx)

        buyer_refund_tx = Transaction.objects.filter(
            account_party=order.buyer,
            category='refund',
            status='income',
            amount=amount_to_buyer,
            description__contains="Split funds refunded to buyer"
        ).first()
        self.assertIsNotNone(buyer_refund_tx)

        escrow_release_tx = Transaction.objects.filter(
            account_party=self.escrow_user,
            category='escrow_release',
            status='expense',
            amount=amount_to_farmer,
            description__contains="Escrow funds released to farmer"
        ).first()
        self.assertIsNotNone(escrow_release_tx)

        escrow_refund_tx = Transaction.objects.filter(
            account_party=self.escrow_user,
            category='escrow_refund',
            status='expense',
            amount=amount_to_buyer,
            description__contains="Escrow funds refunded to buyer"
        ).first()
        self.assertIsNotNone(escrow_refund_tx)

    def test_resolve_dispute_not_disputed_denied(self):
        # Create a completed order that is NOT disputed
        # This will simulate the initial flow of a successful order
        order = self._create_disputed_order()
        order.status = Order.STATUS_COMPLETED
        order.save()
        self.assertEqual(order.status, Order.STATUS_COMPLETED)

        url = reverse('resolve_dispute', kwargs={'order_id': order.id})
        data = {
            'resolution_type': 'release_to_farmer',
            'resolution_notes': 'Attempting to resolve a non-disputed order.'
        }
        response = self.platform_lender_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Order is not in \'disputed\' status.', response.data['detail'])


    def test_resolve_dispute_unauthorized_denied(self):
        order = self._create_disputed_order()
        url = reverse('resolve_dispute', kwargs={'order_id': order.id})
        data = {
            'resolution_type': 'release_to_farmer',
            'resolution_notes': 'Unauthorized attempt.'
        }
        # Try with buyer client (not platform_lender/admin)
        response = self.buyer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('You do not have permission to perform this action.', response.data['detail'])


    def test_resolve_dispute_invalid_resolution_type(self):
        order = self._create_disputed_order()
        url = reverse('resolve_dispute', kwargs={'order_id': order.id})
        data = {
            'resolution_type': 'invalid_type', # Invalid choice
            'resolution_notes': 'Invalid type test.'
        }
        response = self.platform_lender_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('"invalid_type" is not a valid choice.', str(response.data))


    def test_resolve_dispute_split_missing_amount_to_farmer(self):
        order = self._create_disputed_order()
        url = reverse('resolve_dispute', kwargs={'order_id': order.id})
        data = {
            'resolution_type': 'split_funds',
            'resolution_notes': 'Missing amount.'
            # amount_to_farmer is missing
        }
        response = self.platform_lender_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Amount to farmer is required for \'split_funds\' resolution.', str(response.data))


    def test_resolve_dispute_split_amount_to_farmer_exceeds_total(self):
        order = self._create_disputed_order()
        url = reverse('resolve_dispute', kwargs={'order_id': order.id})
        data = {
            'resolution_type': 'split_funds',
            'amount_to_farmer': str(order.total_amount + Decimal('10.00')), # Exceeds total
            'resolution_notes': 'Amount too high.'
        }
        response = self.platform_lender_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(
            f"Amount to farmer cannot be more than the order's total amount ({order.total_amount}).",
            str(response.data)
        )

    def test_resolve_dispute_split_amount_to_farmer_negative(self):
        order = self._create_disputed_order()
        url = reverse('resolve_dispute', kwargs={'order_id': order.id})
        data = {
            'resolution_type': 'split_funds',
            'amount_to_farmer': '-10.00', # Negative amount
            'resolution_notes': 'Negative amount.'
        }
        response = self.platform_lender_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Ensure this value is greater than or equal to 0.00.', str(response.data))

    def test_resolve_dispute_non_existent_order(self):
        url = reverse('resolve_dispute', kwargs={'order_id': 99999}) # Non-existent ID
        data = {
            'resolution_type': 'release_to_farmer',
            'resolution_notes': 'Non-existent order test.'
        }
        response = self.platform_lender_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('No Order matches the given query.', str(response.data))
