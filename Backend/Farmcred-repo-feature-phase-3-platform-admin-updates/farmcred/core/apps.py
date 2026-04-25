# core/apps.py
from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        """
        Import signals here so they are registered when the app starts.
        """
        import core.signals
        # This connects the signal. The @receiver decorator handles the actual connection,
        # but importing the module ensures the decorated function is discovered.
