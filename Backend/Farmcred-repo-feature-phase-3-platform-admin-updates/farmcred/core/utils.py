# core/utils.py

from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def send_sms(phone_number, message):
    """
    Sends an SMS message to the given phone number.
    
    NOTE: In a real application, you would integrate with an SMS Gateway API here
    (e.g., Twilio, Africa's Talking, etc.).
    For now, it will just print to the console.
    """
    if not phone_number:
        logger.warning(f"Attempted to send SMS without a phone number. Message: {message}")
        return False

    try:
        # Placeholder for actual SMS API integration
        # Example:
        # from twilio.rest import Client
        # client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        # message = client.messages.create(
        #     to=phone_number,
        #     from_=settings.TWILIO_PHONE_NUMBER,
        #     body=message
        # )
        # logger.info(f"SMS sent to {phone_number}: {message.sid}")
        
        print(f"[SMS Notification] To: {phone_number}, Message: {message}")
        logger.info(f"SMS simulated to {phone_number}: {message}")
        return True
    except Exception as e:
        logger.error(f"Failed to send SMS to {phone_number}: {e}")
        return False

def send_email(recipient_email, subject, message):
    """
    Sends an email to the given recipient.
    
    NOTE: Ensure your Django settings.py is configured for email sending.
    (e.g., EMAIL_BACKEND, EMAIL_HOST, EMAIL_PORT, EMAIL_USE_TLS, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD)
    """
    if not recipient_email:
        logger.warning(f"Attempted to send email without a recipient email. Subject: {subject}")
        return False

    try:
        # Django's send_mail function uses the configured email backend
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL, # Sender email defined in settings.py
            [recipient_email],
            fail_silently=False, # Set to True in production to avoid crashing on email errors
        )
        print(f"[Email Notification] To: {recipient_email}, Subject: {subject}, Message: {message}")
        logger.info(f"Email sent to {recipient_email} with subject: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {recipient_email}: {e}")
        return False


from decimal import Decimal
from payments.models import PaymentTransaction
from .models import Loan

def calculate_loan_roi(loan: Loan) -> Decimal:
    """
    Calculates the Return on Investment (ROI) for a given Loan.
    """
    initial_loan_amount = loan.amount
    
    if not initial_loan_amount:
        return Decimal('0.00')

    repayment_amount = sum(
        transaction.amount
        for transaction in PaymentTransaction.objects.filter(
            transaction_type='loan_repayment', order=None, status='successful', payer=loan.farmer, recipient=loan.lender
        )
    )

    # Calculate ROI and format to two decimal places
    if initial_loan_amount == Decimal('0.00'):
        return Decimal('0.00')
    
    roi = ((repayment_amount - initial_loan_amount) / initial_loan_amount) * 100
    return roi.quantize(Decimal('0.01'))