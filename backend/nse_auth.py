import base64
import os
import random
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad
import httpx

class NSEAPIAuthEngine:
    """
    Handles authentication to the NSE Mutual Fund System (V1.9.6)
    Uses AES 128 encryption algorithm: base64(iv::salt::aes_encrypted_value)
    """

    def __init__(self):
        self.member_id = os.environ.get("NSE_MEMBER_ID")
        self.user_id = os.environ.get("NSE_USER_ID")
        self.api_secret = os.environ.get("NSE_API_SECRET_KEY")
        self.license_key = os.environ.get("NSE_MEMBER_API_KEY") 
        self.base_url = os.environ.get("NSE_BASE_URL", "https://nseinvestuat.nseindia.com") # Defaults to UAT

    def _encrypt_password(self) -> str:
        """
        Encrypts the password based on NSE spec:
        Plain Text = API_SECRET | RANDOM_NUMBER
        Encryption = AES 128 using API Member License Key
        Format = base64(iv::salt::aes_encrypted_value)
        """
        if not self.api_secret or not self.license_key:
            raise ValueError("API Secret and License Key must be set in Environment Variables")

        random_number = str(random.randint(10000000000, 99999999999))
        plain_text = f"{self.api_secret}|{random_number}"

        # Setup standard lengths for AES-128
        key = self.license_key[:16].encode('utf-8')
        if len(key) < 16:
            key = key.ljust(16, b'\0')

        iv = os.urandom(16)
        salt = os.urandom(16) # Specific to NSE requirements for the formatting string

        cipher = AES.new(key, AES.MODE_CBC, iv)
        padded_text = pad(plain_text.encode('utf-8'), AES.block_size)
        encrypted_text = cipher.encrypt(padded_text)

        # Format: iv::salt::aes_encrypted_value
        formatted_payload = iv + b"::" + salt + b"::" + encrypted_text
        return base64.b64encode(formatted_payload).decode('utf-8')

    def get_auth_headers(self) -> dict:
        if not self.user_id or not self.member_id:
            raise ValueError("User ID and Member ID must be set in Environment Variables")

        encrypted_password = self._encrypt_password()
        auth_string = f"{self.user_id}:{encrypted_password}"
        base64_auth = base64.b64encode(auth_string.encode('utf-8')).decode('utf-8')

        return {
            "Content-Type": "application/json",
            "memberId": self.member_id,
            "Authorization": f"Basic {base64_auth}",
            # Mandatory headers to bypass Akamai bot detection (TLS 1.3 usually handled by httpx)
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept": "*/*",
            "Connection": "keep-alive",
            "Referer": self.base_url
        }

    def get_client(self) -> httpx.AsyncClient:
        """Returns an HTTPX client configured for TLS 1.3"""
        limits = httpx.Limits(max_keepalive_connections=5, max_connections=10)
        # HTTPX uses system ssl context which naturally falls back to TLS1.3 on modern python
        return httpx.AsyncClient(
            base_url=self.base_url, 
            headers=self.get_auth_headers(),
            limits=limits,
            timeout=30.0
        )
