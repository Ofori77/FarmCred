# account/models.py
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone # Import timezone for default date_joined

class AccountManager(BaseUserManager):
    def create_user(self, email, password=None, phone_number=None, **extra_fields):
        if not email and not phone_number:
            raise ValueError('The Email or Phone Number field must be set for a user')
        
        user = self.model(
            email=self.normalize_email(email) if email else None,
            phone_number=phone_number, # Store phone number
            **extra_fields
        )
        if password:
            user.set_password(password) # Hash password for web login
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, phone_number=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', 'admin') # Default to admin for superuser

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, phone_number, **extra_fields)


class Account(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('farmer', 'Farmer'),
        ('investor', 'Investor'),
        ('admin', 'Admin'),
        ('platform_lender', 'Platform Lender'), # NEW role for FarmCred itself
        ('buyer', 'Buyer'), # NEW role for buyers of produce
    ]
    email = models.EmailField(verbose_name='email address', max_length=255, unique=True, null=True, blank=True)
    phone_number = models.CharField(max_length=20, unique=True, null=True, blank=True) # Allow null/blank for soft deletion
    full_name = models.CharField(max_length=255, blank=True, null=True) # Added for easier display
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default='farmer')
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    
    # New field for USSD PIN
    pin = models.CharField(max_length=128, blank=True, null=True, help_text="4-digit PIN for USSD/mobile login")

    # Notification preferences (NEW)
    # These fields are directly on the Account model as they are user-specific preferences
    receive_level_notifications = models.BooleanField(default=True, help_text='Receive notifications when your trust level changes.')
    receive_sms_notifications = models.BooleanField(default=True, help_text='Receive notifications via SMS.')
    receive_email_notifications = models.BooleanField(default=True, help_text='Receive notifications via Email.')

    # date_joined field for tracking when an account was created.
    # This is useful for features like 'new farmers in last 30 days' in tests.
    date_joined = models.DateTimeField(default=timezone.now) 
    last_login = models.DateTimeField(auto_now=True)

    objects = AccountManager()

    USERNAME_FIELD = 'email' 
    REQUIRED_FIELDS = ['role']

    def __str__(self):
        return self.email if self.email else self.phone_number if self.phone_number else f"Account ID: {self.id}"

    def has_perm(self, perm, obj=None):
        return self.is_superuser

    def has_module_perms(self, app_label):
        return self.is_superuser

    def set_pin(self, raw_pin):
        self.pin = make_password(raw_pin)
        self.save() # Changed from self.save(update_fields=['pin'])
        print(f"DEBUG: PIN set for {self.phone_number}. Pin is: {self.pin}") # Add debug print


    def check_pin(self, raw_pin):
        return check_password(raw_pin, self.pin) if self.pin else False

    class Meta:
        verbose_name = 'Account'
        verbose_name_plural = 'Accounts'
        constraints = [
            models.CheckConstraint(
                check=models.Q(email__isnull=False) | models.Q(phone_number__isnull=False),
                name='email_or_phone_number_required',
                violation_error_message='Either email or phone number must be provided.'
            ),
        ]

