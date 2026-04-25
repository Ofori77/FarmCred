from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import RegisterSerializer
from .models import Account

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        # Add user information to the response
        data['user'] = {
            'id': self.user.id,
            'email': self.user.email,
            'role': self.user.role,
            'full_name': self.user.full_name,
        }
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

@api_view(['POST'])
@permission_classes([AllowAny]) # Ensure this view is publicly accessible for registration
def register_user(request):
    """
    POST /api/account/register/
    Allows new users to register for any role (farmer, investor, lender, buyer) via the web application.
    Handles creation of Account and associated Profile models (FarmerProfile, InvestorProfile, LenderProfile, BuyerProfile).
    """
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        try:
            account = serializer.save() # The serializer's create method now handles Account and Profile creation
            
            # Optionally, you might want to log in the user immediately after registration
            # and return tokens, similar to how ussd_web_api/views.py::web_register did.
            # For now, we'll stick to the original behavior of just returning basic info.
            # If the frontend needs tokens here, we can add that.
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            print(f"Error during registration: {e}")
            return Response({'detail': f'Registration failed due to an internal error: {e}'}, status=status.HTTP_400_BAD_REQUEST)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    """
    POST /api/account/logout/
    Blacklist the refresh token to log out the user properly.
    """
    try:
        refresh_token = request.data["refresh_token"]
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({'detail': 'Successfully logged out.'}, status=status.HTTP_205_RESET_CONTENT)
    except Exception as e:
        return Response({'detail': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)

# NEW: Custom view to remove the refresh token from the refresh response
class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        # Check if the 'refresh' key is in the response data and remove it
        if 'refresh' in response.data:
            del response.data['refresh']
        return response
