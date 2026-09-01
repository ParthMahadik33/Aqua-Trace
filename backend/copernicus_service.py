import time
import logging
import threading
from typing import Optional, Dict
import requests
from config import COPERNICUS_CLIENT_ID, COPERNICUS_CLIENT_SECRET, COPERNICUS_TOKEN_URL

logger = logging.getLogger("CopernicusAuth")


class CopernicusAuthService:
    """
    Service managing OAuth2 Client Credentials authentication for the
    Copernicus Data Space Ecosystem (CDSE).
    
    Handles secure token retrieval, automatic expiration caching, thread safety,
    and downstream authorization headers without exposing secrets.
    """

    def __init__(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        token_url: Optional[str] = None,
    ):
        self.client_id = (client_id if client_id is not None else COPERNICUS_CLIENT_ID).strip()
        self.client_secret = (client_secret if client_secret is not None else COPERNICUS_CLIENT_SECRET).strip()
        self.token_url = (token_url if token_url is not None else COPERNICUS_TOKEN_URL).strip()
        
        self._access_token: Optional[str] = None
        self._expires_at: float = 0.0
        self._lock = threading.Lock()

    def is_configured(self) -> bool:
        """Check if both client ID and client secret are set."""
        return bool(self.client_id and self.client_secret)

    def has_valid_token(self) -> bool:
        """Check if an in-memory access token is present and not expired."""
        return bool(self._access_token and time.time() < self._expires_at)

    def get_access_token(self, force_refresh: bool = False) -> Optional[str]:
        """
        Retrieves a valid Copernicus OAuth2 access token.
        Uses in-memory cached token if valid; otherwise fetches a new token.
        
        Returns None if authentication fails or credentials are not configured.
        """
        if not self.is_configured():
            logger.warning("Copernicus authentication skipped: Missing COPERNICUS_CLIENT_ID or COPERNICUS_CLIENT_SECRET.")
            return None

        with self._lock:
            # Return cached token if valid and not forcing refresh
            if not force_refresh and self._access_token and time.time() < self._expires_at:
                return self._access_token

            payload = {
                "grant_type": "client_credentials",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
            }
            headers = {
                "Content-Type": "application/x-www-form-urlencoded",
            }

            try:
                logger.info("Requesting new Copernicus access token via Client Credentials flow...")
                response = requests.post(
                    self.token_url,
                    data=payload,
                    headers=headers,
                    timeout=15,
                )

                if response.status_code == 200:
                    data = response.json()
                    access_token = data.get("access_token")
                    expires_in = data.get("expires_in", 300)

                    if access_token:
                        self._access_token = access_token
                        # Set expiration buffer of 60 seconds to avoid edge-of-expiry requests
                        self._expires_at = time.time() + max(int(expires_in) - 60, 30)
                        logger.info("Successfully acquired Copernicus access token (expires in %s seconds).", expires_in)
                        return self._access_token
                    else:
                        logger.error("Copernicus token endpoint returned 200 but no 'access_token' in JSON response.")
                        return None
                else:
                    logger.error(
                        "Copernicus OAuth authentication failed. HTTP %s: %s",
                        response.status_code,
                        response.text[:300],
                    )
                    return None

            except requests.RequestException as e:
                logger.error("Network error during Copernicus token request: %s", e)
                return None
            except Exception as e:
                logger.error("Unexpected error during Copernicus token request: %s", e)
                return None

    def test_connection(self) -> bool:
        """
        Tests the OAuth connection by attempting to obtain an access token.
        Forces token refresh to ensure live credential validation.
        
        Returns True if successful, False otherwise.
        """
        token = self.get_access_token(force_refresh=True)
        return token is not None and len(token) > 0

    def get_auth_headers(self, force_refresh: bool = False) -> Optional[Dict[str, str]]:
        """
        Returns Authorization headers for downstream Copernicus API requests.
        """
        token = self.get_access_token(force_refresh=force_refresh)
        if not token:
            return None
        return {"Authorization": f"Bearer {token}"}

    def __repr__(self) -> str:
        masked_secret = "***" if self.client_secret else "<none>"
        return f"<CopernicusAuthService client_id={self.client_id!r} client_secret={masked_secret} token_valid={self.has_valid_token()}>"
