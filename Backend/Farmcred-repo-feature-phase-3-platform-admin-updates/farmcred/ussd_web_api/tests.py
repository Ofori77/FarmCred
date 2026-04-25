# ussd_web_api/tests.py

from django.test import TestCase
from rest_framework.test import APIClient
from django.urls import reverse
from django.utils import timezone
import datetime
from datetime import timedelta
from decimal import Decimal
import json # For handling JSON responses
from rest_framework import status


# Import models from other apps
from account.models import Account
from core.models import FarmerProfile, InvestorProfile, Loan, Transaction, BuyerProfile
from ussd.models import PendingConfirmation


class UssdWebAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.ussd_web_login_url = reverse('ussd_web_login')
        self.get_user_roles_url = reverse('get_user_roles')

        # --- Create Test Users ---
        # Farmer
        self.farmer_phone = '233240000001'
        self.farmer_pin = '1234'
        self.farmer_user = Account.objects.create_user(
            email="farmer_web@example.com",
            password="password123",
            phone_number=self.farmer_phone,
            full_name="Web Farmer",
            role="farmer"
        )
        self.farmer_user.set_pin(self.farmer_pin) 
        self.farmer_profile = FarmerProfile.objects.create(
            account=self.farmer_user,
            full_name="Web Farmer",
            phone_number=self.farmer_phone,
            trust_level_stars=Decimal('4.0'), # Ensure high enough for loan qualification
            trust_score_percent=Decimal('75.00'),
            produce=['Maize@10.00', 'Beans@15.00']
        )

        # Get JWT token for farmer
        self.farmer_token = self._get_jwt_token(self.farmer_phone, self.farmer_pin)
        self.farmer_client = APIClient()
        self.farmer_client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.farmer_token['access'])

        # Investor
        self.investor_phone = '233240000002'
        self.investor_pin = '5678'
        self.investor_user = Account.objects.create_user(
            email="investor_web@example.com",
            password="password123",
            phone_number=self.investor_phone,
            full_name="Web Investor",
            role="investor"
        )
        self.investor_user.set_pin(self.investor_pin) 
        self.investor_profile = InvestorProfile.objects.create(
            account=self.investor_user,
            full_name="Web Investor",
            phone_number=self.investor_phone
        )
        # Get JWT token for investor
        self.investor_token = self._get_jwt_token(self.investor_phone, self.investor_pin)
        self.investor_client = APIClient()
        self.investor_client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.investor_token['access'])

        # Buyer
        self.buyer_phone = '233240000003'
        self.buyer_user = Account.objects.create_user(
            email="buyer_web@example.com",
            password="password123",
            phone_number=self.buyer_phone,
            full_name="Web Buyer",
            role="buyer"
        )
        self.buyer_user.set_pin('9012') # Assign a PIN for buyer
        self.buyer_profile = BuyerProfile.objects.create(
            account=self.buyer_user,
            full_name="Web Buyer",
            phone_number=self.buyer_phone
        )
        # Get JWT token for buyer
        self.buyer_token = self._get_jwt_token(self.buyer_phone, '9012')
        self.buyer_client = APIClient()
        self.buyer_client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.buyer_token['access'])

        # Platform Lender (FarmCred's internal account)
        self.platform_lender_user = Account.objects.create_user(
            email="platform@farmcred.com",
            password="platformpassword",
            phone_number="233501234567",
            full_name="FarmCred Platform",
            role="platform_lender"
        )
        self.platform_lender_user.set_pin('0000') # Example PIN for platform
        self.platform_lender_token = self._get_jwt_token(self.platform_lender_user.phone_number, '0000')
        self.platform_lender_client = APIClient()
        self.platform_lender_client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.platform_lender_token['access'])


    def _get_jwt_token(self, phone_number, pin):
        """Helper to get JWT token via ussd_web_login endpoint."""
        response = self.client.post(self.ussd_web_login_url, {'phone_number': phone_number, 'pin': pin}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data

    # --- Test General / Authentication Endpoints ---

    def test_ussd_web_login_success(self):
        response = self.client.post(self.ussd_web_login_url, {'phone_number': self.farmer_phone, 'pin': self.farmer_pin}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['role'], 'farmer')

    def test_ussd_web_login_invalid_pin(self):
        response = self.client.post(self.ussd_web_login_url, {'phone_number': self.farmer_phone, 'pin': '9999'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('Invalid PIN', response.data['non_field_errors'][0])

    def test_ussd_web_login_account_not_found(self):
        response = self.client.post(self.ussd_web_login_url, {'phone_number': '233999999999', 'pin': '1234'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('Account not found or is inactive', response.data['non_field_errors'][0])

    def test_get_user_roles(self):
        response = self.client.get(self.get_user_roles_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertIn('farmer', response.data)
        self.assertIn('investor', response.data)
        self.assertIn('buyer', response.data)
        self.assertIn('platform_lender', response.data)


    # --- Test Farmer Endpoints ---

    def test_farmer_products_list(self):
        url = reverse('farmer_products_list_add')
        response = self.farmer_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 2)
        # FIX: Assert against the dictionary structure returned by FarmerProductSerializer
        self.assertEqual(response.data[0]['name'], 'Maize')
        self.assertEqual(Decimal(str(response.data[0]['price'])), Decimal('10.00')) # Ensure price is Decimal for comparison
        self.assertEqual(response.data[1]['name'], 'Beans')
        self.assertEqual(Decimal(str(response.data[1]['price'])), Decimal('15.00'))

    def test_farmer_products_add(self):
        url = reverse('farmer_products_list_add')
        data = {'product_name': 'Tomatoes', 'product_price': '2.50'}
        response = self.farmer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('added successfully', response.data['message'])
        self.farmer_profile.refresh_from_db()
        self.assertIn('Tomatoes@2.50', self.farmer_profile.produce)

    def test_farmer_products_add_existing_product(self):
        url = reverse('farmer_products_list_add')
        data = {'product_name': 'Maize', 'product_price': '12.00'} # Maize already exists
        response = self.farmer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already exists', response.data['detail'])

    def test_farmer_update_product_price(self):
        url = reverse('farmer_update_product_price')
        data = {'product_name': 'Maize', 'product_price': '12.50'}
        response = self.farmer_client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('updated to 12.50', response.data['message'])
        self.farmer_profile.refresh_from_db()
        self.assertIn('Maize@12.50', self.farmer_profile.produce)
        self.assertNotIn('Maize@10.00', self.farmer_profile.produce)

    def test_farmer_update_product_price_not_found(self):
        url = reverse('farmer_update_product_price')
        data = {'product_name': 'Cassava', 'product_price': '5.00'}
        response = self.farmer_client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('not found in your list', response.data['detail'])

    def test_farmer_remove_product(self):
        url = reverse('farmer_remove_product')
        data = {'product_name': 'Beans'}
        response = self.farmer_client.delete(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('removed successfully', response.data['message'])
        self.farmer_profile.refresh_from_db()
        self.assertNotIn('Beans@15.00', self.farmer_profile.produce)
        self.assertIn('Maize@10.00', self.farmer_profile.produce)

    def test_farmer_remove_product_not_found(self):
        url = reverse('farmer_remove_product')
        data = {'product_name': 'Cassava'}
        response = self.farmer_client.delete(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('not found in your list', response.data['detail'])

    def test_farmer_request_loan_qualification_get(self):
        url = reverse('farmer_request_loan')
        response = self.farmer_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('qualify for a loan up to GHS', response.data['message'])
        self.assertGreater(response.data['max_qualified_amount'], 0)

    def test_farmer_request_loan_success_post(self):
        url = reverse('farmer_request_loan')
        data = {'amount': '100.00'}
        response = self.farmer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('loan request for GHS 100.00 has been approved', response.data['message'])
        self.assertTrue(Loan.objects.filter(farmer=self.farmer_user, amount=Decimal('100.00'), status='active').exists())
        self.assertTrue(Transaction.objects.filter(account_party=self.farmer_user, category='loan_disbursement', amount=Decimal('100.00')).exists())

    def test_farmer_request_loan_active_loan_denial(self):
        # Create an active loan first
        Loan.objects.create(
            farmer=self.farmer_user,
            lender=self.platform_lender_user,
            amount=Decimal('500.00'),
            date_taken=timezone.localdate(),
            due_date=timezone.localdate() + timedelta(days=90),
            status='active'
        )
        url = reverse('farmer_request_loan')
        data = {'amount': '100.00'}
        response = self.farmer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # This assertion should now check for the *new* message about needing higher trust for a second loan
        self.assertIn('You currently have one active loan. To request a second loan, you need a Trust Level of 4.5 Stars and a Trust Score of 90.00%', response.data['detail'])


    def test_farmer_request_loan_active_loan_allowed_with_high_trust(self):
        # Create one active loan
        Loan.objects.create(
            farmer=self.farmer_user,
            lender=self.platform_lender_user,
            amount=Decimal('500.00'),
            date_taken=timezone.localdate(),
            due_date=timezone.localdate() + timedelta(days=90),
            status='active'
        )
        # Elevate farmer's trust to qualify for a second loan
        self.farmer_profile.trust_level_stars = Decimal('4.5')
        self.farmer_profile.trust_score_percent = Decimal('90.00')
        self.farmer_profile.save()

        url = reverse('farmer_request_loan')
        data = {'amount': '100.00'} # Request a second loan
        response = self.farmer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('loan request for GHS 100.00 has been approved', response.data['message'])
        # Verify two active loans now exist for the farmer
        self.assertEqual(Loan.objects.filter(farmer=self.farmer_user, status='active').count(), 2)


    def test_farmer_request_loan_denied_with_two_active_loans(self):
        # Create two active loans
        Loan.objects.create(farmer=self.farmer_user, lender=self.platform_lender_user, amount=Decimal('500.00'), date_taken=timezone.localdate(), due_date=timezone.localdate() + timedelta(days=90), status='active')
        Loan.objects.create(farmer=self.farmer_user, lender=self.platform_lender_user, amount=Decimal('300.00'), date_taken=timezone.localdate(), due_date=timezone.localdate() + timedelta(days=60), status='active')
        
        # Elevate farmer's trust (shouldn't matter, as max 2 loans)
        self.farmer_profile.trust_level_stars = Decimal('5.0')
        self.farmer_profile.trust_score_percent = Decimal('95.00')
        self.farmer_profile.save()

        url = reverse('farmer_request_loan')
        data = {'amount': '100.00'} # Request a third loan
        response = self.farmer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('You currently have two or more active loans. Please settle existing loans before requesting a new one.', response.data['detail'])


    def test_farmer_request_loan_trust_criteria_denial(self):
        # Lower farmer's trust to below threshold for first loan
        self.farmer_profile.trust_level_stars = Decimal('2.0')
        self.farmer_profile.trust_score_percent = Decimal('50.00')
        self.farmer_profile.save()

        url = reverse('farmer_request_loan')
        data = {'amount': '100.00'}
        response = self.farmer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('do not meet the minimum trust criteria', response.data['detail'])

    def test_farmer_request_loan_exceeds_qualified_amount(self):
        # Farmer's max qualified amount is around 650 (4.0 stars, 75% score)
        url = reverse('farmer_request_loan')
        data = {'amount': '1000.00'} # Request more than qualified
        response = self.farmer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('exceeds your qualified limit', response.data['detail'])

    def test_farmer_initiate_loan_repayment_confirmation_platform_lender(self):
        loan = Loan.objects.create(
            farmer=self.farmer_user,
            lender=self.platform_lender_user,
            amount=Decimal('200.00'),
            date_taken=timezone.localdate() - timedelta(days=30),
            due_date=timezone.localdate() + timedelta(days=30),
            status='active'
        )
        url = reverse('farmer_initiate_loan_repayment_confirmation')
        data = {'loan_id': loan.id, 'amount_confirmed': '200.00'}
        response = self.farmer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('payment confirmed by FarmCred directly', response.data['message'])
        loan.refresh_from_db()
        self.assertEqual(loan.status, 'repaid')
        self.assertTrue(loan.on_time)
        self.assertTrue(Transaction.objects.filter(account_party=self.farmer_user, category='loan_repayment', status='expense', amount=Decimal('200.00')).exists())
        self.assertFalse(PendingConfirmation.objects.filter(initiator_account=self.farmer_user, target_account=self.platform_lender_user).exists())

    def test_farmer_initiate_loan_repayment_confirmation_investor_lender(self):
        loan = Loan.objects.create(
            farmer=self.farmer_user,
            lender=self.investor_user,
            amount=Decimal('300.00'),
            date_taken=timezone.localdate() - timedelta(days=60),
            due_date=timezone.localdate() - timedelta(days=30),
            status='active'
        )
        url = reverse('farmer_initiate_loan_repayment_confirmation')
        data = {'loan_id': loan.id, 'amount_confirmed': '300.00'}
        response = self.farmer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('Confirmation request sent to Lender', response.data['message'])
        self.assertIn('confirmation_id', response.data)
        self.assertTrue(PendingConfirmation.objects.filter(initiator_account=self.farmer_user, target_account=self.investor_user, request_type=PendingConfirmation.TYPE_LOAN_REPAYMENT_CONFIRM).exists())

    def test_farmer_toggle_discoverability(self):
        url = reverse('farmer_toggle_discoverability')
        # Initially discoverable
        self.assertTrue(self.farmer_profile.is_discoverable_by_investors)

        # Toggle to hidden
        response = self.farmer_client.post(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('Your profile is now hidden', response.data['message'])
        self.assertFalse(response.data['is_discoverable_by_investors'])
        self.farmer_profile.refresh_from_db()
        self.assertFalse(self.farmer_profile.is_discoverable_by_investors)

        # Toggle back to visible
        response = self.farmer_client.post(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('Your profile is now visible', response.data['message'])
        self.assertTrue(response.data['is_discoverable_by_investors'])
        self.farmer_profile.refresh_from_db()
        self.assertTrue(self.farmer_profile.is_discoverable_by_investors)

    def test_share_stats_logs(self):
        url = reverse('farmer_share_stats_logs')
        data = {'recipient_phone_number': '233241234567'}
        response = self.farmer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('Stats/Logs sent successfully via SMS!', response.data['message'])


    # --- Test Investor Endpoints ---

    def test_investor_browse_farmers(self):
        url = reverse('investor_browse_farmers')
        # Ensure farmer is discoverable (default is True)
        self.farmer_profile.is_discoverable_by_investors = True
        self.farmer_profile.save()

        response = self.investor_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreater(len(response.data), 0)
        # FIX: Assert against the 'id' field which should now be present in each dictionary
        farmer_ids = [f['id'] for f in response.data] 
        self.assertIn(self.farmer_user.id, farmer_ids)
        # Check some basic fields are present
        self.assertIn('full_name', response.data[0])
        self.assertIn('trust_level_stars', response.data[0])

    def test_investor_browse_farmers_not_discoverable(self):
        url = reverse('investor_browse_farmers')
        self.farmer_profile.is_discoverable_by_investors = False
        self.farmer_profile.save()

        response = self.investor_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        farmer_ids = [f['id'] for f in response.data]
        self.assertNotIn(self.farmer_user.id, farmer_ids)


    def test_investor_initiate_loan_offer(self):
        url = reverse('investor_initiate_loan_offer')
        data = {
            'farmer_id': self.farmer_user.id,
            'amount': '500.00',
            'interest_rate': '8.0',
            'repayment_period_months': 6
        }
        response = self.investor_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('Loan offer initiated for Farmer', response.data['message'])
        self.assertIn('confirmation_id', response.data)
        self.assertTrue(PendingConfirmation.objects.filter(initiator_account=self.investor_user, target_account=self.farmer_user, request_type=PendingConfirmation.TYPE_LOAN_OFFER).exists())

    def test_investor_initiate_trust_view(self):
        url = reverse('investor_initiate_trust_view')
        data = {'farmer_id': self.farmer_user.id}
        response = self.investor_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('Trust view request sent to Farmer', response.data['message'])
        self.assertIn('confirmation_id', response.data)
        self.assertTrue(PendingConfirmation.objects.filter(initiator_account=self.investor_user, target_account=self.farmer_user, request_type=PendingConfirmation.TYPE_TRUST_VIEW_REQUEST).exists())

    def test_investor_initiate_repayment_confirmation(self):
        loan = Loan.objects.create(
            farmer=self.farmer_user,
            lender=self.investor_user,
            amount=Decimal('400.00'),
            date_taken=timezone.localdate() - timedelta(days=90),
            due_date=timezone.localdate() - timedelta(days=30),
            status='active'
        )
        url = reverse('investor_initiate_repayment_confirmation')
        data = {'loan_id': loan.id, 'amount_confirmed': '400.00'}
        response = self.investor_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('Confirmation request sent to Farmer for Loan', response.data['message'])
        self.assertIn('confirmation_id', response.data)
        self.assertTrue(PendingConfirmation.objects.filter(initiator_account=self.investor_user, target_account=self.farmer_user, request_type=PendingConfirmation.TYPE_LOAN_REPAYMENT_CONFIRM).exists())


    # --- Test Buyer Endpoints ---

    def test_initiate_produce_purchase(self):
        url = reverse('initiate_produce_purchase')
        data = {
            'farmer_id': self.farmer_user.id,
            'product_name': 'Maize',
            'quantity': '50.00' # Use Decimal quantity
        }
        response = self.buyer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('Purchase request sent to Farmer', response.data['message'])
        self.assertIn('confirmation_id', response.data)
        self.assertTrue(PendingConfirmation.objects.filter(initiator_account=self.buyer_user, target_account=self.farmer_user, request_type=PendingConfirmation.TYPE_PRODUCE_PURCHASE_CONFIRM).exists())

    def test_initiate_produce_purchase_product_not_found(self):
        url = reverse('initiate_produce_purchase')
        data = {
            'farmer_id': self.farmer_user.id,
            'product_name': 'Rice', # Farmer doesn't sell Rice
            'quantity': '10'
        }
        response = self.buyer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # FIX: Assert against the correct nested error structure from the serializer
        # The error is now expected to be under 'product_name' key within the response data
        self.assertIn('Product not found in farmer\'s listed produce', response.data['product_name'][0])


    # --- Test Pending Confirmation Endpoints ---

    def test_list_pending_confirmations(self):
        # Create a pending loan offer for the farmer
        PendingConfirmation.objects.create(
            confirmation_id='111111',
            initiator_account=self.investor_user,
            target_account=self.farmer_user,
            request_type=PendingConfirmation.TYPE_LOAN_OFFER,
            expires_at=timezone.now() + timedelta(minutes=5),
            data_context={'amount': 1000.0, 'investor_name': 'Test Investor'}
        )
        # Create a pending trust view request for the farmer
        PendingConfirmation.objects.create(
            confirmation_id='222222',
            initiator_account=self.investor_user,
            target_account=self.farmer_user,
            request_type=PendingConfirmation.TYPE_TRUST_VIEW_REQUEST,
            expires_at=timezone.now() + timedelta(minutes=5),
            data_context={'investor_name': 'Test Investor'}
        )

        url = reverse('list_pending_confirmations')
        response = self.farmer_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 2)
        # FIX: Ensure target_full_name is correctly asserted
        self.assertEqual(response.data[0]['target_full_name'], 'Web Farmer')
        self.assertIn('111111', [c['confirmation_id'] for c in response.data])
        self.assertIn('222222', [c['confirmation_id'] for c in response.data])

    def test_confirm_request_action_accept_loan_offer(self):
        pending_conf = PendingConfirmation.objects.create(
            confirmation_id='123456',
            initiator_account=self.investor_user,
            target_account=self.farmer_user,
            request_type=PendingConfirmation.TYPE_LOAN_OFFER,
            expires_at=timezone.now() + timedelta(minutes=5),
            data_context={
                'lender_id': self.investor_user.id,
                'amount': 500.0,
                'interest_rate': 7.5,
                'repayment_period_months': 3
            }
        )
        url = reverse('confirm_request_action', kwargs={'pk': pending_conf.pk})
        data = {'action': 'accept'}
        response = self.farmer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('Loan offer accepted and Loan', response.data['message'])
        
        pending_conf.refresh_from_db()
        self.assertEqual(pending_conf.status, PendingConfirmation.STATUS_CONFIRMED)
        self.assertTrue(Loan.objects.filter(farmer=self.farmer_user, lender=self.investor_user, amount=Decimal('500.00')).exists())
        self.assertTrue(Transaction.objects.filter(account_party=self.farmer_user, category='loan_disbursement', amount=Decimal('500.00')).exists())
        self.assertTrue(Transaction.objects.filter(account_party=self.investor_user, category='loan_disbursement', amount=Decimal('500.00')).exists())


    def test_confirm_request_action_deny_trust_view(self):
        pending_conf = PendingConfirmation.objects.create(
            confirmation_id='789012',
            initiator_account=self.investor_user,
            target_account=self.farmer_user,
            request_type=PendingConfirmation.TYPE_TRUST_VIEW_REQUEST,
            expires_at=timezone.now() + timedelta(minutes=5),
            data_context={'investor_name': 'Test Investor'}
        )
        url = reverse('confirm_request_action', kwargs={'pk': pending_conf.pk})
        data = {'action': 'deny'}
        response = self.farmer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('Confirmation request denied', response.data['message'])
        pending_conf.refresh_from_db()
        self.assertEqual(pending_conf.status, PendingConfirmation.STATUS_DENIED)

    def test_confirm_request_action_accept_produce_purchase(self):
        pending_conf = PendingConfirmation.objects.create(
            confirmation_id='345678',
            initiator_account=self.buyer_user,
            target_account=self.farmer_user,
            request_type=PendingConfirmation.TYPE_PRODUCE_PURCHASE_CONFIRM,
            expires_at=timezone.now() + timedelta(minutes=5),
            data_context={
                'buyer_id': self.buyer_user.id,
                'product_name': 'Maize',
                'quantity': 20.0,
                'total_amount': 200.0 # 20 * 10.00 (Maize price)
            }
        )
        url = reverse('confirm_request_action', kwargs={'pk': pending_conf.pk})
        data = {'action': 'accept'}
        response = self.farmer_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('Produce purchase request accepted and transaction recorded', response.data['message'])
        
        pending_conf.refresh_from_db()
        self.assertEqual(pending_conf.status, PendingConfirmation.STATUS_CONFIRMED)
        # FIX: Assert that the transaction exists for the buyer with the correct details.
        # The 'farmer' field is not directly on the Transaction model for buyer's side.
        # We can check the name for context.
        self.assertTrue(Transaction.objects.filter(
            account_party=self.farmer_user, # Farmer's income transaction
            category='produce_sale',
            amount=Decimal('200.00'),
            buyer=self.buyer_user # Ensure buyer is linked
        ).exists())
        self.assertTrue(Transaction.objects.filter(
            account_party=self.buyer_user, # Buyer's expense transaction
            category='produce_purchase',
            amount=Decimal('200.00'),
            name__icontains=f"from {self.farmer_user.full_name}" # Check name contains farmer's name
        ).exists())


    def test_confirm_request_action_accept_loan_repayment_investor_lender(self):
        loan = Loan.objects.create(
            farmer=self.farmer_user,
            lender=self.investor_user,
            amount=Decimal('150.00'),
            date_taken=timezone.localdate() - timedelta(days=60),
            due_date=timezone.localdate() - timedelta(days=30), # Overdue
            status='active'
        )
        pending_conf = PendingConfirmation.objects.create(
            confirmation_id='987654',
            initiator_account=self.farmer_user,
            target_account=self.investor_user,
            request_type=PendingConfirmation.TYPE_LOAN_REPAYMENT_CONFIRM,
            expires_at=timezone.now() + timedelta(minutes=5),
            data_context={
                'loan_id': loan.id,
                'amount_received': 150.0,
                'farmer_id': self.farmer_user.id
            }
        )
        url = reverse('confirm_request_action', kwargs={'pk': pending_conf.pk})
        data = {'action': 'accept'}
        response = self.investor_client.post(url, data, format='json') # Investor confirms
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('repayment confirmed and loan updated', response.data['message'])

        loan.refresh_from_db()
        self.assertEqual(loan.status, 'repaid')
        self.assertFalse(loan.on_time) # Should be False as loan was overdue
        self.assertTrue(Transaction.objects.filter(account_party=self.farmer_user, category='loan_repayment', status='expense', amount=Decimal('150.00')).exists())
        self.assertTrue(Transaction.objects.filter(account_party=self.investor_user, category='loan_repayment', status='income', amount=Decimal('150.00')).exists())


    def test_get_confirmation_status(self):
        pending_conf = PendingConfirmation.objects.create(
            confirmation_id='555555',
            initiator_account=self.investor_user,
            target_account=self.farmer_user,
            request_type=PendingConfirmation.TYPE_TRUST_VIEW_REQUEST,
            expires_at=timezone.now() + timedelta(minutes=5),
            status=PendingConfirmation.STATUS_PENDING,
            data_context={'investor_name': 'Test Investor'}
        )
        url = reverse('get_confirmation_status', kwargs={'pk': pending_conf.pk})
        response = self.farmer_client.get(url) # Farmer checks status of request targeting them
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['confirmation_id'], '555555')
        self.assertEqual(response.data['status'], PendingConfirmation.STATUS_PENDING)

        # Check by initiator
        response = self.investor_client.get(url) # Investor checks status of request they initiated
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['confirmation_id'], '555555')
        self.assertEqual(response.data['status'], PendingConfirmation.STATUS_PENDING)

        # Confirm it and check again
        action_url = reverse('confirm_request_action', kwargs={'pk': pending_conf.pk})
        self.farmer_client.post(action_url, {'action': 'accept'}, format='json')
        response = self.farmer_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], PendingConfirmation.STATUS_CONFIRMED)

    def test_get_confirmation_status_unauthorized(self):
        # Create a pending confirmation between farmer and investor
        pending_conf = PendingConfirmation.objects.create(
            confirmation_id='666666',
            initiator_account=self.investor_user,
            target_account=self.farmer_user,
            request_type=PendingConfirmation.TYPE_LOAN_OFFER,
            expires_at=timezone.now() + timedelta(minutes=5),
            status=PendingConfirmation.STATUS_PENDING,
            data_context={'amount': 100.0}
        )
        url = reverse('get_confirmation_status', kwargs={'pk': pending_conf.pk})
        # Try to check status with buyer client (unauthorized)
        response = self.buyer_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('not authorized', response.data['detail'])

