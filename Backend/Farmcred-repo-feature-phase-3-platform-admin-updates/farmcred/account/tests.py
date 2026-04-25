from django.test import TestCase
from rest_framework.test import APIClient
from django.urls import reverse
from account.models import Account
from core.models import FarmerProfile, InvestorProfile, BuyerProfile # Import BuyerProfile
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.response import Response # NEW: Import Response

class RegisterTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('register')

    def test_farmer_registration_success(self):
        data = {
            "email": "farmer@example.com",
            "password": "password123",
            "role": "farmer",
            "full_name": "John Farmer",
            "phone_number": "233240000001",
            "country": "Ghana",
            "region": "Eastern",
            "dob": "1990-05-01",
            "national_id": "GHA-1234567891",
            "home_address": "Eastern Region",
            "produce": ["cassava", "mango"]
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Account.objects.filter(email="farmer@example.com").exists())
        self.assertTrue(FarmerProfile.objects.filter(account__email="farmer@example.com").exists())
        self.assertEqual(response.data['email'], 'farmer@example.com')
        self.assertEqual(response.data['role'], 'farmer')

    def test_investor_registration_success(self):
        data = {
            "email": "investor@example.com",
            "password": "password123",
            "role": "investor",
            "full_name": "Jane Investor",
            "phone_number": "233240000002",
            "country": "Ghana",
            "region": "Greater Accra"
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Account.objects.filter(email="investor@example.com").exists())
        self.assertTrue(InvestorProfile.objects.filter(account__email="investor@example.com").exists())
        self.assertEqual(response.data['email'], 'investor@example.com')
        self.assertEqual(response.data['role'], 'investor')

    def test_buyer_registration_success(self):
        data = {
            "email": "buyer@example.com",
            "password": "password123",
            "role": "buyer",
            "full_name": "Market Buyer Co.",
            "phone_number": "233240000005",
            "country": "Ghana",
            "region": "Central"
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Account.objects.filter(email="buyer@example.com").exists())
        self.assertTrue(BuyerProfile.objects.filter(account__email="buyer@example.com").exists())
        self.assertEqual(response.data['email'], 'buyer@example.com')
        self.assertEqual(response.data['role'], 'buyer')

    def test_registration_missing_fields(self):
        data = {
            "email": "missing@example.com",
            "password": "password123",
            "role": "farmer",
            # Missing full_name, phone_number, etc.
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('full_name', response.data)
        self.assertIn('phone_number', response.data)

    def test_registration_invalid_role(self):
        data = {
            "email": "invalid@example.com",
            "password": "password123",
            "role": "admin",
            "full_name": "Admin User",
            "phone_number": "233240000003",
            "country": "Ghana",
            "region": "Ashanti"
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('role', response.data)
        self.assertIn("Invalid role. Must be one of: farmer, investor, buyer.", str(response.data['role']))

class AuthTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.login_url = reverse('login')
        self.refresh_url = reverse('token_refresh')

        self.user_email = "testuser@example.com"
        self.user_password = "testpassword123"
        self.user = Account.objects.create_user(
            email=self.user_email,
            password=self.user_password,
            role="farmer",
            full_name="Test User",
            phone_number="233240000000"
        )

    def test_login_success(self):
        data = {
            'email': self.user_email,
            'password': self.user_password
        }
        response = self.client.post(self.login_url, data, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_invalid_credentials(self):
        data = {
            'email': self.user_email,
            'password': 'wrongpassword'
        }
        response = self.client.post(self.login_url, data, format='json')
        self.assertEqual(response.status_code, 401)
        self.assertIn('detail', response.data)

    def test_token_refresh_success(self):
        login_data = {
            'email': self.user_email,
            'password': self.user_password
        }
        login_response = self.client.post(self.login_url, login_data, format='json')
        refresh_token = login_response.data['refresh']

        refresh_data = {'refresh': refresh_token}
        refresh_response = self.client.post(self.refresh_url, refresh_data, format='json')
        self.assertEqual(refresh_response.status_code, 200)
        self.assertIn('access', refresh_response.data)
        self.assertNotIn('refresh', refresh_response.data)

    def test_token_refresh_invalid_token(self):
        refresh_data = {'refresh': 'invalid_refresh_token'}
        refresh_response = self.client.post(self.refresh_url, refresh_data, format='json')
        # FIX: Changed 'response' to 'refresh_response'
        self.assertEqual(refresh_response.status_code, 401)
        self.assertIn('detail', refresh_response.data)

    def test_login_inactive_account(self):
        self.user.is_active = False
        self.user.save()

        data = {
            'email': self.user_email,
            'password': self.user_password
        }
        response = self.client.post(self.login_url, data, format='json')
        self.assertEqual(response.status_code, 401)
        self.assertIn('detail', response.data)
        self.assertEqual(response.data['detail'], 'No active account found with the given credentials')

