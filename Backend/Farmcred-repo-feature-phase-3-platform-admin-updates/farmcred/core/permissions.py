# core/permissions.py
from rest_framework import permissions

class IsFarmer(permissions.BasePermission):
    """
    Custom permission to only allow farmers to access their own data.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'farmer'

    def has_object_permission(self, request, view, obj):
        # For profile views, obj is the profile itself
        if hasattr(obj, 'account'):
            return obj.account == request.user
        # For other objects, like loans or transactions, obj might be the related account directly
        return obj == request.user


class IsInvestor(permissions.BasePermission):
    """
    Custom permission to only allow investors to access investor-specific data.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'investor'

    def has_object_permission(self, request, view, obj):
        # For profile views, obj is the profile itself
        if hasattr(obj, 'account'):
            return obj.account == request.user
        # For other objects, like loans or reviews, obj might be the related account directly
        return obj == request.user


class IsBuyer(permissions.BasePermission):
    """
    Custom permission to only allow buyers to access buyer-specific data.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'buyer'

    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'account'):
            return obj.account == request.user
        return obj == request.user


class IsPlatformLenderOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow 'platform_lender' or 'admin' roles.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.role == 'platform_lender' or
            request.user.role == 'admin'
        )

