import time
import unittest
from unittest.mock import patch, MagicMock
import requests

from app import app
from copernicus_service import CopernicusAuthService


class TestCopernicusAuth(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_configuration_detection(self):
        """Test configuration checks with valid and missing credentials."""
        service_configured = CopernicusAuthService(client_id="test_id", client_secret="test_secret")
        self.assertTrue(service_configured.is_configured())

        service_missing_id = CopernicusAuthService(client_id="", client_secret="test_secret")
        self.assertFalse(service_missing_id.is_configured())

        service_missing_secret = CopernicusAuthService(client_id="test_id", client_secret="")
        self.assertFalse(service_missing_secret.is_configured())

    def test_security_repr_masking(self):
        """Ensure secret credentials are masked in string representations."""
        service = CopernicusAuthService(client_id="my_client_id", client_secret="super_secret_key_123")
        repr_str = repr(service)
        self.assertNotIn("super_secret_key_123", repr_str)
        self.assertIn("***", repr_str)

    @patch("copernicus_service.requests.post")
    def test_successful_token_retrieval(self, mock_post):
        """Test successful token retrieval and caching."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "access_token": "mock_jwt_token_xyz_12345",
            "expires_in": 3600,
            "token_type": "Bearer"
        }
        mock_post.return_value = mock_response

        service = CopernicusAuthService(client_id="test_id", client_secret="test_secret")
        token = service.get_access_token()

        self.assertEqual(token, "mock_jwt_token_xyz_12345")
        self.assertTrue(service.has_valid_token())
        self.assertTrue(service.test_connection())

        # Test auth headers
        headers = service.get_auth_headers()
        self.assertEqual(headers, {"Authorization": "Bearer mock_jwt_token_xyz_12345"})

        # Second call should use cache without invoking requests.post again
        mock_post.reset_mock()
        cached_token = service.get_access_token(force_refresh=False)
        self.assertEqual(cached_token, "mock_jwt_token_xyz_12345")
        mock_post.assert_not_called()

        # Force refresh should invoke requests.post
        refreshed_token = service.get_access_token(force_refresh=True)
        self.assertEqual(refreshed_token, "mock_jwt_token_xyz_12345")
        mock_post.assert_called_once()

    @patch("copernicus_service.requests.post")
    def test_authentication_http_failure(self, mock_post):
        """Test handling of 401 Unauthorized from token endpoint."""
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.text = '{"error": "invalid_client", "error_description": "Invalid client secret"}'
        mock_post.return_value = mock_response

        service = CopernicusAuthService(client_id="bad_id", client_secret="bad_secret")
        token = service.get_access_token()

        self.assertIsNone(token)
        self.assertFalse(service.has_valid_token())
        self.assertFalse(service.test_connection())
        self.assertIsNone(service.get_auth_headers())

    @patch("copernicus_service.requests.post")
    def test_authentication_network_failure(self, mock_post):
        """Test handling of network exceptions during token request."""
        mock_post.side_effect = requests.RequestException("Connection timeout")

        service = CopernicusAuthService(client_id="test_id", client_secret="test_secret")
        token = service.get_access_token()

        self.assertIsNone(token)
        self.assertFalse(service.test_connection())

    @patch("app.copernicus_service.test_connection")
    def test_api_endpoint_success(self, mock_test_connection):
        """Test /api/copernicus/test-auth endpoint when credentials are valid."""
        mock_test_connection.return_value = True

        response = self.app.get("/api/copernicus/test-auth")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()

        # Must return strictly {"success": True}
        self.assertEqual(data, {"success": True})
        self.assertNotIn("access_token", data)
        self.assertNotIn("token", data)
        self.assertNotIn("client_secret", data)

    @patch("app.copernicus_service.test_connection")
    def test_api_endpoint_failure(self, mock_test_connection):
        """Test /api/copernicus/test-auth endpoint when authentication fails."""
        mock_test_connection.return_value = False

        response = self.app.get("/api/copernicus/test-auth")
        self.assertEqual(response.status_code, 401)
        data = response.get_json()

        self.assertEqual(data.get("success"), False)
        self.assertNotIn("access_token", data)
        self.assertNotIn("token", data)
        self.assertNotIn("client_secret", data)


if __name__ == "__main__":
    unittest.main()
