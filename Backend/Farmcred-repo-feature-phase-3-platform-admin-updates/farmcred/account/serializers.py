# In account/serializers.py

from rest_framework import serializers
from .models import Account
# Removed LenderProfile from import, as it will be deleted
from core.models import FarmerProfile, InvestorProfile, BuyerProfile # Import updated profiles (LenderProfile removed)

class RegisterSerializer(serializers.ModelSerializer):
    # Acceptable input fields
    password = serializers.CharField(write_only=True)

    # Profile fields accepted at registration (write-only)
    full_name = serializers.CharField(write_only=True)
    phone_number = serializers.CharField(write_only=True)
    country = serializers.CharField(write_only=True)
    region = serializers.CharField(write_only=True)
    dob = serializers.DateField(required=False, write_only=True)
    national_id = serializers.CharField(required=False, write_only=True)
    home_address = serializers.CharField(required=False, write_only=True)
    produce = serializers.ListField(child=serializers.CharField(), required=False, write_only=True)

    # Notification preferences (from Account model) - make write_only=True
    receive_level_notifications = serializers.BooleanField(required=False, write_only=True, default=True)
    receive_sms_notifications = serializers.BooleanField(required=False, write_only=True, default=True)
    receive_email_notifications = serializers.BooleanField(required=False, write_only=True, default=True)


    class Meta:
        model = Account
        fields = [
            'email', 'password', 'role',
            'full_name', 'phone_number', 'country', 'region',
            'dob', 'national_id', 'home_address', 'produce',
            'receive_level_notifications', 'receive_sms_notifications', 'receive_email_notifications'
        ]
       

    def validate_role(self, value):
        # Allow farmer, investor, buyer for self-registration.
        # 'admin' and 'platform_lender' are not for self-registration.
        valid_roles = ['farmer', 'investor', 'buyer']
        if value not in valid_roles:
            raise serializers.ValidationError(f"Invalid role. Must be one of: {', '.join(valid_roles)}.")
        return value

    def create(self, validated_data):
        profile_fields = [
            'full_name', 'phone_number', 'country', 'region',
            'dob', 'national_id', 'home_address', 'produce'
        ]
        profile_data = {field: validated_data.pop(field, None) for field in profile_fields}
        
        receive_level_notifications = validated_data.pop('receive_level_notifications', True)
        receive_sms_notifications = validated_data.pop('receive_sms_notifications', True)
        receive_email_notifications = validated_data.pop('receive_email_notifications', True)

        password = validated_data.pop('password')
        role = validated_data['role']

        account = Account.objects.create_user(
            password=password,
            receive_level_notifications=receive_level_notifications,
            receive_sms_notifications=receive_sms_notifications,
            receive_email_notifications=receive_email_notifications,
            **validated_data
        )

        if role == 'farmer':
            FarmerProfile.objects.create(
                account=account,
                full_name=profile_data.get('full_name'),
                phone_number=profile_data.get('phone_number'),
                country=profile_data.get('country', 'Ghana'),
                region=profile_data.get('region', None),
                dob=profile_data.get('dob', None),
                national_id=profile_data.get('national_id', None),
                home_address=profile_data.get('home_address', None),
                produce=profile_data.get('produce', []),
            )
        elif role == 'investor':
            InvestorProfile.objects.create(
                account=account,
                full_name=profile_data.get('full_name'),
                phone_number=profile_data.get('phone_number'),
                country=profile_data.get('country', 'Ghana'),
                region=profile_data.get('region', None),
            )
        # REMOVED: LenderProfile creation logic
        # elif role == 'lender':
        #     LenderProfile.objects.create(...)
        elif role == 'buyer':
            BuyerProfile.objects.create(
                account=account,
                full_name=profile_data.get('full_name'),
                phone_number=profile_data.get('phone_number'),
                country=profile_data.get('country', 'Ghana'),
                region=profile_data.get('region', None),
            )
        
        return account

    def to_representation(self, instance):
        return {
            "id": instance.id,
            "email": instance.email,
            "phone_number": instance.phone_number,
            "role": instance.role,
            "full_name": instance.full_name,
            "message": "Registration successful!"
        }

